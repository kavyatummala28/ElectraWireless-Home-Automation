import { isNative, getLanBackendUrl } from "./tv/lan";

/**
 * Android TV / Google TV driver (Panasonic Android models, Tata Play Binge+,
 * Mi, OnePlus, TCL, Sony…). Uses Google's Android TV Remote protocol through
 * the dev server (vite-lan-bridge.ts). Pairing: a 6-character code on the TV.
 */

// Remote button -> Android key code name
export const ANDROIDTV_KEYS = {
  POWER: "KEYCODE_POWER",
  VOL_UP: "KEYCODE_VOLUME_UP",
  VOL_DOWN: "KEYCODE_VOLUME_DOWN",
  MUTE: "KEYCODE_VOLUME_MUTE",
  CH_UP: "KEYCODE_CHANNEL_UP",
  CH_DOWN: "KEYCODE_CHANNEL_DOWN",
  UP: "KEYCODE_DPAD_UP",
  DOWN: "KEYCODE_DPAD_DOWN",
  LEFT: "KEYCODE_DPAD_LEFT",
  RIGHT: "KEYCODE_DPAD_RIGHT",
  OK: "KEYCODE_DPAD_CENTER",
  RETURN: "KEYCODE_BACK",
  HOME: "KEYCODE_HOME",
  APPS: "KEYCODE_ALL_APPS",
  SOURCE: "KEYCODE_TV_INPUT",
  NUM_0: "KEYCODE_0",
  NUM_1: "KEYCODE_1",
  NUM_2: "KEYCODE_2",
  NUM_3: "KEYCODE_3",
  NUM_4: "KEYCODE_4",
  NUM_5: "KEYCODE_5",
  NUM_6: "KEYCODE_6",
  NUM_7: "KEYCODE_7",
  NUM_8: "KEYCODE_8",
  NUM_9: "KEYCODE_9",
};

// Quick Launch: Android TV opens apps from their web links
export const ANDROIDTV_APPS = {
  NETFLIX: "https://www.netflix.com/",
  PRIME_VIDEO: "https://www.primevideo.com/",
  YOUTUBE: "https://www.youtube.com/",
  DISNEY_PLUS: "https://www.hotstar.com/",
};

async function call(path: string, body: unknown): Promise<any> {
  if (isNative()) {
    throw new Error("Android TV control works from the laptop app for now (npm run dev).");
  }
  const res = await fetch(`${getLanBackendUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

export type AndroidTvConnectResult = "connected" | "code_required";

/** Connect. First time: the TV shows a 6-character code -> submitAndroidTvCode(). */
export async function connectAndroidTv(ip: string): Promise<AndroidTvConnectResult> {
  const r = await call("/api/atv/connect", { ip });
  return r.status === "code_required" ? "code_required" : "connected";
}

export async function submitAndroidTvCode(ip: string, code: string): Promise<void> {
  await call("/api/atv/code", { ip, code });
}

export async function sendAndroidTvKey(ip: string, key: string): Promise<boolean> {
  try {
    await call("/api/atv/key", { ip, key });
    return true;
  } catch (e) {
    console.error("Android TV key failed:", e);
    return false;
  }
}

export async function launchAndroidTvApp(ip: string, link: string): Promise<boolean> {
  try {
    await call("/api/atv/app", { ip, link });
    return true;
  } catch {
    return false;
  }
}