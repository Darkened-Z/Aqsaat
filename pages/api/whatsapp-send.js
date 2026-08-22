const wa = require('../../lib/whatsapp');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message required' });
  }

  const status = wa.getStatus();
  if (status.status !== 'ready') {
    return res.status(503).json({ error: 'WhatsApp not connected', status: status.status, message: status.message });
  }

  const result = await wa.sendMessage(phone, message);
  if (result.ok) {
    return res.json({ ok: true, messageId: result.messageId });
  } else {
    return res.status(500).json({ error: result.error });
  }
}
