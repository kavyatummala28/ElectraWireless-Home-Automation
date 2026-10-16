
/// <reference types="node" />
import type { Plugin } from "vite";
import dgram from "node:dgram";
import os from "node:os";
import net from "node:net";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import WebSocket from "ws";
 
/**
 * Lets the browser app find and talk to TVs on the Wi-Fi during `npm run dev`.
 * Browsers can't do this directly, so the dev server handles network discovery.
 */
 
const SSDP_TARGETS = [
  "ssdp:all",
  "urn:panasonic-com:device:p00RemoteController:1",
  "urn:schemas-upnp-org:device:MediaRenderer:1",
  "urn:dial-multiscreen-org:service:dial:1",
  "urn:lge-com:service:webos-second-screen:1",
  "urn:samsung.com:device:RemoteControlReceiver:1",
];
 
function localIPv4s(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((n): n is os.NetworkInterfaceInfo => !!n && n.family === "IPv4" && !n.internal)
    .map((n) => n.address);
}
 
function ssdpSearch(timeoutMs = 2500): Promise<Record<string, string>[]> {
  return new Promise((resolve) => {
    const found = new Map<string, Record<string, string>>();
    const sockets: dgram.Socket[] = [];
 
    for (const addr of localIPv4s()) {
      const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });
      sockets.push(sock);
      sock.on("error", () => {});
      sock.on("message", (msg, rinfo) => {
        const d: Record<string, string> = { ip: rinfo.address };
        for (const line of msg.toString().split("\r\n")) {
          const i = line.indexOf(":");
          if (i <= 0) continue;
          const key = line.slice(0, i).trim().toLowerCase();
          if (["location", "server", "st", "usn"].includes(key)) d[key] = line.slice(i + 1).trim();
        }
        found.set(`${d.ip}|${d.location ?? ""}|${d.st ?? ""}`, d);
      });
      sock.bind(0, addr, () => {
        for (let round = 0; round < 2; round++) {
          for (const st of SSDP_TARGETS) {
            const m = Buffer.from(
              "M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\n" +
                `MAN: "ssdp:discover"\r\nMX: 2\r\nST: ${st}\r\n\r\n`,
            );
            sock.send(m, 1900, "239.255.255.250", () => {});
          }
        }
      });
    }
 
    setTimeout(() => {
      sockets.forEach((s) => { try { s.close(); } catch {} });
      resolve([...found.values()]);
    }, timeoutMs);
  });
}
 
function isPrivateIp(host: string) {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
}
 
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
  });
}
 
function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}
 
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
 
// ---------------------------------------------------------------------------
// LG webOS: raw WebSocket client (no lgtv2). Pairing keys saved per IP in
// tv_key.json. The TV is registered with an UNSIGNED manifest, which avoids
// the "403 Pairing rejected: blacklisted certificate" error lgtv2 triggers.
// ---------------------------------------------------------------------------
const KEY_FILE = path.join(process.cwd(), "tv_key.json");
let lgKeys: Record<string, string> = {};
try {
  const data = JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
  lgKeys = typeof data === "object" && data !== null ? data : {};
} catch {
  lgKeys = {};
}
 
const LG_MANIFEST = {
  manifestVersion: 1,
  permissions: ["CONTROL_POWER", "CONTROL_AUDIO", "CONTROL_MOUSE_AND_KEYBOARD", "LAUNCH"],
};
 
interface Waiter { ok: () => void; fail: (e: Error) => void }
interface LgTv {
  ws: WebSocket | null;
  connected: boolean;
  prompting: boolean;
  lastError: string;
  waiters: Waiter[];
  pending: Map<string, (err: Error | null, res?: any) => void>;
  pointer: WebSocket | null;
  n: number;
}
const lgTvs = new Map<string, LgTv>();
 
