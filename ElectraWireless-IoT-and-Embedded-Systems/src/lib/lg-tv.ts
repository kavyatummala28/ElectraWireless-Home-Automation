import { Capacitor } from "@capacitor/core";
import { getLocalSubnet } from "./network";

export const LG_KEYS = {
  POWER: "POWER",
  VOL_UP: "VOLUMEUP",
  VOL_DOWN: "VOLUMEDOWN",
  MUTE: "MUTE",
  CH_UP: "CHANNELUP",
  CH_DOWN: "CHANNELDOWN",
  UP: "UP",
  DOWN: "DOWN",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  OK: "ENTER",
  RETURN: "BACK",
  HOME: "HOME",
  SOURCE: "INPUT",
} as const;

export const LG_APPS = {
  NETFLIX: "netflix",
  PRIME_VIDEO: "amazon",
  YOUTUBE: "youtube.leanback.v4",
  DISNEY_PLUS: "com.disney.disneyplus-prod",
} as const;

// D-pad navigation on webOS goes through a separate "pointer" WebSocket,
// not the normal ssap:// request/response API.
const POINTER_BUTTON_COMMANDS = new Set<string>([
  LG_KEYS.UP,
  LG_KEYS.DOWN,
  LG_KEYS.LEFT,
  LG_KEYS.RIGHT,
  LG_KEYS.OK,
  LG_KEYS.RETURN,
]);

// The TV uses a self-signed certificate, which browsers refuse, so every
// LG request goes through the built-in backend (vite-lan-bridge.ts).
const BACKEND_KEY = "lg_backend_url";

export function getLGBackendUrl(): string {
  const saved = localStorage.getItem(BACKEND_KEY);
  if (saved) return saved;
  // Browser (npm run dev): the dev server handles LG itself (vite-lan-bridge.ts)
  return Capacitor.isNativePlatform() ? "http://localhost:3001" : "";
}

export function setLGBackendUrl(url: string) {
  localStorage.setItem(BACKEND_KEY, url.trim().replace(/\/+$/, ""));
}

async function postToBackend(path: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${getLGBackendUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[LG webOS] ${path} failed:`, err.error || res.status);
    }
    return res.ok;
  } catch (error) {
    console.error("[LG webOS] Can't reach backend at", getLGBackendUrl(), error);
    return false;
  }
}

/**
 * Pair with / connect to the LG TV at this IP.
 * First time: a popup appears on the TV - press "Allow" within 60 seconds.
 */
export function connectLGTV(ip: string): Promise<boolean> {
  return postToBackend("/api/tv/pair", { ip });
}

async function sendLGButton(ip: string, name: string): Promise<boolean> {
  return postToBackend("/api/tv/button", { ip, name });
}

export async function sendLGCommand(ip: string, command: string): Promise<boolean> {
  // Up/Down/Left/Right/OK/Back use the pointer socket, not the request API.
  if (POINTER_BUTTON_COMMANDS.has(command)) {
    return sendLGButton(ip, command);
  }

  const uri = getLGCommandUri(command);
  if (!uri) return false;

  const payload = getLGCommandPayload(command);
  return postToBackend("/api/tv/command", payload ? { ip, uri, payload } : { ip, uri });
}

export async function launchLGApp(ip: string, appId: string): Promise<boolean> {
  return postToBackend("/api/tv/command", {
    ip,
    uri: "ssap://system.launcher/launch",
    payload: { id: appId },
  });
}

function getLGCommandUri(command: string): string | null {
  switch (command) {
    case LG_KEYS.POWER:
      return "ssap://system/turnOff";
    case LG_KEYS.VOL_UP:
      return "ssap://audio/volumeUp";
    case LG_KEYS.VOL_DOWN:
      return "ssap://audio/volumeDown";
    case LG_KEYS.MUTE:
      return "ssap://audio/setMute";
    case LG_KEYS.CH_UP:
      return "ssap://tv/channelUp";
    case LG_KEYS.CH_DOWN:
      return "ssap://tv/channelDown";
    case LG_KEYS.HOME:
      return "ssap://system.launcher/launch";
    case LG_KEYS.SOURCE:
      return "ssap://tv/switchInput";
    default:
      return null;
  }
}

function getLGCommandPayload(command: string): Record<string, unknown> | undefined {
  switch (command) {
    case LG_KEYS.HOME:
      return { id: "com.webos.app.home" };
    default:
      return undefined;
  }
}

/** Legacy discovery (the app now uses src/lib/tv/discovery.ts). */
export async function autoDiscoverLGTV(): Promise<string | null> {
  const subnet = await getLocalSubnet();
  return subnet ? null : null;
}