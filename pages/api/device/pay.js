import { supabaseAdmin, SHOP_ID, requireMember } from '../../../lib/serverAuth';

// Owner-only. Marks one installment paid so the phone won't auto-lock. Writes the
// same fields the main app writes (paid/paidDate/amountPaid/accountId), and bumps
// the plan's updatedAt so the union-by-id sync merge keeps this change. Account
// balances in the app are computed from these fields, so nothing else to touch.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireMember(req, res))) return;

  const { planId, n } = req.body || {};
  if (!planId || n == null) return res.status(400).json({ error: 'planId and n required' });

  const { data: shop } = await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single();
  const data = (shop && shop.data) || {};
  const plans = data.plans || [];
  const pi = plans.findIndex(p => p && p.id === planId && !p._deleted);
  if (pi < 0) return res.status(404).json({ error: 'plan not found' });

  const plan = plans[pi];
  const sched = (plan.schedule || []).slice();
  const si = sched.findIndex(s => s && s.n === n);
  if (si < 0) return res.status(404).json({ error: 'installment not found' });
  if (sched[si].paid) return res.json({ ok: true, already: true });

  const today = new Date().toISOString().slice(0, 10);
  const accId = (data.settings && data.settings.accounts && data.settings.accounts[0] && data.settings.accounts[0].id) || 'acc_cash';
  sched[si] = { ...sched[si], paid: true, paidDate: today, amountPaid: sched[si].amount, lateFeeCharged: 0, accountId: accId, status: 'paid' };

  plans[pi] = { ...plan, schedule: sched, updatedAt: new Date().toISOString() };
  data.plans = plans;

  const { error } = await supabaseAdmin.from('shops').update({ data }).eq('id', SHOP_ID);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
}
