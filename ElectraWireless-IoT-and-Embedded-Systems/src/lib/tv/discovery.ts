import { Capacitor, registerPlugin } from "@capacitor/core";
import { lanRequest, getLanBackendUrl } from "./lan";
import { getPanasonicInfo } from "../panasonic";
import { getLocalSubnet } from "../network";

/**
 * "Search nearby" for smart devices on the same Wi-Fi — like a Bluetooth scan.
 *
 * 1. SSDP (native plugin TvDiscoveryPlugin.java): every TV / speaker / cast device
 *    answers with its description URL; we read name, brand and model from it.
 * 2. Fallback: quick sweep of the subnet for Panasonic's port 55000
 *    (used when SSDP finds nothing, e.g. routers that block multicast).
 * 3. Browser (npm run dev): the dev server does the SSDP search (vite-lan-bridge.ts).
 *
 * To support a new brand later: add it to `Brand`, `classify()` and SUPPORTED_BRANDS.
 */

export type Brand =
  | "panasonic" | "lg" | "samsung" | "sony" | "philips" | "google"
  | "xiaomi" | "tcl" | "hisense" | "roku" | "amazon" | "vizio" | "oneplus"
  | "toshiba" | "sharp" | "vu" | "realme" | "other";

/** How the app talks to this TV (decided automatically). */
export type Protocol = "viera" | "webos" | "tizen" | "androidtv";

export interface NearbyDevice {
  ip: string;
  brand: Brand;
  name: string;
  model?: string;
  kind: "tv" | "speaker" | "device";
  supported: boolean;
  protocol?: Protocol;
}

export const SUPPORTED_BRANDS: Brand[] = ["panasonic", "lg", "samsung"];

/** The value the remote screen saves as "tv_brand" (picks the right driver). */
export function remoteBrandOf(d: NearbyDevice): string {
  return d.protocol === "androidtv" ? "androidtv" : d.brand;
}

// Brands whose TVs usually run Android TV / Google TV
const ANDROID_TV_BRANDS: Brand[] = ["google", "xiaomi", "tcl", "oneplus", "sony", "realme", "vu", "hisense", "toshiba", "sharp", "philips", "panasonic", "other"];

