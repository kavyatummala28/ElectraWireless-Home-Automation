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
// not the normal ssap:// request/response API. These are the exact
// button names the TV expects on that channel.
const POINTER_BUTTON_COMMANDS = new Set<string>([
  LG_KEYS.UP,
  LG_KEYS.DOWN,
  LG_KEYS.LEFT,
  LG_KEYS.RIGHT,
  LG_KEYS.OK,
  LG_KEYS.RETURN,
]);

const CLIENT_KEY_PREFIX = "lg_webos_client_key_";

interface LGResponse {
  type?: string;
  id?: string;
  payload?: any;
  error?: string;
}

function getStoredClientKey(ip: string): string | null {
  return localStorage.getItem(`${CLIENT_KEY_PREFIX}${ip}`);
}

function storeClientKey(ip: string, key: string) {
  localStorage.setItem(`${CLIENT_KEY_PREFIX}${ip}`, key);
}

/**
 * Connect to an LG webOS TV and obtain/store the pairing key via WebSocket.
 */
export function connectLGTV(ip: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`wss://${ip}:3001`);

    let finished = false;

    const finish = (result: boolean) => {
      if (finished) return;
      finished = true;
      try {
        ws.close();
      } catch {}
      resolve(result);
    };

    const timeout = setTimeout(() => {
      console.error("LG TV connection timeout");
      finish(false);
    }, 8000);

    ws.onopen = () => {
      const storedKey = getStoredClientKey(ip);

      const payload: any = {
        pairingType: "PROMPT",
        manifest: {
          manifestVersion: 1,
          appVersion: "1.0.0",
          signed: {
            created: "2026-01-01T00:00:00Z",
            appId: "com.elly.home",
            vendorId: "com.elly",
            localizedAppNames: {
              "": "ELLY Home Intelligence",
            },
            localizedVendorNames: {
              "": "ELLY",
            },
            permissions: [
              "LAUNCH",
              "LAUNCH_WEBAPP",
              "APP_TO_APP",
              "CLOSE",
              "CONTROL_AUDIO",
              "CONTROL_INPUT_JOYSTICK",
              "CONTROL_INPUT_MEDIA_RECORDING",
              "CONTROL_INPUT_MEDIA_PLAYBACK",
              "CONTROL_INPUT_TV",
              "CONTROL_POWER",
              "READ_CURRENT_CHANNEL",
              "READ_RUNNING_APPS",
              "READ_TV_CHANNEL_LIST",
              "WRITE_NOTIFICATION_TOAST",
            ],
          },
        },
      };

      if (storedKey) {
        payload["client-key"] = storedKey;
      }

      ws.send(
        JSON.stringify({
          type: "register",
          id: "register_0",
          payload,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message: LGResponse = JSON.parse(event.data);

        console.log("[LG webOS]", message);

        if (message.type === "registered") {
          const clientKey =
            message.payload?.["client-key"] ||
            message.payload?.clientKey;

          if (clientKey) {
            storeClientKey(ip, clientKey);
          }

          clearTimeout(timeout);
          finish(true);
        }

        if (message.type === "error") {
          console.error("LG webOS registration error:", message);
        }
      } catch (error) {
        console.error("Invalid LG webOS response:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("LG webOS WebSocket error:", error);
      clearTimeout(timeout);
      finish(false);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });
}

/**
 * Send a D-pad / pointer button press via the backend's dedicated button route.
 */
async function sendLGButton(ip: string, name: string): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:3001/api/tv/button', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to send button via backend proxy:', error);
    return false;
  }
}

/**
 * Send a webOS command to the LG TV via the Node backend proxy server.
 */
export async function sendLGCommand(
  ip: string,
  command: string
): Promise<boolean> {
  // Up/Down/Left/Right/OK/Back use the pointer socket, not the request API.
  if (POINTER_BUTTON_COMMANDS.has(command)) {
    return sendLGButton(ip, command);
  }

  const uri = getLGCommandUri(command);
  if (!uri) return false;

  const payload = getLGCommandPayload(command);

  try {
    const res = await fetch('http://localhost:3001/api/tv/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ? { uri, payload } : { uri })
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to send command via backend proxy:', error);
    return false;
  }
}

/**
 * Launch a specific webOS app directly (Netflix, Prime Video, YouTube, Disney+...).
 */
export async function launchLGApp(ip: string, appId: string): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:3001/api/tv/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uri: 'ssap://system.launcher/launch',
        payload: { id: appId },
      }),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to launch app via backend proxy:', error);
    return false;
  }
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

// A few commands need a JSON payload alongside the uri (e.g. launching the home screen)
function getLGCommandPayload(command: string): Record<string, unknown> | undefined {
  switch (command) {
    case LG_KEYS.HOME:
      return { id: "com.webos.app.home" };
    default:
      return undefined;
  }
}

/**
 * Basic LG webOS auto-discovery over port 3001.
 */
export async function autoDiscoverLGTV(): Promise<string | null> {
  const localSubnet = await getLocalSubnet();

  const subnetsToScan = localSubnet
    ? [localSubnet]
    : [
        "192.168.1",
        "192.168.0",
        "192.168.29",
        "192.168.31",
        "192.168.50",
        "10.0.0",
      ];

  const ips: string[] = [];

  for (const subnet of subnetsToScan) {
    for (let i = 2; i <= 254; i++) {
      ips.push(`${subnet}.${i}`);
    }
  }

  const chunkSize = 10;

  for (let i = 0; i < ips.length; i += chunkSize) {
    const chunk = ips.slice(i, i + chunkSize);

    const results = await Promise.all(
      chunk.map(
        (ip) =>
          new Promise<string | null>((resolve) => {
            let settled = false;

            const finish = (value: string | null) => {
              if (settled) return;
              settled = true;
              resolve(value);
            };

            try {
              const ws = new WebSocket(`wss://${ip}:3001`);

              const timeout = setTimeout(() => {
                try {
                  ws.close();
                } catch {}
                finish(null);
              }, 1200);

              ws.onopen = () => {
                clearTimeout(timeout);

                try {
                  ws.close();
                } catch {}

                finish(ip);
              };

              ws.onerror = () => {
                clearTimeout(timeout);
                finish(null);
              };

              ws.onclose = () => {
                clearTimeout(timeout);
              };
            } catch {
              finish(null);
            }
          })
      )
    );

    const found = results.find((ip) => ip !== null);

    if (found) {
      return found;
    }
  }

  return null;
}