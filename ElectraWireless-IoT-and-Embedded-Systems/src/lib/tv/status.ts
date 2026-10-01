import { lanRequest, isNative, getLanBackendUrl } from "./lan";

/**
 * Is this TV switched on and reachable right now?
 * Used for the live CONNECTED / OFFLINE badge on the remote.
 */
const PORTS: Record<string, number> = { panasonic: 55000, samsung: 8001, lg: 3001, androidtv: 6466 };

export async function isTvReachable(ip: string, brand: string): Promise<boolean> {
  const port = PORTS[brand];
  if (!port) return false;

  // Browser (npm run dev): the dev server checks the TV's port
  if (!isNative()) {
    try {
      const res = await fetch(`${getLanBackendUrl()}/api/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, port }),
      });
      const json = await res.json();
      return Boolean(json.ok);
    } catch {
      return false;
    }
  }

  // Phone app: any HTTP answer means the TV is up
  if (brand === "androidtv") return true; // phone app can't check this port yet
  const httpPort = brand === "lg" ? 3000 : port;
  try {
    const res = await lanRequest({ url: `http://${ip}:${httpPort}/`, timeout: 2500 });
    return res.status > 0;
  } catch {
    return false;
  }
}