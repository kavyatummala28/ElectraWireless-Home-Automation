const express = require('express');
const cors = require('cors');
const createLgtv = require('lgtv2');
const fs = require('fs');
const path = require('path');

const KEY_FILE = path.join(process.cwd(), 'tv_key.json');

let savedKey = null;
if (fs.existsSync(KEY_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    savedKey = data.clientKey;
  } catch (e) {}
}

console.log('Starting LG TV Proxy Server...');

const lgtv = createLgtv({
  url: 'wss://192.168.31.68:3001',
  clientKey: savedKey,
  wsconfig: { tlsOptions: { rejectUnauthorized: false } },
  saveKey: (key) => {
    savedKey = key;
    fs.writeFileSync(KEY_FILE, JSON.stringify({ clientKey: key }));
    console.log('🔑 New LG TV Client Key saved successfully!');
  }
});

const app = express();
app.use(cors());
app.use(express.json());

lgtv.on('connect', () => {
  console.log('✅ Backend successfully connected and paired with LG TV!');
});

lgtv.on('error', err => {
  console.log('❌ LG TV Error:', err.message);
});

app.post('/api/tv/command', (req, res) => {
  const { uri, payload } = req.body;
  console.log('📥 Received command request from UI:', uri, payload || '');

  if (!uri) return res.status(400).send({ error: 'Missing URI' });

  const callback = (err, response) => {
    if (err) {
      console.log('❌ TV Command Error:', err.message);
      return res.status(500).send({ error: err.message });
    }
    console.log('✅ Command executed successfully on TV!', response);
    res.send({ status: 'success', response });
  };

  if (payload) {
    lgtv.request(uri, payload, callback);
  } else {
    lgtv.request(uri, callback);
  }
});

app.post('/api/tv/button', (req, res) => {
  const { name } = req.body;
  console.log('🕹️ Received button press from UI:', name);

  if (!name) return res.status(400).send({ error: 'Missing button name' });

  lgtv.getSocket('ssap://com.webos.service.networkinput/getPointerInputSocket', (err, sock) => {
    if (err) {
      console.log('❌ Pointer socket error:', err.message);
      return res.status(500).send({ error: err.message });
    }
    sock.send('button', { name });
    console.log('✅ Button sent to TV:', name);
    res.send({ status: 'success' });
  });
});

app.listen(3001, () => {
  console.log('🚀 Proxy Server running on http://localhost:3001');
});