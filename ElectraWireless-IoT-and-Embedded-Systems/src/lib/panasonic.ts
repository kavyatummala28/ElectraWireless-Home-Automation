import { CapacitorHttp } from "@capacitor/core";
import { getLocalSubnet } from "./network";

/**
 * Panasonic VIERA driver
 * ----------------------
 * Works with both kinds of Panasonic TVs automatically — no model number needed:
 *  - Older TVs: plain SOAP commands on port 55000, no pairing.
 *  - Newer TVs: "encrypted" remote. The TV shows a 4-digit PIN once, the app
 *    exchanges keys, then every command is AES-encrypted.
 * The app detects which kind it is by reading /nrc/sdd_0.xml from the TV.
 *
 * Encryption flow follows the community-documented protocol used by the
 * open-source panasonic_viera library (Home Assistant).
 */

export const PANASONIC_KEYS = {
  POWER: "NRC_POWER-ONOFF",
  VOL_UP: "NRC_VOLUP-ONOFF",
  VOL_DOWN: "NRC_VOLDOWN-ONOFF",
  CH_UP: "NRC_CH_UP-ONOFF",
  CH_DOWN: "NRC_CH_DOWN-ONOFF",
  UP: "NRC_UP-ONOFF",
  DOWN: "NRC_DOWN-ONOFF",
  LEFT: "NRC_LEFT-ONOFF",
  RIGHT: "NRC_RIGHT-ONOFF",
  OK: "NRC_ENTER-ONOFF",
  RETURN: "NRC_RETURN-ONOFF",
  MUTE: "NRC_MUTE-ONOFF",
  SOURCE: "NRC_CHG_INPUT-ONOFF",
  APPS: "NRC_APPS-ONOFF",
  HOME: "NRC_HOME-ONOFF",
  RED: "NRC_RED-ONOFF",
  GREEN: "NRC_GREEN-ONOFF",
  YELLOW: "NRC_YELLOW-ONOFF",
  BLUE: "NRC_BLUE-ONOFF",
  NUM_0: "NRC_D0-ONOFF",
  NUM_1: "NRC_D1-ONOFF",
  NUM_2: "NRC_D2-ONOFF",
  NUM_3: "NRC_D3-ONOFF",
  NUM_4: "NRC_D4-ONOFF",
  NUM_5: "NRC_D5-ONOFF",
  NUM_6: "NRC_D6-ONOFF",
  NUM_7: "NRC_D7-ONOFF",
  NUM_8: "NRC_D8-ONOFF",
  NUM_9: "NRC_D9-ONOFF",
};

const PORT = 55000;
const NRC_PATH = "/nrc/control_0";
const NRC_URN = "panasonic-com:service:p00NetworkControl:1";
const APP_NAME = "ELLY Home";

// ---------------------------------------------------------------------------
// SOAP helpers
// ---------------------------------------------------------------------------

function soapEnvelope(action: string, params: string, urn = NRC_URN): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
 <s:Body>
  <u:${action} xmlns:u="urn:${urn}">
   ${params}
  </u:${action}>
 </s:Body>
</s:Envelope>`;
}

async function soapRequest(ip: string, action: string, params: string) {
  const res = await CapacitorHttp.post({
    url: `http://${ip}:${PORT}${NRC_PATH}`,
    headers: {
      "Content-Type": 'text/xml; charset="utf-8"',
      SOAPACTION: `"urn:${NRC_URN}#${action}"`,
    },
    data: soapEnvelope(action, params),
    responseType: "text",
    connectTimeout: 4000,
    readTimeout: 4000,
  });
  return { status: res.status, body: String(res.data ?? "") };
}

function tag(xml: string, name: string): string | null {
  const m = new RegExp(`<(?:\\w+:)?${name}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`).exec(xml);
  return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Crypto helpers (WebCrypto; AES-CBC without PKCS#7 padding, HMAC-SHA256)
// ---------------------------------------------------------------------------

const enc = new TextEncoder();
const dec = new TextDecoder("latin1");

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

async function aesKey(raw: Uint8Array) {
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-CBC", false, ["encrypt", "decrypt"]);
}

// data.length must be a multiple of 16. WebCrypto always adds a PKCS#7 block; drop it.
async function aesEncryptRaw(keyRaw: Uint8Array, iv: Uint8Array, data: Uint8Array) {
  const key = await aesKey(keyRaw);
  const out = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv: iv as BufferSource }, key, data as BufferSource));
  return out.slice(0, data.length);
}

