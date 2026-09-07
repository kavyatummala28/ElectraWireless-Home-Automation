import { CapacitorHttp } from '@capacitor/core';

export const PANASONIC_KEYS = {
  POWER: 'NRC_POWER-ONOFF',
  VOL_UP: 'NRC_VOLUP-ONOFF',
  VOL_DOWN: 'NRC_VOLDOWN-ONOFF',
  CH_UP: 'NRC_CH_UP-ONOFF',
  CH_DOWN: 'NRC_CH_DOWN-ONOFF',
  UP: 'NRC_UP-ONOFF',
  DOWN: 'NRC_DOWN-ONOFF',
  LEFT: 'NRC_LEFT-ONOFF',
  RIGHT: 'NRC_RIGHT-ONOFF',
  OK: 'NRC_ENTER-ONOFF',
  RETURN: 'NRC_RETURN-ONOFF',
  MUTE: 'NRC_MUTE-ONOFF',
  SOURCE: 'NRC_CHG_INPUT-ONOFF',
  APPS: 'NRC_APPS-ONOFF',
  HOME: 'NRC_HOME-ONOFF',
  RED: 'NRC_RED-ONOFF',
  GREEN: 'NRC_GREEN-ONOFF',
  YELLOW: 'NRC_YELLOW-ONOFF',
  BLUE: 'NRC_BLUE-ONOFF',
  NUM_0: 'NRC_D0-ONOFF',
  NUM_1: 'NRC_D1-ONOFF',
  NUM_2: 'NRC_D2-ONOFF',
  NUM_3: 'NRC_D3-ONOFF',
  NUM_4: 'NRC_D4-ONOFF',
  NUM_5: 'NRC_D5-ONOFF',
  NUM_6: 'NRC_D6-ONOFF',
  NUM_7: 'NRC_D7-ONOFF',
  NUM_8: 'NRC_D8-ONOFF',
  NUM_9: 'NRC_D9-ONOFF',
};

// Generates the SOAP XML payload required by Panasonic TVs
function generateSoapPayload(keyCommand: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
 <s:Body>
  <u:X_SendKey xmlns:u="urn:panasonic-com:service:p00NetworkControl:1">
   <X_KeyEvent>${keyCommand}</X_KeyEvent>
  </u:X_SendKey>
 </s:Body>
</s:Envelope>`;
}

/**
 * Sends a command to the Panasonic TV.
 */
export async function sendPanasonicCommand(ip: string, keyCommand: string): Promise<boolean> {
  const url = `http://${ip}:55000/nrc/control_0`;
  const xmlPayload = generateSoapPayload(keyCommand);

  try {
    // Native HTTP request via Capacitor (Bypasses CORS entirely)
    const response = await CapacitorHttp.post({
      url,
      headers: {
        'Content-Type': 'text/xml; charset="utf-8"',
        'SOAPACTION': '"urn:panasonic-com:service:p00NetworkControl:1#X_SendKey"'
      },
      data: xmlPayload,
      connectTimeout: 3000,
      readTimeout: 3000,
    });
    
    // As long as the TV responds (even with a 200 OK), the command was sent.
    return response.status === 200;
  } catch (error) {
    console.error("Failed to send command to Panasonic TV:", error);
    return false;
  }
}

import { getLocalSubnet } from "./network";

/**
 * Sweeps the local network to find Panasonic Smart TVs.
 * Returns the IP address if found, otherwise null.
 */
export async function autoDiscoverPanasonicTV(): Promise<string | null> {
  const localSubnet = await getLocalSubnet();
  const subnetsToScan = localSubnet ? [localSubnet] : ['192.168.1', '192.168.0', '192.168.29', '192.168.31', '192.168.50', '10.0.0'];
  
  // Create an array of IPs to scan
  const ipsToScan: string[] = [];
  
  for (const subnet of subnetsToScan) {
    for (let i = 2; i <= 254; i++) {
      ipsToScan.push(`${subnet}.${i}`);
    }
  }

  // We chunk the requests so we don't overwhelm the mobile networking stack
  // Reduced to 10 to prevent Capacitor bridge crashes
  const chunkSize = 10;
  
  for (let i = 0; i < ipsToScan.length; i += chunkSize) {
    const chunk = ipsToScan.slice(i, i + chunkSize);
    
    const promises = chunk.map(ip => new Promise<string | null>(async (resolve) => {
      try {
        // We ping the Panasonic API port with a GET request.
        // A real Panasonic TV will immediately respond with 200 OK or 400 Bad Request to a GET on this port,
        // while dead IPs will timeout.
        const res = await CapacitorHttp.get({
          url: `http://${ip}:55000/nrc/sdd_0000.xml`,
          connectTimeout: 1500,
          readTimeout: 1500,
        });
        
        if (res.status >= 200 && res.status < 500) {
          resolve(ip);
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    }));

    // Wait for the first success in this chunk, or for all to fail
    const results = await Promise.all(promises);
    const foundIp = results.find(ip => ip !== null);
    
    if (foundIp) {
      return foundIp;
    }
  }

  return null;
}