/** Does this IP answer on the Android TV Remote port (6466)? */
async function hasAndroidTvRemote(ip: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return false; // phone: decided by brand instead
  try {
    const res = await fetch(`${getLanBackendUrl()}/api/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, port: 6466 }),
    });
    return Boolean((await res.json()).ok);
  } catch {
    return false;
  }
}

interface SsdpHit { ip: string; location?: string; server?: string; st?: string; usn?: string }

const TvDiscovery = registerPlugin<{
  scan(options: { timeoutMs: number }): Promise<{ devices: SsdpHit[] }>;
  getWifiIp(): Promise<{ ip?: string }>;
}>("TvDiscovery");

function tag(xml: string, name: string): string | null {
  const m = new RegExp(`<(?:\\w+:)?${name}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`).exec(xml);
  return m ? m[1].trim() : null;
}

function classify(text: string): Brand {
  const t = text.toLowerCase();
  if (t.includes("panasonic")) return "panasonic";
  if (t.includes("lg electronics") || t.includes("webos") || t.includes("lge")) return "lg";
  if (t.includes("samsung")) return "samsung";
  if (t.includes("sony") || t.includes("bravia")) return "sony";
  if (t.includes("philips")) return "philips";
  if (t.includes("xiaomi") || t.includes("mitv") || t.includes("mi tv") || t.includes("patchwall")) return "xiaomi";
  if (t.includes("tcl")) return "tcl";
  if (t.includes("hisense") || t.includes("vidaa")) return "hisense";
  if (t.includes("roku")) return "roku";
  if (t.includes("amazon") || t.includes("fire tv") || t.includes("aftm") || t.includes("aftt")) return "amazon";
  if (t.includes("vizio")) return "vizio";
  if (t.includes("oneplus")) return "oneplus";
  if (t.includes("toshiba")) return "toshiba";
  if (t.includes("sharp")) return "sharp";
  if (t.includes("realme")) return "realme";
  if (/\bvu\b/.test(t) || t.includes("vu televisions")) return "vu";
  if (t.includes("google") || t.includes("chromecast") || t.includes("android")) return "google";
  return "other";
}

async function fetchText(url: string, timeout = 2500): Promise<string | null> {
  try {
    const res = await lanRequest({ url, timeout });
    return res.status === 200 ? res.data : null;
  } catch {
    return null;
  }
}

async function describe(ip: string, hits: SsdpHit[]): Promise<NearbyDevice | null> {
  const headers = hits.map((h) => `${h.server ?? ""} ${h.st ?? ""} ${h.usn ?? ""}`).join(" ");
  if (/InternetGatewayDevice|WANDevice|WANConnection/i.test(headers)) return null; // the router

  // Panasonic TVs: ask the remote-control service directly (also tells us about PIN mode)
  if (classify(headers) === "panasonic" || hits.some((h) => h.location?.includes(":55000/"))) {
    const info = await getPanasonicInfo(ip);
    if (info) return { ip, brand: "panasonic", name: info.name, model: info.model, kind: "tv", supported: true, protocol: "viera" };
  }

  // Everyone else: read the UPnP description XML
  const locations = [...new Set(hits.map((h) => h.location).filter(Boolean))] as string[];
  let xml = "";
  for (const loc of locations.slice(0, 3)) {
    const x = await fetchText(loc);
    if (x && x.includes("<device")) { xml = x; break; }
  }

  const manufacturer = tag(xml, "manufacturer") || "";
  const brand = classify(`${manufacturer} ${tag(xml, "modelName") ?? ""} ${headers}`);
  const deviceType = `${tag(xml, "deviceType") ?? ""} ${headers}`;
  // DIAL (the "cast to TV" protocol) or a TV brand + media renderer = a TV,
  // even for brands we don't know by name yet
  const isDial = /dial-multiscreen|urn:dial/i.test(deviceType);
  const tvLike = /MediaRenderer|RemoteControl|webos|\btv\b|television/i.test(`${deviceType} ${tag(xml, "friendlyName") ?? ""}`);
  const kind: NearbyDevice["kind"] =
    isDial || (tvLike && brand !== "other") ? "tv"
    : /speaker|sonos|audio/i.test(`${deviceType} ${manufacturer}`) ? "speaker"
    : "device";

  const name = tag(xml, "friendlyName") || (brand !== "other" ? `${brand[0].toUpperCase()}${brand.slice(1)} device` : `Device ${ip}`);

  // Pick how to talk to it
  let protocol: Protocol | undefined;
  if (kind === "tv") {
    if (brand === "lg") protocol = "webos";
    else if (brand === "samsung") protocol = "tizen";
    else if (ANDROID_TV_BRANDS.includes(brand) && (await hasAndroidTvRemote(ip) || (Capacitor.isNativePlatform() && brand !== "other"))) {
      protocol = "androidtv";
    }
  }

  return {
    ip,
    brand,
    name,
    model: tag(xml, "modelNumber") || tag(xml, "modelName") || undefined,
    kind,
    supported: Boolean(protocol),
    protocol,
  };
}

async function panasonicSweep(onFound: (d: NearbyDevice) => void): Promise<void> {
  let subnet: string | null = null;
  if (Capacitor.isNativePlatform()) {
    try {
      const { ip } = await TvDiscovery.getWifiIp();
      if (ip) subnet = ip.split(".").slice(0, 3).join(".");
    } catch {}
  }
  if (!subnet) subnet = await getLocalSubnet();
  if (!subnet) return;

  const ips = Array.from({ length: 253 }, (_, i) => `${subnet}.${i + 2}`);
  for (let i = 0; i < ips.length; i += 32) {
    await Promise.all(ips.slice(i, i + 32).map(async (ip) => {
      const ok = await fetchText(`http://${ip}:55000/nrc/ddd.xml`, 900);
      if (!ok) return;
      const info = await getPanasonicInfo(ip);
      if (info) onFound({ ip, brand: "panasonic", name: info.name, model: info.model, kind: "tv", supported: true, protocol: "viera" });
    }));
  }
}

/**
 * Scan the Wi-Fi. `onFound` fires as each device is identified, so the list
 * can fill in live. Resolves with everything found (TVs first).
 */
export async function scanNearbyDevices(onFound?: (d: NearbyDevice) => void): Promise<NearbyDevice[]> {
  const found = new Map<string, NearbyDevice>();
  const add = (d: NearbyDevice | null) => {
    if (!d || found.has(d.ip)) return;
    found.set(d.ip, d);
    onFound?.(d);
  };

  const describeAll = async (devices: SsdpHit[]) => {
    const byIp = new Map<string, SsdpHit[]>();
    for (const h of devices) byIp.set(h.ip, [...(byIp.get(h.ip) ?? []), h]);
    await Promise.all([...byIp].map(async ([ip, hits]) => add(await describe(ip, hits))));
  };

  if (!Capacitor.isNativePlatform()) {
    // Browser: the dev server searches the Wi-Fi for us
    try {
      const res = await fetch(`${getLanBackendUrl()}/api/discover`);
      const { devices } = (await res.json()) as { devices: SsdpHit[] };
      await describeAll(devices);
    } catch (e) {
      console.warn("Search via dev server failed", e);
    }
  } else {
    try {
      const { devices } = await TvDiscovery.scan({ timeoutMs: 3000 });
      await describeAll(devices);
    } catch (e) {
      console.warn("SSDP scan failed, using fallback sweep", e);
    }
    if (![...found.values()].some((d) => d.kind === "tv")) {
      await panasonicSweep(add);
    }
  }

  const order = { tv: 0, speaker: 1, device: 2 };
  return [...found.values()].sort(
    (a, b) => Number(b.supported) - Number(a.supported) || order[a.kind] - order[b.kind],
  );
}