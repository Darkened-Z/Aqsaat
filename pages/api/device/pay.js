import { requireMember } from '../../../lib/serverAuth';
import { updateShopData } from '../../../lib/shopData';
import { pokeDevices } from '../../../lib/fcm';

// Owner-only. Marks one installment paid so the phone won't auto-lock. Writes the
// same fields the main app writes (paid/paidDate/amountPaid/accountId), and bumps
// the plan's updatedAt so the union-by-id sync merge keeps this change. Account
// balances in the app are computed from these fields, so nothing else to touch.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireMember(req, res))) return;

  const { planId, n } = req.body || {};
  if (!planId || n == null) return res.status(400).json({ error: 'planId and n required' });

  let result = 'ok';
  const r = await updateShopData((data) => {
    const plans = data.plans || [];
    const pi = plans.findIndex(p => p && p.id === planId && !p._deleted);
    if (pi < 0) { result = 'no-plan'; return null; }
    const plan = plans[pi];
    const sched = (plan.schedule || []).slice();
    const si = sched.findIndex(s => s && s.n === n);
    if (si < 0) { result = 'no-inst'; return null; }
    if (sched[si].paid) { result = 'already'; return null; }
    const today = new Date().toISOString().slice(0, 10);
    const accId = (data.settings && data.settings.accounts && data.settings.accounts[0] && data.settings.accounts[0].id) || 'acc_cash';
    sched[si] = { ...sched[si], paid: true, paidDate: today, amountPaid: sched[si].amount, lateFeeCharged: 0, accountId: accId, status: 'paid' };
    plans[pi] = { ...plan, schedule: sched, updatedAt: new Date().toISOString() };
    data.plans = plans;
    return data;
  });
  if (r.error) return res.status(500).json({ error: r.error });
  if (result === 'no-plan') return res.status(404).json({ error: 'plan not found' });
  if (result === 'no-inst') return res.status(404).json({ error: 'installment not found' });
  if (result === 'already') return res.json({ ok: true, already: true });
  await pokeDevices({ planId });
  res.json({ ok: true });
}
