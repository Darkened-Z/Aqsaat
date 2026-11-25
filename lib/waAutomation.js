// WhatsApp automation pack: decides which messages are due right now. Pure — the
// bot (lib/whatsapp.js) sends them and records what went out; the /automation page
// uses the same function to preview. Times are Pakistan time (UTC+5, no DST).

const DEFAULTS = {
  enabled: false,
  reminders: true,      // 3 days before, on the due date, and 3 days late
  receipts: true,       // when an installment is marked paid
  monthly: true,        // statement to every active customer on the 1st
  ownerSummary: true,   // nightly summary to the owner
  ownerPhone: '',
  reminderHour: 10,
  summaryHour: 21,
  maxPerRun: 40,        // keeps a single run well under WhatsApp's spam radar
};

const PK_OFFSET = 5 * 3600000;
const pkDate = ms => new Date(ms + PK_OFFSET).toISOString().slice(0, 10);
const pkHour = ms => new Date(ms + PK_OFFSET).getUTCHours();
const addDays = (ymd, n) => new Date(Date.parse(ymd + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const fmt = n => 'Rs ' + Math.round(n || 0).toLocaleString('en-PK');

function config(settings) {
  return { ...DEFAULTS, ...((settings && settings.waAuto) || {}) };
}

function planCreatedMs(pl) {
  if (pl.createdAt) return Date.parse(pl.createdAt);
  const m = /^pl_([0-9a-z]+)$/.exec(pl.id || '');
  return m ? parseInt(m[1], 36) : 0;
}

function planMoney(pl) {
  const sched = pl.schedule || [];
  const total = sched.reduce((t, s) => t + (s.amount || 0), 0);
  const paid = sched.filter(s => s.paid).reduce((t, s) => t + (s.amountPaid != null ? s.amountPaid : s.amount || 0), 0);
  return { total, paid, remaining: Math.max(0, total - paid), paidCount: sched.filter(s => s.paid).length, count: sched.length };
}

/**
 * @returns {{ messages: {key,kind,phone,text}[], state }} — state is the updated sent
 * log minus pruned keys; the caller marks a key sent only after a successful send.
 */
function buildQueue(shop, prevState, now = Date.now()) {
  const settings = shop.settings || {};
  const cfg = config(settings);
  const state = { baseline: !!(prevState && prevState.baseline), sent: { ...((prevState && prevState.sent) || {}) } };
  const messages = [];
  if (!cfg.enabled) return { messages, state };

  const today = pkDate(now);
  const hour = pkHour(now);
  const shopName = settings.businessName || settings.shopName || 'Warraich Corporation';
  const customers = new Map((shop.customers || []).filter(c => !c._deleted).map(c => [c.id, c]));
  const products = new Map((shop.products || []).filter(p => !p._deleted).map(p => [p.id, p]));
  const plans = (shop.plans || []).filter(p => !p._deleted);
  const active = plans.filter(p => p.status !== 'completed');
  const push = (key, kind, phone, text) => { if (!state.sent[key] && phone) messages.push({ key, kind, phone, text }); };

  // First run: everything already paid counts as receipted, so turning the pack on
  // doesn't send receipts for the shop's whole history.
  if (!state.baseline) {
    plans.forEach(pl => (pl.schedule || []).forEach(s => { if (s.paid) state.sent[`rcpt:${pl.id}:${s.n}`] = today; }));
    state.baseline = true;
  }

  if (cfg.receipts) {
    for (const pl of plans) {
      const c = customers.get(pl.customerId);
      if (!c || !c.phone) continue;
      const m = planMoney(pl);
      for (const s of pl.schedule || []) {
        if (!s.paid || !s.paidDate || daysBetween(s.paidDate, today) > 3) continue;
        const prod = products.get(pl.productId);
        const next = (pl.schedule || []).find(x => !x.paid);
        push(`rcpt:${pl.id}:${s.n}`, 'receipt', c.phone,
          `✅ *${shopName}* — Payment received / ادائیگی موصول\n\n` +
          `${c.name}\n📦 ${prod ? prod.name : 'Product'}${pl.voucherNo ? ' · ' + pl.voucherNo : ''}\n` +
          `💳 Installment ${s.n}/${m.count}: *${fmt(s.amountPaid != null ? s.amountPaid : s.amount)}* on ${s.paidDate}\n` +
          `📊 Paid ${m.paidCount}/${m.count} · Remaining ${fmt(m.remaining)}\n` +
          (next && next.dueDate ? `📅 Next: ${fmt(next.amount)} due ${next.dueDate}\n` : '🎉 All installments paid!\n') +
          `\nشکریہ 🙏`);
      }
    }
  }

  if (cfg.reminders && hour >= cfg.reminderHour) {
    for (const pl of active) {
      const c = customers.get(pl.customerId);
      if (!c || !c.phone) continue;
      const s = (pl.schedule || []).find(x => !x.paid);
      if (!s || !s.dueDate) continue;
      const d = daysBetween(today, s.dueDate);
      const kind = d === 3 ? 'due3' : d === 0 ? 'due0' : d === -3 ? 'late3' : null;
      if (!kind) continue;
      const prod = products.get(pl.productId);
      const line = kind === 'due3' ? '📌 3 دن باقی / due in 3 days' : kind === 'due0' ? '📌 آج واجب الادا ہے / due today' : '⚠️ 3 دن اوورڈیو / 3 days overdue';
      push(`${kind}:${pl.id}:${s.n}`, kind, c.phone,
        `السلام وعلیکم ${c.name}! 🙏\n\n*${shopName}* — قسط یاد دہانی\n\n` +
        `📦 ${prod ? prod.name : 'Product'}\n💳 Installment ${s.n}/${(pl.schedule || []).length}\n` +
        `💰 ${fmt(s.amount)}\n📅 ${s.dueDate}\n${line}\n` +
        (pl.voucherNo ? `🔖 ${pl.voucherNo}\n` : '') + `\nبراہ کرم بروقت ادائیگی کریں۔ شکریہ`);
    }
  }

  if (cfg.monthly && today.endsWith('-01') && hour >= cfg.reminderHour) {
    const month = today.slice(0, 7);
    for (const pl of active) {
      const c = customers.get(pl.customerId);
      if (!c || !c.phone) continue;
      const m = planMoney(pl);
      if (!m.remaining) continue;
      const prod = products.get(pl.productId);
      const next = (pl.schedule || []).find(x => !x.paid);
      const overdue = (pl.schedule || []).filter(x => !x.paid && x.dueDate && x.dueDate < today);
      push(`stmt:${pl.id}:${month}`, 'monthly', c.phone,
        `📊 *${shopName}* — Monthly statement / ماہانہ حساب (${month})\n\n${c.name}\n📦 ${prod ? prod.name : 'Product'}${pl.voucherNo ? ' · ' + pl.voucherNo : ''}\n\n` +
        `Total: ${fmt(m.total)}\nPaid: ${fmt(m.paid)} (${m.paidCount}/${m.count})\nRemaining: *${fmt(m.remaining)}*\n` +
        (overdue.length ? `⚠️ Overdue: ${overdue.length} (${fmt(overdue.reduce((t, x) => t + (x.amount || 0), 0))})\n` : '') +
        (next && next.dueDate ? `📅 Next due: ${fmt(next.amount)} on ${next.dueDate}\n` : '') + `\nشکریہ 🙏`);
    }
  }

  if (cfg.ownerSummary && cfg.ownerPhone && hour >= cfg.summaryHour) {
    let collected = 0, collectedN = 0, overdueAmt = 0;
    const overduePlans = new Set();
    let dueTomorrow = 0, dueTomorrowN = 0;
    const tomorrow = addDays(today, 1);
    for (const pl of plans) {
      for (const s of pl.schedule || []) {
        if (s.paid && s.paidDate === today) { collected += s.amountPaid != null ? s.amountPaid : s.amount || 0; collectedN++; }
        if (!s.paid && s.dueDate && s.dueDate < today && pl.status !== 'completed') { overdueAmt += s.amount || 0; overduePlans.add(pl.id); }
        if (!s.paid && s.dueDate === tomorrow) { dueTomorrow += s.amount || 0; dueTomorrowN++; }
      }
    }
    const startMs = Date.parse(today + 'T00:00:00Z') - PK_OFFSET;
    const newPlans = plans.filter(pl => { const t = planCreatedMs(pl); return t >= startMs && t < startMs + 86400000; });
    push(`owner:${today}`, 'owner', cfg.ownerPhone,
      `🌙 *${shopName}* — Daily summary ${today}\n\n` +
      `💰 Collected today: *${fmt(collected)}* (${collectedN} installment${collectedN === 1 ? "" : "s"})\n` +
      `🆕 New plans: ${newPlans.length}${newPlans.length ? ' (' + fmt(newPlans.reduce((t, p) => t + (p.total || 0), 0)) + ')' : ''}\n` +
      `⚠️ Overdue plans: ${overduePlans.size} (${fmt(overdueAmt)})\n` +
      `📅 Due tomorrow: ${dueTomorrowN} (${fmt(dueTomorrow)})`);
  }

  // Forget keys older than 60 days; receipts older than 3 days never re-qualify.
  const cutoff = addDays(today, -60);
  for (const k of Object.keys(state.sent)) if (state.sent[k] < cutoff) delete state.sent[k];

  return { messages: messages.slice(0, cfg.maxPerRun), state, pending: messages.length };
}

module.exports = { buildQueue, config, DEFAULTS, pkDate };
