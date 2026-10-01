/// <reference types="node" />
import type { Plugin } from "vite";
import dgram from "node:dgram";
import os from "node:os";
import net from "node:net";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const createLgtv = createRequire(import.meta.url)("lgtv2");

/**
 * Lets the browser app find and talk to TVs on the Wi-Fi during `npm run dev`.
 * Browsers can't do this themselves, so the dev server does it quietly.
 * (The Android/iPhone app talks to the TV directly and doesn't use this.)
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

function ssdpSearch(timeoutMs = 3000): Promise<Record<string, string>[]> {
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

// ---------------------------------------------------------------------------
// LG webOS: one connection per TV, pairing keys saved in tv_key.json
// ---------------------------------------------------------------------------
const KEY_FILE = path.join(process.cwd(), "tv_key.json");
let lgKeys: Record<string, string> = {};
try {
  const data = JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
  lgKeys = data.clientKey ? { "192.168.31.68": data.clientKey } : data;
} catch {}

interface LgTv { lgtv: any; connected: boolean; prompting: boolean; waiters: (() => void)[] }
const lgTvs = new Map<string, LgTv>();

function getLgTv(ip: string): LgTv {
  const existing = lgTvs.get(ip);
  if (existing) return existing;
  const tv: LgTv = { lgtv: null, connected: false, prompting: false, waiters: [] };
  tv.lgtv = createLgtv({
    url: `wss://${ip}:3001`,
    timeout: 60000,
    reconnect: 5000,
    clientKey: lgKeys[ip] || "",
    wsconfig: { tlsOptions: { rejectUnauthorized: false } }, // TV uses a self-signed cert
    saveKey: (key: string, cb?: () => void) => {
      lgKeys[ip] = key;
      try { fs.writeFileSync(KEY_FILE, JSON.stringify(lgKeys, null, 2)); } catch {}
      cb?.();
    },
  });
  tv.lgtv.on("prompt", () => { tv.prompting = true; });
  tv.lgtv.on("connect", () => {
    tv.connected = true;
    tv.prompting = false;
    tv.waiters.splice(0).forEach((w) => w());
  });
  tv.lgtv.on("close", () => { tv.connected = false; });
  tv.lgtv.on("error", () => {});
  lgTvs.set(ip, tv);
  return tv;
}

function lgReady(ip: string, timeoutMs: number): Promise<LgTv> {
  const tv = getLgTv(ip);
  if (tv.connected) return Promise.resolve(tv);
  return new Promise((resolve, reject) => {
    const done = () => { clearTimeout(timer); resolve(tv); };
    const timer = setTimeout(() => {
      tv.waiters = tv.waiters.filter((w) => w !== done);
      reject(new Error(tv.prompting
        ? "Waiting for you to accept the popup on the TV"
        : `Can't reach LG TV at ${ip}. Is it on and on the same Wi-Fi?`));
    }, timeoutMs);
    tv.waiters.push(done);
  });
}

// ---------------------------------------------------------------------------
// Android TV / Google TV (Panasonic Android models, Tata Play, Mi, OnePlus,
// TCL, Sony…): Google's "Android TV Remote" protocol, via the androidtv-remote
// package. Pairing = a 6-character code shown on the TV. Certificates saved
// per TV in atv_certs.json so it only pairs once.
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
    const pkg = "androidtv-remote"; // variable so the config bundler doesn't require it up front
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
      server.middlewares.use("/api/discover", async (_req, res) => {
        sendJson(res, 200, { devices: await ssdpSearch(3000) });
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

      // ---- LG webOS ----
      server.middlewares.use("/api/tv/pair", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        if (!validIp(body.ip)) return sendJson(res, 400, { error: "Missing TV ip" });
        try {
          await lgReady(body.ip, 60000); // time to press "Allow" on the TV
          sendJson(res, 200, { status: "connected" });
        } catch (e: any) {
          sendJson(res, 504, { error: e.message });
        }
      });

      server.middlewares.use("/api/tv/command", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        if (!validIp(body.ip) || !body.uri) return sendJson(res, 400, { error: "Missing ip or uri" });
        try {
          const tv = await lgReady(body.ip, 8000);
          const cb = (err: any, response: any) =>
            err ? sendJson(res, 500, { error: err.message }) : sendJson(res, 200, { status: "success", response });
          body.payload ? tv.lgtv.request(body.uri, body.payload, cb) : tv.lgtv.request(body.uri, cb);
        } catch (e: any) {
          sendJson(res, 503, { error: e.message });
        }
      });

      server.middlewares.use("/api/tv/button", async (req, res) => {
        let body: any = {};
        try { body = JSON.parse(await readBody(req)); } catch {}
        if (!validIp(body.ip) || !body.name) return sendJson(res, 400, { error: "Missing ip or button" });
        try {
          const tv = await lgReady(body.ip, 8000);
          tv.lgtv.getSocket("ssap://com.webos.service.networkinput/getPointerInputSocket", (err: any, sock: any) => {
            if (err) return sendJson(res, 500, { error: err.message });
            sock.send("button", { name: body.name });
            sendJson(res, 200, { status: "success" });
          });
        } catch (e: any) {
          sendJson(res, 503, { error: e.message });
        }
      });

      // ---- Android TV / Google TV ----
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
          sendJson(res, 200, { status: 0, data: "" }); // unreachable / timeout
        }
      });
    },
  };
}