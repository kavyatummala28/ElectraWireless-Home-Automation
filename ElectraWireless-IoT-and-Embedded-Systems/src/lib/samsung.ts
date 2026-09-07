import { CapacitorHttp } from '@capacitor/core';

export const SAMSUNG_KEYS = {
  POWER: 'KEY_POWER',
  VOL_UP: 'KEY_VOLUP',
  VOL_DOWN: 'KEY_VOLDOWN',
  CH_UP: 'KEY_CHUP',
  CH_DOWN: 'KEY_CHDOWN',
  UP: 'KEY_UP',
  DOWN: 'KEY_DOWN',
  LEFT: 'KEY_LEFT',
  RIGHT: 'KEY_RIGHT',
  OK: 'KEY_ENTER',
  RETURN: 'KEY_RETURN',
  MUTE: 'KEY_MUTE',
  HOME: 'KEY_HOME',
  SOURCE: 'KEY_SOURCE',
  APPS: 'KEY_CONTENTS',
  RED: 'KEY_RED',
  GREEN: 'KEY_GREEN',
  YELLOW: 'KEY_YELLOW',
  BLUE: 'KEY_BLUE',
  NUM_0: 'KEY_0',
  NUM_1: 'KEY_1',
  NUM_2: 'KEY_2',
  NUM_3: 'KEY_3',
  NUM_4: 'KEY_4',
  NUM_5: 'KEY_5',
  NUM_6: 'KEY_6',
  NUM_7: 'KEY_7',
  NUM_8: 'KEY_8',
  NUM_9: 'KEY_9',
};

/**
 * Connects to Samsung TV via WebSocket and sends a command.
 * Features Automatic Token Caching to bypass subsequent security prompts.
 */
export async function sendSamsungCommand(ip: string, keyCommand: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Base64 encode app name to identify as Elly
    const appName = btoa("ELLY Home Intelligence");
    let wsUrl = `wss://${ip}:8002/api/v2/channels/samsung.remote.control?name=${appName}`;

    // Append cached token if we have one to bypass the prompt!
    const cachedToken = localStorage.getItem(`samsung_token_${ip}`);
    if (cachedToken) {
      wsUrl += `&token=${cachedToken}`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);

      ws.onopen = () => {
        // We do not immediately send the command if we don't have a token,
        // because we must wait for the TV to accept the connection first.
        if (cachedToken) {
          sendPayload(ws, keyCommand);
          setTimeout(() => {
            ws.close();
            clearTimeout(timeout);
            resolve(true);
          }, 500);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.event === 'ms.channel.connect') {
            // TV accepted the connection! Save the token for future zero-prompt access.
            if (msg.data && msg.data.token) {
              localStorage.setItem(`samsung_token_${ip}`, msg.data.token);
            }
            
            // Now that we are fully connected and accepted, send the command
            if (!cachedToken) {
               sendPayload(ws, keyCommand);
               setTimeout(() => {
                 ws.close();
                 clearTimeout(timeout);
                 resolve(true);
               }, 500);
            }
          } else if (msg.event === 'ms.channel.unauthorized') {
            console.error('Samsung TV connection denied by user.');
            ws.close();
            clearTimeout(timeout);
            resolve(false);
          }
        } catch (e) {
          console.error("Failed to parse Samsung WS message", e);
        }
      };

      ws.onerror = (e) => {
        console.error("Samsung WebSocket Error:", e);
        // Fallback to non-SSL port 8001 for older Tizen TVs
        if (wsUrl.includes('8002')) {
          console.log("Falling back to port 8001...");
          const fallbackWs = new WebSocket(`ws://${ip}:8001/api/v2/channels/samsung.remote.control?name=${appName}`);
          fallbackWs.onopen = () => {
             sendPayload(fallbackWs, keyCommand);
             setTimeout(() => { fallbackWs.close(); resolve(true); }, 500);
          };
          fallbackWs.onerror = () => resolve(false);
        } else {
          resolve(false);
        }
      };

    } catch (error) {
      console.error("Failed to initiate Samsung WebSocket:", error);
      resolve(false);
    }
  });
}

function sendPayload(ws: WebSocket, keyCommand: string) {
  const payload = {
    method: 'ms.remote.control',
    params: {
      Cmd: 'Click',
      DataOfCmd: keyCommand,
      Option: 'false',
      TypeOfRemote: 'SendRemoteKey',
    },
  };
  ws.send(JSON.stringify(payload));
}

import { getLocalSubnet } from "./network";

/**
 * Sweeps the local network to find Samsung Smart TVs.
 * Returns the IP address if found, otherwise null.
 */
export async function autoDiscoverSamsungTV(): Promise<string | null> {
  const localSubnet = await getLocalSubnet();
  const subnetsToScan = localSubnet ? [localSubnet] : ['192.168.1', '192.168.0', '192.168.29', '192.168.31', '192.168.50', '10.0.0'];
  const ipsToScan: string[] = [];
  
  for (const subnet of subnetsToScan) {
    for (let i = 2; i <= 254; i++) {
      ipsToScan.push(`${subnet}.${i}`);
    }
  }

  // Reduced to 10 to prevent Capacitor bridge crashes
  const chunkSize = 10;
  for (let i = 0; i < ipsToScan.length; i += chunkSize) {
    const chunk = ipsToScan.slice(i, i + chunkSize);
    
    const promises = chunk.map(ip => new Promise<string | null>(async (resolve) => {
      try {
        // Tizen API endpoint for TV metadata
        const response = await CapacitorHttp.get({
          url: `http://${ip}:8001/api/v2/`,
          connectTimeout: 1500,
          readTimeout: 1500,
        });

        if (response.status === 200 && response.data) {
           const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
           if (data.device && (data.device.modelName || data.device.name)) {
             resolve(ip);
             return;
           }
        }
        resolve(null);
      } catch (error) {
        resolve(null);
      }
    }));

    const results = await Promise.all(promises);
    const foundIp = results.find(ip => ip !== null);
    if (foundIp) {
      return foundIp;
    }
  }

  return null;
}
