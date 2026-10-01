import { Capacitor, CapacitorHttp } from "@capacitor/core";

/**
 * Talk to devices on the local Wi-Fi (TVs etc).
 * - Android/iPhone app: directly, via native HTTP.
 * - Browser (npm run dev): browsers block this, so the dev server does it
 *   for us (see vite-lan-bridge.ts). Nothing extra to run.
 */

const BACKEND_KEY = "lan_backend_url";

export function getLanBackendUrl(): string {
  return localStorage.getItem(BACKEND_KEY) || ""; // "" = same server as the app
}

export function setLanBackendUrl(url: string) {
  localStorage.setItem(BACKEND_KEY, url.trim().replace(/\/+$/, ""));
}

export const isNative = () => Capacitor.isNativePlatform();

export interface LanRequest {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  data?: string;
  timeout?: number;
}

export interface LanResponse {
  status: number;
  data: string;
}

export async function lanRequest(req: LanRequest): Promise<LanResponse> {
  const timeout = req.timeout ?? 4000;

  if (isNative()) {
    const res = await CapacitorHttp.request({
      url: req.url,
      method: req.method ?? "GET",
      headers: req.headers,
      data: req.data,
      responseType: "text",
      connectTimeout: timeout,
      readTimeout: timeout,
    });
    return { status: res.status, data: String(res.data ?? "") };
  }

  // Browser: ask the dev server to make the request for us
  const res = await fetch(`${getLanBackendUrl()}/api/lan-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...req, timeout }),
  });
  if (!res.ok) throw new Error(`Backend error ${res.status}`);
  return res.json();
}