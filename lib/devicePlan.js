// What the customer sees in the phone app's "My Plan" screen. Plan money and
// dates only: nothing about locks, SIMs, location or other device controls.

const pktToday = now => new Date(now + 5 * 3600000).toISOString().slice(0, 10);
const days = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
const money = v => Math.round(Number(v) || 0);
const paidOf = s => (s.amountPaid != null ? money(s.amountPaid) : money(s.amount));

export function planSummary(shopData, planId, now = Date.now()) {
  const plan = (shopData.plans || []).find(p => p && p.id === planId && !p._deleted);
  if (!plan) return null;
  const today = pktToday(now);
  const s = shopData.settings || {};
  const customer = (shopData.customers || []).find(c => c && c.id === plan.customerId) || {};
  const product = (shopData.products || []).find(p => p && p.id === plan.productId) || {};

  const schedule = (plan.schedule || []).filter(Boolean)
    .slice().sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.n - b.n))
    .map(x => {
      const late = !x.paid && x.dueDate && x.dueDate < today ? days(today, x.dueDate) : 0;
      return {
        n: x.n, dueDate: x.dueDate || '', amount: money(x.amount), paid: !!x.paid,
        paidDate: x.paid ? (x.paidDate || '') : '', paidAmount: x.paid ? paidOf(x) : 0,
        status: x.paid ? 'paid' : late > 0 ? 'late' : x.dueDate === today ? 'today' : 'upcoming',
        daysLate: late,
      };
    });

  const down = money(plan.down);
  const total = down + schedule.reduce((t, x) => t + x.amount, 0);
  const paid = down + schedule.reduce((t, x) => t + x.paidAmount, 0);
  const late = schedule.filter(x => x.status === 'late');
  const next = schedule.find(x => !x.paid) || null;
  const done = schedule.length > 0 && schedule.every(x => x.paid);

  return {
    shop: { name: s.businessName || s.shopName || '', phone: s.shopPhone || '' },
    customer: { name: customer.name || '' },
    product: { name: product.name || '', emoji: product.emoji || '' },
    voucherNo: plan.voucherNo || '',
    startDate: plan.startDate || '',
    status: done || plan.status === 'completed' ? 'completed' : late.length ? 'overdue' : next && next.status === 'today' ? 'due_today' : 'on_track',
    total, paid, remaining: Math.max(0, total - paid), down,
    paidCount: schedule.filter(x => x.paid).length, count: schedule.length,
    overdueAmount: late.reduce((t, x) => t + x.amount, 0), overdueCount: late.length,
    next: next ? { n: next.n, dueDate: next.dueDate, amount: next.amount, status: next.status } : null,
    schedule,
  };
}
