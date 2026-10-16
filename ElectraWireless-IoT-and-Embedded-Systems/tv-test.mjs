import WebSocket from "ws";

const url = process.argv[2] || "wss://192.168.0.119:3001";
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const ws = new WebSocket(url, { rejectUnauthorized: false, handshakeTimeout: 15000 });

ws.on("open", () => {
  log("OPEN - press ALLOW on the TV when the popup appears");
  ws.send(JSON.stringify({
    type: "register",
    id: "register_0",
    payload: {
      forcePairing: false,
      pairingType: "PROMPT",
      manifest: {
        manifestVersion: 1,
        permissions: ["CONTROL_POWER", "CONTROL_AUDIO", "CONTROL_MOUSE_AND_KEYBOARD", "LAUNCH"],
      },
    },
  }));
});
ws.on("message", (d) => log("MSG:", d.toString()));
ws.on("error", (e) => log("ERR:", e.message));
ws.on("close", (c) => { log("CLOSE:", c); process.exit(); });
setTimeout(() => process.exit(), 90000);