function lgConnect(ip: string, tv: LgTv) {
  console.log(`[LG ${ip}] connecting...`);
  const ws = new WebSocket(`wss://${ip}:3001`, { rejectUnauthorized: false, handshakeTimeout: 15000 });
  tv.ws = ws;
 
  ws.on("open", () => {
    const payload: any = { forcePairing: false, pairingType: "PROMPT", manifest: LG_MANIFEST };
    if (lgKeys[ip]) payload["client-key"] = lgKeys[ip];
    ws.send(JSON.stringify({ type: "register", id: "register_0", payload }));
  });
 
  ws.on("message", (raw) => {
    let m: any;
    try { m = JSON.parse(raw.toString()); } catch { return; }
 
    if (m.type === "response" && m.id === "register_0" && m.payload?.pairingType === "PROMPT") {
      tv.prompting = true;
      console.log(`[LG ${ip}] PROMPT - press Allow on the TV`);
    } else if (m.type === "registered") {
      const key = m.payload?.["client-key"];
      if (key) {
        lgKeys[ip] = key;
        try { fs.writeFileSync(KEY_FILE, JSON.stringify(lgKeys, null, 2)); } catch {}
      }
      tv.connected = true;
      tv.prompting = false;
      console.log(`[LG ${ip}] CONNECTED`);
      tv.waiters.splice(0).forEach((w) => w.ok());
    } else if (m.type === "error" && m.id === "register_0") {
      tv.lastError = String(m.error ?? "register error");
      console.log(`[LG ${ip}] register error:`, m.error);
      // A saved key the TV no longer recognises: forget it so the next try re-pairs.
      if (lgKeys[ip]) {
        delete lgKeys[ip];
        try { fs.writeFileSync(KEY_FILE, JSON.stringify(lgKeys, null, 2)); } catch {}
      }
    } else if (m.id && tv.pending.has(m.id)) {
      const cb = tv.pending.get(m.id)!;
      tv.pending.delete(m.id);
      if (m.type === "error") cb(new Error(m.error || "TV error"));
      else cb(null, m.payload);
    }
  });
 
  ws.on("error", (e: any) => {
    tv.lastError = e?.message ?? String(e);
    console.log(`[LG ${ip}] error:`, tv.lastError);
  });
 
  ws.on("close", () => {
    console.log(`[LG ${ip}] closed`);
    tv.connected = false;
    try { tv.pointer?.close(); } catch {}
    tv.pointer = null;
    tv.pending.forEach((cb) => cb(new Error("TV connection closed")));
    tv.pending.clear();
    tv.waiters.splice(0).forEach((w) => w.fail(new Error(tv.lastError || "connection closed")));
    if (lgTvs.get(ip) === tv) lgTvs.delete(ip); // next request starts fresh
  });
}
 
function getLgTv(ip: string): LgTv {
  let tv = lgTvs.get(ip);
  if (!tv) {
    tv = { ws: null, connected: false, prompting: false, lastError: "", waiters: [], pending: new Map(), pointer: null, n: 0 };
    lgTvs.set(ip, tv);
    lgConnect(ip, tv);
  }
  return tv;
}
 
function waitConnected(tv: LgTv, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const w: Waiter = {
      ok: () => { clearTimeout(timer); resolve(); },
      fail: (e) => { clearTimeout(timer); reject(e); },
    };
    const timer = setTimeout(() => {
      tv.waiters = tv.waiters.filter((x) => x !== w);
      reject(new Error("__timeout__"));
    }, Math.max(ms, 0));
    tv.waiters.push(w);
  });
}
 
/** Waits until the TV is connected + registered. Retries quickly if a connect attempt fails. */
async function lgReady(ip: string, timeoutMs: number): Promise<LgTv> {
  const deadline = Date.now() + timeoutMs;
  let lastErr = "";
  while (Date.now() < deadline) {
    const tv = getLgTv(ip);
    if (tv.connected) return tv;
    try {
      await waitConnected(tv, deadline - Date.now());
      return tv;
    } catch (e: any) {
      if (e.message === "__timeout__") {
        if (tv.prompting) throw new Error("Waiting for you to accept the popup on the TV");
        // Stuck connecting: drop it so the next attempt starts clean.
        try { tv.ws?.terminate(); } catch {}
        lgTvs.delete(ip);
        lastErr = tv.lastError;
        break;
      }
      lastErr = e.message;
      await sleep(500);
    }
  }
  throw new Error(`Can't reach LG TV at ${ip}. Is it on and on the same Wi-Fi?${lastErr ? ` (${lastErr})` : ""}`);
}
 
