import { createClient } from '@supabase/supabase-js';

const SHOP_ID = 'aqsat-main';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    return res.status(500).json({ error: 'WhatsApp API not configured' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient('https://ujxrxbzglcsyppwoazll.supabase.co', serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const { data: shop } = await supabase.from('shops').select('data').eq('id', SHOP_ID).single();
  if (!shop) return res.status(404).json({ error: 'Shop data not found' });

  const d = shop.data;
  const entries = (d.udpiEntries || []).filter(u => !u._deleted);
  const customers = (d.customers || []).filter(c => !c._deleted);
  const settings = d.settings || {};
  const udharMeta = settings.udharMeta || {};
  const today = new Date().toISOString().split('T')[0];

  const people = {};
  entries.forEach(u => {
    const name = u.person.trim();
    if (!people[name]) people[name] = { name, lent: 0, borrowed: 0, pending: [] };
    if (u.direction === 'lent' && !u.returned) {
      const remaining = u.amount - (u.returnedAmount || 0);
      people[name].lent += remaining;
      people[name].pending.push({ note: u.note, amount: remaining, dueDate: u.dueDate });
    }
    if (u.direction === 'borrowed' && !u.returned) {
      people[name].borrowed += u.amount - (u.returnedAmount || 0);
    }
  });

  const results = [];
  const targets = req.body.targets || 'auto';

  let toRemind = [];
  if (targets === 'auto') {
    Object.values(people).forEach(p => {
      const meta = udharMeta[p.name] || {};
      const balance = p.lent - p.borrowed;
      if (balance <= 0) return;
      const hasReminderDue = meta.reminderDate && meta.reminderDate <= today;
      const hasOverdue = p.pending.some(e => e.dueDate && e.dueDate < today);
      if (hasReminderDue || hasOverdue) {
        const customer = customers.find(c => c.name.toLowerCase() === p.name.toLowerCase());
        if (customer && customer.phone) {
          toRemind.push({ ...p, phone: customer.phone, balance, meta });
        }
      }
    });
  } else if (Array.isArray(targets)) {
    targets.forEach(t => {
      const p = people[t.name];
      if (p) {
        const balance = p.lent - p.borrowed;
        toRemind.push({ ...p, phone: t.phone, balance, meta: udharMeta[t.name] || {} });
      }
    });
  }

  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const fmtPKR = n => 'Rs ' + Math.round(n).toLocaleString('en-PK');

  for (const person of toRemind) {
    let cleaned = person.phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) cleaned = '92' + cleaned;
    if (cleaned.startsWith('0')) cleaned = '92' + cleaned.substring(1);

    const message = `Assalam-o-Alaikum ${person.name},\n\n` +
      `Yaddhani / Reminder:\n` +
      `Aap per ${fmtPKR(person.balance)} baqaya hain.\n\n` +
      person.pending.slice(0, 5).map(e =>
        `• ${e.note || 'Amount'}: ${fmtPKR(e.amount)}${e.dueDate ? ' (due: ' + e.dueDate + ')' : ''}`
      ).join('\n') +
      `\n\nBara-e-karam jaldi ada karen.\nShukriya! 🙏`;

    try {
      const resp = await fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleaned,
          type: 'text',
          text: { body: message },
        }),
      });
      const data = await resp.json();
      results.push({ name: person.name, phone: cleaned, ok: resp.ok, messageId: data.messages?.[0]?.id, error: data.error?.message });
    } catch (err) {
      results.push({ name: person.name, phone: cleaned, ok: false, error: err.message });
    }
  }

  res.json({ sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results });
}
