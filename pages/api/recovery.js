import { supabaseAdmin, SHOP_ID } from '../../lib/serverAuth';
import { requireRole, audit } from '../../lib/staff';
import { updateShopData } from '../../lib/shopData';
import { overdueList, applyCollection, pkToday } from '../../lib/recovery';

// Recovery agents (and the owner): the overdue field list, and recording a cash
// collection. Agents never get the shop data itself, only this trimmed view.
export default async function handler(req, res) {
  const me = await requireRole(req, res, ['agent', 'owner']);
  if (!me) return;

  if (req.method === 'GET') {
    const { data: shop } = await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single();
    const { data: devices } = await supabaseAdmin.from('devices').select('plan_id, status, last_lat, last_lng, last_loc_at').eq('shop_id', SHOP_ID);
    const d = (shop && shop.data) || {};
    const today = pkToday();
    const mine = [];
    (d.plans || []).forEach(pl => (pl.schedule || []).forEach(s => {
      if (s.paid && s.paidDate === today && s.collectedBy === me.name) mine.push({ voucher: pl.voucherNo || '', n: s.n, amount: s.amountPaid || s.amount });
    }));
    return res.json({ me: { name: me.name, role: me.role }, list: overdueList(d, devices || []), today: mine, shopName: (d.settings && d.settings.businessName) || 'Warraich Corporation' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { planId, ns } = req.body || {};
  if (!planId || !Array.isArray(ns) || !ns.length) return res.status(400).json({ error: 'planId and installments required' });
  let result = null;
  const r = await updateShopData((data) => {
    result = applyCollection(data, { planId, ns: ns.map(Number), agent: me.name });
    return result.data || null;
  });
  if (r.error) return res.status(500).json({ error: r.error });
  if (!result || result.reason) return res.status(409).json({ error: (result && result.reason) || 'nothing to collect' });
  await audit(me, [{ action: 'collect', entity: 'plan', entity_id: planId, summary: `Collected Rs ${result.total} (installment ${result.marked.join(', ')}) — ${result.plan.voucherNo || planId}`, details: { ns: result.marked, total: result.total } }]);
  const left = (result.plan.schedule || []).filter(s => !s.paid).reduce((t, s) => t + (s.amount || 0), 0);
  res.json({ ok: true, total: result.total, marked: result.marked, remaining: left });
}