function lgRequest(tv: LgTv, uri: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!tv.ws || tv.ws.readyState !== WebSocket.OPEN) return reject(new Error("TV not connected"));
    const id = `req_${++tv.n}`;
    const timer = setTimeout(() => {
      if (tv.pending.delete(id)) reject(new Error("TV didn't answer"));
    }, 8000);
    tv.pending.set(id, (err, res) => {
      clearTimeout(timer);
      err ? reject(err) : resolve(res);
    });
    tv.ws.send(JSON.stringify({ type: "request", id, uri, payload }));
  });
}
 
/** Arrow keys / OK / Back go through a second "pointer" socket whose address the TV supplies. */
async function lgPointer(tv: LgTv): Promise<WebSocket> {
  if (tv.pointer && tv.pointer.readyState === WebSocket.OPEN) return tv.pointer;
  const r = await lgRequest(tv, "ssap://com.webos.service.networkinput/getPointerInputSocket");
  if (!r?.socketPath) throw new Error("TV gave no pointer socket");
  const sock = await new Promise<WebSocket>((resolve, reject) => {
    const p = new WebSocket(r.socketPath, { rejectUnauthorized: false, handshakeTimeout: 8000 });
    p.once("open", () => resolve(p));
    p.once("error", reject);
  });
  sock.on("error", () => {});
  sock.on("close", () => { if (tv.pointer === sock) tv.pointer = null; });
  tv.pointer = sock;
  return sock;
}
 
// ---------------------------------------------------------------------------
// Android TV / Google TV Protocol
// ---------------------------------------------------------------------------
const ATV_CERT_FILE = path.join(process.cwd(), "atv_certs.json");
let atvCerts: Record<string, any> = {};
try { atvCerts = JSON.parse(fs.readFileSync(ATV_CERT_FILE, "utf8")); } catch {}
const saveAtvCerts = () => { try { fs.writeFileSync(ATV_CERT_FILE, JSON.stringify(atvCerts, null, 2)); } catch {} };
 
type AtvSignal = "ready" | "code" | "error" | "timeout";
interface Atv {
  remote: any; lib: any; ready: boolean; needsCode: boolean; lastError?: string;
  waiters: ((s: AtvSignal) => void)[];
}
const atvs = new Map<string, Atv>();
 
async function loadAtvLib(): Promise<any> {
  try {
    const pkg = "androidtv-remote";
    const mod: any = await import(/* @vite-ignore */ pkg);
    return mod.AndroidRemote ? mod : mod.default;
  } catch {
    throw new Error('Android TV support needs one package. Run: npm install androidtv-remote  (then restart npm run dev)');
  }
}
 
async function getAtv(ip: string): Promise<Atv> {
  const existing = atvs.get(ip);
  if (existing) return existing;
  const lib = await loadAtvLib();
  const remote = new lib.AndroidRemote(ip, {
    pairing_port: 6467,
    remote_port: 6466,
    name: "ELLY Home",
    cert: atvCerts[ip] ?? {},
  });
  const atv: Atv = { remote, lib, ready: false, needsCode: false, waiters: [] };
  const notify = (s: AtvSignal) => atv.waiters.splice(0).forEach((w) => w(s));
 
  remote.on("secret", () => { atv.needsCode = true; notify("code"); });
  remote.on("ready", () => {
    atv.ready = true;
    atv.needsCode = false;
    try { atvCerts[ip] = remote.getCertificate(); saveAtvCerts(); } catch {}
    notify("ready");
  });
  remote.on("unpaired", () => { delete atvCerts[ip]; saveAtvCerts(); atv.ready = false; atvs.delete(ip); });
  remote.on("error", (e: any) => { atv.lastError = String(e?.message ?? e); notify("error"); });
 
  atvs.set(ip, atv);
  Promise.resolve(remote.start()).catch((e: any) => {
    atv.lastError = String(e?.message ?? e);
    atvs.delete(ip);
    notify("error");
  });
  return atv;
}
 
function atvWait(atv: Atv, ms: number): Promise<AtvSignal> {
  if (atv.ready) return Promise.resolve("ready");
  if (atv.needsCode) return Promise.resolve("code");
  return new Promise((resolve) => {
    const w = (s: AtvSignal) => { clearTimeout(t); resolve(s); };
    const t = setTimeout(() => { atv.waiters = atv.waiters.filter((x) => x !== w); resolve("timeout"); }, ms);
    atv.waiters.push(w);
  });
}
 
const validIp = (ip: unknown): ip is string => typeof ip === "string" && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
 
