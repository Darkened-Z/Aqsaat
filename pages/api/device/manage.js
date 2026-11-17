import { supabaseAdmin, SHOP_ID, requireMember } from '../../../lib/serverAuth';
import { evaluate, unlockCode } from '../../../lib/deviceLock';

// Owner-only. GET lists devices with live status + today's unlock code.
// POST applies an action to one device.
export default async function handler(req, res) {
  if (!(await requireMember(req, res))) return;

  if (req.method === 'GET') {
    const { data: devices } = await supabaseAdmin
      .from('devices').select('*').eq('shop_id', SHOP_ID).order('created_at', { ascending: false });
    const { data: shop } = await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single();
    const d = (shop && shop.data) || {};
    const custName = id => (d.customers || []).find(c => c.id === id)?.name || '';
    const planLabel = id => { const p = (d.plans || []).find(x => x.id === id); return p ? (p.voucherNo || p.id) : ''; };

    const list = (devices || []).map(dev => ({
      id: dev.id, label: dev.label, status: dev.status, lockMode: dev.lock_mode,
      customer: custName(dev.customer_id), plan: planLabel(dev.plan_id),
      lastCheckin: dev.last_checkin, lastAction: dev.last_action,
      current: evaluate(dev, d).action,
      unlockCode: unlockCode(dev.secret),
    }));
    return res.json({ devices: list });
  }

  if (req.method === 'POST') {
    const { deviceId, action } = req.body || {};
    if (!deviceId || !action) return res.status(400).json({ error: 'deviceId and action required' });
    const patch = {
      lock:    { lock_mode: 'force_lock' },
      unlock:  { lock_mode: 'force_unlock' },
      auto:    { lock_mode: 'auto' },
      lost:    { status: 'lost' },
      release: { status: 'released', lock_mode: 'force_unlock' },
      active:  { status: 'active' },
    }[action];
    if (action === 'delete') {
      const { error } = await supabaseAdmin.from('devices').delete().eq('id', deviceId).eq('shop_id', SHOP_ID);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }
    if (!patch) return res.status(400).json({ error: 'unknown action' });
    const { error } = await supabaseAdmin.from('devices').update(patch).eq('id', deviceId).eq('shop_id', SHOP_ID);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
