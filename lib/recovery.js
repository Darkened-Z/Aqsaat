// Recovery-agent field list: who is overdue, how much, where to find them.
const PK = 5 * 3600000;
export const pkToday = (now = Date.now()) => new Date(now + PK).toISOString().slice(0, 10);
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

export const RECOVERY_ACC = 'acc_recovery';

export function overdueList(shop, devices = [], now = Date.now()) {
  const today = pkToday(now);
  const customers = new Map((shop.customers || []).filter(c => !c._deleted).map(c => [c.id, c]));
  const products = new Map((shop.products || []).filter(p => !p._deleted).map(p => [p.id, p]));
  const devByPlan = new Map();
  devices.filter(d => d.status !== 'deleted' && d.status !== 'released').forEach(d => {
    const cur = devByPlan.get(d.plan_id);
    if (d.last_lat != null && (!cur || (d.last_loc_at || '') > (cur.last_loc_at || ''))) devByPlan.set(d.plan_id, d);
  });
  const out = [];
  for (const pl of shop.plans || []) {
    if (!pl || pl._deleted || pl.status === 'completed') continue;
    const due = (pl.schedule || []).filter(s => !s.paid && s.dueDate && s.dueDate < today)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    if (!due.length) continue;
    const c = customers.get(pl.customerId) || {};
    const dev = devByPlan.get(pl.id);
    out.push({
      planId: pl.id, voucher: pl.voucherNo || '', product: (products.get(pl.productId) || {}).name || '',
      customer: { name: c.name || '?', phone: c.phone || '', altPhone: c.altPhone || '', address: c.address || '', area: c.area || c.city || '', city: c.city || '' },
      guarantor: c.guarantor && c.guarantor.phone ? { name: c.guarantor.name || '', phone: c.guarantor.phone } : null,
      overdue: due.map(s => ({ n: s.n, amount: s.amount || 0, dueDate: s.dueDate })),
      overdueAmount: due.reduce((t, s) => t + (s.amount || 0), 0),
      daysLate: days(due[0].dueDate, today),
      location: dev ? { lat: dev.last_lat, lng: dev.last_lng, at: dev.last_loc_at } : null,
    });
  }
  return out.sort((a, b) => a.customer.area.localeCompare(b.customer.area) || b.daysLate - a.daysLate);
}

/** Marks the chosen overdue installments paid as an agent's field collection. Mutates nothing; returns new data or a reason. */
export function applyCollection(data, { planId, ns, agent, now = Date.now() }) {
  const plans = (data.plans || []).slice();
  const pi = plans.findIndex(p => p && p.id === planId && !p._deleted);
  if (pi < 0) return { reason: 'plan not found' };
  const want = new Set(ns);
  const today = pkToday(now);
  let total = 0;
  const marked = [];
  const sched = (plans[pi].schedule || []).map(s => {
    if (!s || !want.has(s.n) || s.paid) return s;
    total += s.amount || 0; marked.push(s.n);
    return { ...s, paid: true, paidDate: today, amountPaid: s.amount, lateFeeCharged: 0, accountId: RECOVERY_ACC, status: 'paid', collectedBy: agent };
  });
  if (!marked.length) return { reason: 'already paid' };
  const nowIso = new Date(now).toISOString();
  plans[pi] = { ...plans[pi], schedule: sched, status: sched.every(s => s.paid) ? 'completed' : plans[pi].status, updatedAt: nowIso };
  const settings = { ...(data.settings || {}) };
  const accounts = (settings.accounts || []).slice();
  if (!accounts.some(a => a && a.id === RECOVERY_ACC && !a._deleted)) {
    const acc = { id: RECOVERY_ACC, name: 'Recovery (field cash)', nameUr: 'ریکوری', emoji: '🛵', balance: 0, updatedAt: nowIso };
    const i = accounts.findIndex(a => a && a.id === RECOVERY_ACC);
    if (i >= 0) accounts[i] = acc; else accounts.push(acc);
    settings.accounts = accounts;
  }
  return { data: { ...data, plans, settings }, total, marked, plan: plans[pi] };
}
