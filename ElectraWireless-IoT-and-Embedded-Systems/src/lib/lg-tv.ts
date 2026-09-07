import { getLocalSubnet } from "./network";

export const LG_KEYS = {
  POWER: "POWER",
  VOL_UP: "VOLUMEUP",
  VOL_DOWN: "VOLUMEDOWN",
  MUTE: "MUTE",
  UP: "UP",
  DOWN: "DOWN",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  OK: "ENTER",
  RETURN: "BACK",
  HOME: "HOME",
  SOURCE: "INPUT",
} as const;

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
 * Send a webOS command to the LG TV via the Node backend proxy server.
 */
export async function sendLGCommand(
  ip: string,
  command: string
): Promise<boolean> {
  const uri = getLGCommandUri(command);
  if (!uri) return false;

  try {
    const res = await fetch('http://localhost:3001/api/tv/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri })
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to send command via backend proxy:', error);
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

    case LG_KEYS.HOME:
      return "ssap://com.webos.applicationManager/launch";

    case LG_KEYS.UP:
      return "ssap://com.webos.service.ime/sendUpKey";

    case LG_KEYS.DOWN:
      return "ssap://com.webos.service.ime/sendDownKey";

    case LG_KEYS.LEFT:
      return "ssap://com.webos.service.ime/sendLeftKey";

    case LG_KEYS.RIGHT:
      return "ssap://com.webos.service.ime/sendRightKey";

    case LG_KEYS.OK:
      return "ssap://com.webos.service.ime/sendEnterKey";

    case LG_KEYS.RETURN:
      return "ssap://com.webos.service.ime/sendBackKey";

    default:
      return null;
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