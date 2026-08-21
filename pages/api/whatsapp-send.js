export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, message, templateName, templateLang, templateParams } = req.body;
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return res.status(500).json({ error: 'WhatsApp API not configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID to .env.local' });
  }

  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (!cleaned || cleaned.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }
  if (!cleaned.startsWith('92') && cleaned.length === 10) cleaned = '92' + cleaned;
  if (!cleaned.startsWith('92') && cleaned.startsWith('0')) cleaned = '92' + cleaned.substring(1);

  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  let body;
  if (templateName) {
    body = {
      messaging_product: 'whatsapp',
      to: cleaned,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLang || 'en' },
        components: templateParams ? [{ type: 'body', parameters: templateParams.map(p => ({ type: 'text', text: String(p) })) }] : undefined,
      },
    };
  } else {
    body = {
      messaging_product: 'whatsapp',
      to: cleaned,
      type: 'text',
      text: { body: message || 'Reminder from Udhar Book' },
    };
  }

  try {
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: data.error?.message || 'WhatsApp API error', details: data });
    }
    return res.json({ ok: true, messageId: data.messages?.[0]?.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
