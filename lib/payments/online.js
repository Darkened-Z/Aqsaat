import crypto from 'crypto';
import { supabaseAdmin, SHOP_ID } from '../serverAuth';
import { updateShopData } from '../shopData';
import { pokeDevices } from '../fcm';
import { config, inquire } from './jazzcash';

const ACC_ID = 'acc_jazzcash';

// Public link the lock screen shows (QR / in-app). Signed with the device secret
// so ids can't be guessed into other customers' pages.
export function payToken(device) {
  const sig = crypto.createHmac('sha256', String(device.secret)).update('pay:' + device.id).digest('hex').slice(0, 20);
  return device.id + '.' + sig;
}

export function payUrl(host, device) {
  return `https://${host}/pay/${payToken(device)}`;
}

export async function deviceFromToken(token) {
  const [id, sig] = String(token || '').split('.');
  if (!id || !sig) return null;
  const { data: device } = await supabaseAdmin.from('devices').select('*').eq('id', id).eq('shop_id', SHOP_ID).maybeSingle();
  if (!device || device.status === 'deleted' || device.status === 'released') return null;
  const want = payToken(device).split('.')[1];
  return sig.length === want.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want)) ? device : null;
}

// What the customer owes right now: every unpaid installment due today or earlier,
// oldest first. Late fees are left to the counter.
export function dueNow(plan, now = Date.now()) {
  if (!plan) return { amount: 0, installments: [] };
  const today = new Date(now + 5 * 3600000).toISOString().slice(0, 10);
  const due = (plan.schedule || [])
    .filter(s => s && !s.paid && s.dueDate && s.dueDate <= today)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.n - b.n));
  return { amount: Math.round(due.reduce((t, s) => t + (Number(s.amount) || 0), 0)), installments: due.map(s => s.n) };
}

export function planOf(shopData, planId) {
  return (shopData.plans || []).find(p => p && p.id === planId && !p._deleted) || null;
}

export async function loadShop() {
  const { data } = await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single();
  return (data && data.data) || {};
}

// Marks the payment's installments paid into the JazzCash account. Idempotent:
// only the caller that moves the row out of 'pending' writes the shop data, and
// installments already marked paid at the counter are left alone.
export async function settle(payment, { code, message }) {
  const { data: claimed } = await supabaseAdmin.from('payments')
    .update({ status: 'applying', response_code: code || null, response_msg: message || null })
    .eq('id', payment.id).eq('status', 'pending').select('id');
  if (!claimed || !claimed.length) return 'already';

  const nowIso = new Date().toISOString();
  const today = new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10);
  let credit = 0;
  const r = await updateShopData((data) => {
    const settings = { ...(data.settings || {}) };
    const accounts = (settings.accounts || []).slice();
    if (!accounts.some(a => a && a.id === ACC_ID && !a._deleted)) {
      const i = accounts.findIndex(a => a && a.id === ACC_ID);
      const acc = { id: ACC_ID, name: 'JazzCash (online)', nameUr: 'جاز کیش', emoji: '📲', balance: 0, updatedAt: nowIso };
      if (i >= 0) accounts[i] = acc; else accounts.push(acc);
      settings.accounts = accounts;
      data.settings = settings;
    }
    const plans = (data.plans || []).slice();
    const pi = plans.findIndex(p => p && p.id === payment.plan_id && !p._deleted);
    if (pi < 0) { credit = payment.amount; return data; }
    // Normally exactly the installments quoted. If the counter took some of them
    // meanwhile, the money goes to the next unpaid ones instead; any remainder is
    // recorded on the payment row as credit for the shop to settle.
    const want = new Set(payment.installments);
    const unpaid = (plans[pi].schedule || []).filter(s => s && !s.paid)
      .sort((a, b) => (want.has(b.n) - want.has(a.n)) || (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.n - b.n));
    let left = payment.amount;
    const take = new Set();
    for (const s of unpaid) {
      const amt = Number(s.amount) || 0;
      if (amt > left) break;
      take.add(s.n); left -= amt;
    }
    credit = left;
    const sched = (plans[pi].schedule || []).map(s =>
      s && take.has(s.n)
        ? { ...s, paid: true, paidDate: today, amountPaid: s.amount, lateFeeCharged: 0, accountId: ACC_ID, status: 'paid', paidOnline: payment.txn_ref }
        : s);
    plans[pi] = { ...plans[pi], schedule: sched, updatedAt: nowIso };
    data.plans = plans;
    return data;
  });
  if (r.error) {
    await supabaseAdmin.from('payments').update({ status: 'pending' }).eq('id', payment.id);
    return 'retry';
  }
  await supabaseAdmin.from('payments').update({ status: 'paid', paid_at: nowIso, credit }).eq('id', payment.id);
  await pokeDevices({ planId: payment.plan_id });
  return 'paid';
}

// Confirms a pending payment with JazzCash and settles it. Used by the return
// URL and by check-in (customer closed the browser before the redirect).
export async function confirm(payment) {
  const cfg = config();
  if (!cfg || payment.status !== 'pending') return payment.status;
  const q = await inquire(cfg, payment.txn_ref);
  if (q.error) return 'pending';
  if (q.amount && Number(q.amount) !== payment.amount * 100) return 'pending';
  if (q.paid) return settle(payment, q);
  const ageMs = Date.now() - Date.parse(payment.created_at);
  if (q.code && ageMs > 24 * 3600000) {
    await supabaseAdmin.from('payments').update({ status: 'failed', response_code: q.code, response_msg: q.message }).eq('id', payment.id).eq('status', 'pending');
    return 'failed';
  }
  return 'pending';
}

export async function confirmPendingFor(deviceId) {
  if (!config()) return [];
  const since = new Date(Date.now() - 2 * 86400000).toISOString();
  const { data } = await supabaseAdmin.from('payments').select('*')
    .eq('device_id', deviceId).eq('status', 'pending').gte('created_at', since).limit(3);
  const out = [];
  for (const p of data || []) out.push(await confirm(p));
  return out;
}