// Decrypt zero-padded data: append a block that decrypts to a valid PKCS#7 pad.
async function aesDecryptRaw(keyRaw: Uint8Array, iv: Uint8Array, data: Uint8Array) {
  const len = data.length - (data.length % 16);
  const body = data.slice(0, len);
  const key = await aesKey(keyRaw);
  const last = body.slice(len - 16, len);
  const padBlock = new Uint8Array(16).fill(16);
  const extra = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-CBC", iv: last as BufferSource }, key, padBlock),
  ).slice(0, 16);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-CBC", iv: iv as BufferSource }, key, concat(body, extra) as BufferSource),
  );
}

async function hmacSha256(keyRaw: Uint8Array, data: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", keyRaw as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data as BufferSource));
}

async function encryptPayload(text: string, key: Uint8Array, hmacKey: Uint8Array, iv: Uint8Array) {
  const data = enc.encode(text);
  const header = new Uint8Array(16);
  crypto.getRandomValues(header.subarray(0, 12));
  new DataView(header.buffer).setUint32(12, data.length, false);
  let payload = concat(header, data);
  payload = concat(payload, new Uint8Array(16 - (payload.length % 16))); // zero padding
  const cipher = await aesEncryptRaw(key, iv, payload);
  const sig = await hmacSha256(hmacKey, cipher);
  return bytesToB64(concat(cipher, sig));
}

async function decryptPayload(b64: string, key: Uint8Array, iv: Uint8Array) {
  const plain = await aesDecryptRaw(key, iv, b64ToBytes(b64));
  const text = dec.decode(plain.slice(16));
  const nul = text.indexOf("\0");
  return nul >= 0 ? text.slice(0, nul) : text;
}

const HMAC_KEY_MASK = [
  0x15, 0xc9, 0x5a, 0xc2, 0xb0, 0x8a, 0xa7, 0xeb, 0x4e, 0x22, 0x8f, 0x81, 0x1e, 0x34, 0xd0, 0x4f,
  0xa5, 0x4b, 0xa7, 0xdc, 0xac, 0x98, 0x79, 0xfa, 0x8a, 0xcd, 0xa3, 0xfc, 0x24, 0x4f, 0x38, 0x54,
];

function pinKeys(iv: Uint8Array) {
  const key = new Uint8Array(16);
  for (let i = 0; i < 16; i += 4) {
    key[i] = ~iv[i + 3] & 0xff;
    key[i + 1] = ~iv[i + 2] & 0xff;
    key[i + 2] = ~iv[i + 1] & 0xff;
    key[i + 3] = ~iv[i] & 0xff;
  }
  const hmacKey = new Uint8Array(32);
  for (let i = 0; i < 32; i += 4) {
    hmacKey[i] = HMAC_KEY_MASK[i] ^ iv[(i + 2) & 0xf];
    hmacKey[i + 1] = HMAC_KEY_MASK[i + 1] ^ iv[(i + 3) & 0xf];
    hmacKey[i + 2] = HMAC_KEY_MASK[i + 2] ^ iv[i & 0xf];
    hmacKey[i + 3] = HMAC_KEY_MASK[i + 3] ^ iv[(i + 1) & 0xf];
  }
  return { key, hmacKey };
}

function sessionKeys(encKeyB64: string) {
  const iv = b64ToBytes(encKeyB64);
  const key = new Uint8Array(16);
  for (let i = 0; i < 16; i += 4) {
    key[i] = iv[i + 2];
    key[i + 1] = iv[i + 3];
    key[i + 2] = iv[i];
    key[i + 3] = iv[i + 1];
  }
  return { iv, key, hmacKey: concat(iv, iv) };
}