export function lanBridge(): Plugin {
  return {
    name: "elly-lan-bridge",
    apply: "serve",
    configureServer(server) {
      // ---- Automated Device Discovery with Subnet Ping Fallback ----
      server.middlewares.use("/api/discover", async (_req, res) => {
        const ssdpDevices = await ssdpSearch(2500);
        const localIps = localIPv4s();
        const foundDevices: Record<string, string>[] = [...ssdpDevices];
 
        // Filter out router gateway entries
        const validSsdp = foundDevices.filter((d) => !d.ip.endsWith(".1"));
 
        if (localIps.length > 0) {
          const subnet = localIps[0].split(".").slice(0, 3).join(".");
 
          // Auto-scan local subnet for LG TV webOS ports (3000/3001)
          const scanPromises = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`).map((ip) => {
            if (ip.endsWith(".1") || localIps.includes(ip)) return Promise.resolve(null);
            return new Promise<Record<string, string> | null>((resolve) => {
              const sock = net.connect({ host: ip, port: 3001, timeout: 250 });
              sock.once("connect", () => {
                sock.destroy();
                resolve({
                  ip,
                  server: "LG webOS Smart TV",
                  st: "urn:lge-com:service:webos-second-screen:1",
                  location: `http://${ip}:3001/`,
                });
              });
              sock.once("error", () => {
                // Try fallback to port 3000 if 3001 doesn't answer
                const sock2 = net.connect({ host: ip, port: 3000, timeout: 250 });
                sock2.once("connect", () => {
                  sock2.destroy();
                  resolve({
                    ip,
                    server: "LG webOS Smart TV",
                    st: "urn:lge-com:service:webos-second-screen:1",
                    location: `http://${ip}:3000/`,
                  });
                });
                sock2.once("error", () => resolve(null));
                sock2.once("timeout", () => { sock2.destroy(); resolve(null); });
              });
              sock.once("timeout", () => { sock.destroy(); resolve(null); });
            });
          });
 
          const scanned = (await Promise.all(scanPromises)).filter((d): d is Record<string, string> => d !== null);
 
          for (const dev of scanned) {
            if (!validSsdp.some((d) => d.ip === dev.ip)) {
              validSsdp.push(dev);
            }
          }
        }
 
        sendJson(res, 200, { devices: validSsdp });
      });
 
      // ---- Is a TV reachable? (live status badge) ----
      server.middlewares.use("/api/ping", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        const port = Number(body.port);
        if (!validIp(body.ip) || !isPrivateIp(body.ip) || !port) return sendJson(res, 400, { ok: false });
        const ok = await new Promise<boolean>((resolve) => {
          const sock = net.connect({ host: body.ip, port, timeout: 2000 });
          sock.once("connect", () => { sock.destroy(); resolve(true); });
          sock.once("timeout", () => { sock.destroy(); resolve(false); });
          sock.once("error", () => resolve(false));
        });
        sendJson(res, 200, { ok });
      });
 
      // ---- LG webOS Endpoints ----
      server.middlewares.use("/api/tv/pair", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        if (!validIp(body.ip) || !isPrivateIp(body.ip)) return sendJson(res, 400, { error: "Missing or invalid TV ip" });
        try {
          await lgReady(body.ip, 60000); // time to press "Allow" on the TV
          sendJson(res, 200, { status: "connected" });
        } catch (e: any) {
          console.log("[LG] pair failed:", e.message);
          sendJson(res, 504, { error: e.message });
        }
      });
 
      server.middlewares.use("/api/tv/command", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        if (!validIp(body.ip) || !isPrivateIp(body.ip) || !body.uri) return sendJson(res, 400, { error: "Missing ip or uri" });
        try {
          const tv = await lgReady(body.ip, 10000);
          let payload = body.payload;
          // setMute needs an explicit value: toggle based on the TV's current state.
          if (body.uri === "ssap://audio/setMute" && !payload) {
            let muted = false;
            try { muted = !!(await lgRequest(tv, "ssap://audio/getStatus"))?.mute; } catch {}
            payload = { mute: !muted };
          }
          const response = await lgRequest(tv, body.uri, payload);
          sendJson(res, 200, { status: "success", response });
        } catch (e: any) {
          console.log("[LG] command failed:", e.message);
          sendJson(res, 503, { error: e.message });
        }
      });
 
      server.middlewares.use("/api/tv/button", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        if (!validIp(body.ip) || !isPrivateIp(body.ip) || !body.name) return sendJson(res, 400, { error: "Missing ip or button" });
        if (!/^[A-Z0-9_]+$/.test(String(body.name))) return sendJson(res, 400, { error: "Bad button name" });
        try {
          const tv = await lgReady(body.ip, 10000);
          const sock = await lgPointer(tv);
          sock.send(`type:button\nname:${body.name}\n\n`);
          sendJson(res, 200, { status: "success" });
        } catch (e: any) {
          console.log("[LG] button failed:", e.message);
          sendJson(res, 503, { error: e.message });
        }
      });
 
      // ---- Android TV / Google TV Endpoints ----
      server.middlewares.use("/api/atv/connect", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        if (!validIp(body.ip)) return sendJson(res, 400, { error: "Missing TV ip" });
        try {
          const atv = await getAtv(body.ip);
          const s = await atvWait(atv, 15000);
          if (s === "ready") return sendJson(res, 200, { status: "connected" });
          if (s === "code") return sendJson(res, 200, { status: "code_required" });
          atvs.delete(body.ip);
          sendJson(res, 504, { error: atv.lastError || "The TV didn't answer. Is it on and on the same Wi-Fi?" });
        } catch (e: any) {
          sendJson(res, 500, { error: e.message });
        }
      });
 
      server.middlewares.use("/api/atv/code", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        const atv = validIp(body.ip) ? atvs.get(body.ip) : undefined;
        if (!atv || !body.code) return sendJson(res, 400, { error: "Start connecting first" });
        atv.needsCode = false;
        try { atv.remote.sendCode(String(body.code).trim().toUpperCase()); } catch (e: any) {
          return sendJson(res, 500, { error: e.message });
        }
        const s = await atvWait(atv, 20000);
        if (s === "ready") return sendJson(res, 200, { status: "connected" });
        sendJson(res, 401, { error: "The TV didn't accept that code. Try again." });
      });
 
      server.middlewares.use("/api/atv/key", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        if (!validIp(body.ip) || !body.key) return sendJson(res, 400, { error: "Missing ip or key" });
        try {
          const atv = await getAtv(body.ip);
          if ((await atvWait(atv, 8000)) !== "ready") return sendJson(res, 503, { error: "TV not connected" });
          const code = atv.lib.RemoteKeyCode?.[body.key];
          if (code === undefined) return sendJson(res, 400, { error: `Unknown key ${body.key}` });
          atv.remote.sendKey(code, atv.lib.RemoteDirection.SHORT);
          sendJson(res, 200, { status: "success" });
        } catch (e: any) {
          atvs.delete(body.ip);
          sendJson(res, 500, { error: e.message });
        }
      });
 
      server.middlewares.use("/api/atv/app", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        if (!validIp(body.ip) || !body.link) return sendJson(res, 400, { error: "Missing ip or link" });
        try {
          const atv = await getAtv(body.ip);
          if ((await atvWait(atv, 8000)) !== "ready") return sendJson(res, 503, { error: "TV not connected" });
          atv.remote.sendAppLink(body.link);
          sendJson(res, 200, { status: "success" });
        } catch (e: any) {
          sendJson(res, 500, { error: e.message });
        }
      });
 
      server.middlewares.use("/api/lan-request", async (req, res) => {
        if (req.method !== "POST") return sendJson(res, 405, { error: "POST only" });
        let body: any;
        try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: "Bad JSON" }); }
 
        const { url, method = "GET", headers = {}, data, timeout = 4000 } = body ?? {};
        let target: URL;
        try { target = new URL(url); } catch { return sendJson(res, 400, { error: "Bad url" }); }
        if (target.protocol !== "http:" || !isPrivateIp(target.hostname)) {
          return sendJson(res, 403, { error: "Only local-network http:// addresses are allowed" });
        }
 
        try {
          const r = await fetch(url, {
            method,
            headers,
            body: method === "POST" ? data : undefined,
            signal: AbortSignal.timeout(timeout),
          });
          sendJson(res, 200, { status: r.status, data: await r.text() });
        } catch {
          sendJson(res, 200, { status: 0, data: "" });
        }
      });
    },
  };
}