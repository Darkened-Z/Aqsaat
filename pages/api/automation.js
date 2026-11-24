import { requireMember } from '../../lib/serverAuth';
import { updateShopData } from '../../lib/shopData';
import { supabaseAdmin, SHOP_ID } from '../../lib/serverAuth';
import { config, DEFAULTS } from '../../lib/waAutomation';

const BOOLS = ['enabled', 'reminders', 'receipts', 'monthly', 'ownerSummary'];

// Owner-only. Reads/saves the WhatsApp automation settings (settings.waAuto). The
// shop-PC bot picks them up on its next 5-minute run.
export default async function handler(req, res) {
  if (!(await requireMember(req, res))) return;
  if (req.method === 'GET') {
    const { data } = await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single();
    return res.json({ config: config(((data && data.data) || {}).settings) });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};
  const next = { updatedAt: new Date().toISOString() };
  BOOLS.forEach(k => { next[k] = typeof b[k] === 'boolean' ? b[k] : DEFAULTS[k]; });
  next.ownerPhone = String(b.ownerPhone || '').replace(/[^0-9+]/g, '').slice(0, 16);
  next.reminderHour = Math.min(22, Math.max(7, parseInt(b.reminderHour, 10) || DEFAULTS.reminderHour));
  next.summaryHour = Math.min(23, Math.max(12, parseInt(b.summaryHour, 10) || DEFAULTS.summaryHour));
  const r = await updateShopData(d => ({ ...d, settings: { ...(d.settings || {}), waAuto: next } }));
  if (r.error) return res.status(500).json({ error: r.error });
  res.json({ ok: true, config: config({ waAuto: next }) });
}