// ---------------------------------------------------------------------------
// Stored state
// ---------------------------------------------------------------------------

interface Auth { appId: string; encKey: string }
interface Session { id: string; seq: number; iv: Uint8Array; key: Uint8Array; hmacKey: Uint8Array }

const authKey = (ip: string) => `panasonic_auth_${ip}`;
const encFlagKey = (ip: string) => `panasonic_encrypted_${ip}`;

function loadAuth(ip: string): Auth | null {
  try { return JSON.parse(localStorage.getItem(authKey(ip)) || "null"); } catch { return null; }
}
function saveAuth(ip: string, auth: Auth) { localStorage.setItem(authKey(ip), JSON.stringify(auth)); }
function clearAuth(ip: string) { localStorage.removeItem(authKey(ip)); sessions.delete(ip); }

const sessions = new Map<string, Session>();
const challenges = new Map<string, Uint8Array>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PanasonicInfo {
  ip: string;
  name: string;
  model?: string;
  encrypted: boolean;
}

/** Reads the TV's description files: name, model, and whether it needs a PIN. */
export async function getPanasonicInfo(ip: string): Promise<PanasonicInfo | null> {
  try {
    const ddd = await CapacitorHttp.get({
      url: `http://${ip}:${PORT}/nrc/ddd.xml`, responseType: "text", connectTimeout: 3000, readTimeout: 3000,
    });
    if (ddd.status !== 200) return null;
    const dddXml = String(ddd.data ?? "");

    let encrypted = false;
    try {
      const sdd = await CapacitorHttp.get({
        url: `http://${ip}:${PORT}/nrc/sdd_0.xml`, responseType: "text", connectTimeout: 3000, readTimeout: 3000,
      });
      encrypted = String(sdd.data ?? "").includes("X_GetEncryptSessionId");
    } catch {}
    localStorage.setItem(encFlagKey(ip), encrypted ? "1" : "0");

    return {
      ip,
      name: tag(dddXml, "friendlyName") || "Panasonic TV",
      model: tag(dddXml, "modelNumber") || tag(dddXml, "modelName") || undefined,
      encrypted,
    };
  } catch {
    return null;
  }
}

async function isEncrypted(ip: string): Promise<boolean> {
  const flag = localStorage.getItem(encFlagKey(ip));
  if (flag !== null) return flag === "1";
  const info = await getPanasonicInfo(ip);
  return Boolean(info?.encrypted);
}

async function startSession(ip: string, auth: Auth): Promise<Session> {
  const { iv, key, hmacKey } = sessionKeys(auth.encKey);
  const encInfo = await encryptPayload(`<X_ApplicationId>${auth.appId}</X_ApplicationId>`, key, hmacKey, iv);
  const res = await soapRequest(ip, "X_GetEncryptSessionId",
    `<X_ApplicationId>${auth.appId}</X_ApplicationId><X_EncInfo>${encInfo}</X_EncInfo>`);
  const encResult = tag(res.body, "X_EncResult");
  if (res.status !== 200 || !encResult) throw new Error(`Session refused (HTTP ${res.status})`);
  const decrypted = await decryptPayload(encResult, key, iv);
  const id = tag(decrypted, "X_SessionId");
  if (!id) throw new Error("No session id from TV");
  const session = { id, seq: 1, iv, key, hmacKey };
  sessions.set(ip, session);
  return session;
}

export type PanasonicConnectResult = "connected" | "pin_required" | "unreachable";

/**
 * Try to connect. Returns "pin_required" for newer TVs that haven't been paired yet —
 * then call requestPanasonicPin() and submitPanasonicPin().
 */
export async function connectPanasonic(ip: string): Promise<PanasonicConnectResult> {
  const info = await getPanasonicInfo(ip);
  if (!info) return "unreachable";
  if (!info.encrypted) return "connected";

  const auth = loadAuth(ip);
  if (!auth) return "pin_required";
  try {
    await startSession(ip, auth);
    return "connected";
  } catch {
    clearAuth(ip); // TV forgot us (reset / removed device) -> pair again
    return "pin_required";
  }
}

