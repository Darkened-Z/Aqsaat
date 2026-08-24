const wa = require('../../lib/whatsapp');
const QRCode = require('qrcode');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const status = wa.getStatus();
    const qrRaw = wa.getQR();
    let qrDataUrl = null;

    if (qrRaw) {
      try {
        qrDataUrl = await QRCode.toDataURL(qrRaw, { width: 256, margin: 2 });
      } catch (e) {
        qrDataUrl = null;
      }
    }

    return res.json({ ...status, qr: qrDataUrl });
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'connect') {
      wa.getClient();
      return res.json({ ok: true, message: 'Connecting... refresh for QR code' });
    }

    if (action === 'disconnect') {
      await wa.disconnect();
      return res.json({ ok: true, message: 'Disconnected' });
    }

    if (action === 'bot-toggle') {
      const enabled = wa.setBotEnabled(req.body.enabled !== false);
      return res.json({ ok: true, botEnabled: enabled });
    }

    if (action === 'bot-log') {
      return res.json({ ok: true, log: wa.getBotLog() });
    }

    if (action === 'send-reminders') {
      const result = await wa.sendBulkReminders();
      return res.json(result);
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
