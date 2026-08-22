const { Client, LocalAuth } = require('whatsapp-web.js');

let client = null;
let qrCode = null;
let status = 'disconnected';
let statusMessage = '';

function getClient() {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
  });

  client.on('qr', (qr) => {
    qrCode = qr;
    status = 'qr';
    statusMessage = 'Scan QR code to connect WhatsApp';
  });

  client.on('ready', () => {
    qrCode = null;
    status = 'ready';
    statusMessage = 'WhatsApp connected!';
    console.log('[WhatsApp] Client ready');
  });

  client.on('authenticated', () => {
    status = 'authenticated';
    statusMessage = 'Authenticated, loading chats...';
    console.log('[WhatsApp] Authenticated');
  });

  client.on('auth_failure', (msg) => {
    status = 'error';
    statusMessage = 'Auth failed: ' + msg;
    console.error('[WhatsApp] Auth failure:', msg);
  });

  client.on('disconnected', (reason) => {
    status = 'disconnected';
    statusMessage = 'Disconnected: ' + reason;
    client = null;
    console.log('[WhatsApp] Disconnected:', reason);
  });

  client.initialize().catch(err => {
    status = 'error';
    statusMessage = 'Init error: ' + err.message;
    console.error('[WhatsApp] Init error:', err);
  });

  return client;
}

function getStatus() {
  return { status, message: statusMessage, hasQR: !!qrCode };
}

function getQR() {
  return qrCode;
}

async function sendMessage(phone, message) {
  if (status !== 'ready') {
    return { ok: false, error: 'WhatsApp not connected. Status: ' + status };
  }

  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.length === 10) cleaned = '92' + cleaned;
  if (cleaned.startsWith('0')) cleaned = '92' + cleaned.substring(1);

  const chatId = cleaned + '@c.us';

  try {
    const msg = await client.sendMessage(chatId, message);
    return { ok: true, messageId: msg.id._serialized };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function disconnect() {
  if (client) {
    try { await client.destroy(); } catch (e) {}
    client = null;
    status = 'disconnected';
    statusMessage = 'Disconnected';
    qrCode = null;
  }
}

module.exports = { getClient, getStatus, getQR, sendMessage, disconnect };