/** Ask the TV to show a 4-digit PIN on screen. */
export async function requestPanasonicPin(ip: string): Promise<void> {
  const res = await soapRequest(ip, "X_DisplayPinCode", `<X_DeviceName>${APP_NAME}</X_DeviceName>`);
  const challenge = tag(res.body, "X_ChallengeKey");
  if (res.status !== 200 || !challenge) {
    throw new Error("The TV didn't show a PIN. Make sure it's switched on (not in standby) and try again.");
  }
  challenges.set(ip, b64ToBytes(challenge));
}

/** Send the PIN shown on the TV. On success the TV is paired for good. */
export async function submitPanasonicPin(ip: string, pin: string): Promise<void> {
  const iv = challenges.get(ip);
  if (!iv) throw new Error("Request a PIN first");
  const { key, hmacKey } = pinKeys(iv);

  const authInfo = await encryptPayload(`<X_PinCode>${pin}</X_PinCode>`, key, hmacKey, iv);
  const res = await soapRequest(ip, "X_RequestAuth", `<X_AuthInfo>${authInfo}</X_AuthInfo>`);
  const authResult = tag(res.body, "X_AuthResult");
  if (res.status !== 200 || !authResult) throw new Error("Wrong PIN, or the PIN expired. Try again.");

  const decrypted = await decryptPayload(authResult, key, iv);
  const appId = tag(decrypted, "X_ApplicationId");
  const encKey = tag(decrypted, "X_Keyword");
  if (!appId || !encKey) throw new Error("Pairing failed. Try again.");

  const auth = { appId, encKey };
  saveAuth(ip, auth);
  challenges.delete(ip);
  await startSession(ip, auth);
}

async function sendEncrypted(ip: string, keyCommand: string, retry = true): Promise<boolean> {
  const auth = loadAuth(ip);
  if (!auth) return false;
  try {
    const s = sessions.get(ip) || (await startSession(ip, auth));
    const original =
      `<X_SessionId>${s.id}</X_SessionId>` +
      `<X_SequenceNumber>${String(s.seq).padStart(8, "0")}</X_SequenceNumber>` +
      `<X_OriginalCommand><u:X_SendKey xmlns:u="urn:${NRC_URN}">` +
      `<X_KeyEvent>${keyCommand}</X_KeyEvent></u:X_SendKey></X_OriginalCommand>`;
    const encInfo = await encryptPayload(original, s.key, s.hmacKey, s.iv);
    const res = await soapRequest(ip, "X_EncryptedCommand",
      `<X_ApplicationId>${auth.appId}</X_ApplicationId><X_EncInfo>${encInfo}</X_EncInfo>`);
    if (res.status === 200) { s.seq++; return true; }
    throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    sessions.delete(ip);
    if (retry) return sendEncrypted(ip, keyCommand, false); // session expired -> new session
    console.error("Panasonic encrypted command failed:", e);
    return false;
  }
}

/** Send a remote key. Picks plain or encrypted mode automatically. */
export async function sendPanasonicCommand(ip: string, keyCommand: string): Promise<boolean> {
  try {
    if (await isEncrypted(ip)) return sendEncrypted(ip, keyCommand);
    const res = await soapRequest(ip, "X_SendKey", `<X_KeyEvent>${keyCommand}</X_KeyEvent>`);
    return res.status === 200;
  } catch (error) {
    console.error("Failed to send command to Panasonic TV:", error);
    return false;
  }
}

/** Legacy single-TV sweep (kept for compatibility; the app now uses src/lib/tv/discovery.ts). */
export async function autoDiscoverPanasonicTV(): Promise<string | null> {
  const subnet = await getLocalSubnet();
  if (!subnet) return null;
  for (let i = 2; i <= 254; i += 20) {
    const chunk = Array.from({ length: Math.min(20, 255 - i) }, (_, k) => `${subnet}.${i + k}`);
    const found = await Promise.all(chunk.map(async (ip) => ((await getPanasonicInfo(ip)) ? ip : null)));
    const ip = found.find(Boolean);
    if (ip) return ip;
  }
  return null;
}