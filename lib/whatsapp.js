const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@supabase/supabase-js');

let client = null;
let qrCode = null;
let status = 'disconnected';
let statusMessage = '';
let botEnabled = true;
let botLog = [];

const SHOP_ID = 'aqsat-main';
const SUPABASE_URL = 'https://ujxrxbzglcsyppwoazll.supabase.co';

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(SUPABASE_URL, key);
}

async function getShopData() {
  const sb = getSupabase();
  const { data } = await sb.from('shops').select('data').eq('id', SHOP_ID).single();
  return data ? data.data : null;
}

function fmtPKR(n) { return 'Rs ' + Math.round(n).toLocaleString('en-PK'); }

function normalizePhone(phone) {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.endsWith('@c.us')) cleaned = cleaned.replace('@c.us', '');
  if (cleaned.startsWith('92')) return cleaned;
  if (cleaned.startsWith('0')) return '92' + cleaned.substring(1);
  if (cleaned.length === 10) return '92' + cleaned;
  return cleaned;
}

function findCustomerByPhone(customers, phone) {
  const norm = normalizePhone(phone);
  return (customers || []).find(c => {
    if (c._deleted) return false;
    const cp = normalizePhone(c.phone);
    return cp === norm || norm.endsWith(cp.slice(-10)) || cp.endsWith(norm.slice(-10));
  });
}

async function handleIncomingMessage(msg) {
  if (!botEnabled) return;
  if (msg.from === 'status@broadcast') return;
  if (msg.fromMe) return;
  if (msg.isGroupMsg) return;

  const phone = msg.from.replace('@c.us', '');
  const text = (msg.body || '').trim().toLowerCase();

  if (!text) return;

  try {
    const shopData = await getShopData();
    if (!shopData) return;

    const customers = (shopData.customers || []).filter(c => !c._deleted);
    const plans = (shopData.plans || []).filter(p => !p._deleted);
    const products = (shopData.products || []).filter(p => !p._deleted);
    const udpiEntries = (shopData.udpiEntries || []).filter(u => !u._deleted);
    const settings = shopData.settings || {};
    const shopName = settings.shopName || settings.businessName || 'Aqsat';

    const customer = findCustomerByPhone(customers, phone);
    const senderName = msg._data && msg._data.notifyName ? msg._data.notifyName : (customer ? customer.name : '');

    let reply = '';

    if (['hi', 'hello', 'salam', 'assalam', 'aoa', 'menu', 'help', 'start'].some(k => text.includes(k)) || text === '0') {
      reply = `*${shopName}* 🏪\nالسلام وعلیکم${senderName ? ' ' + senderName : ''}! 👋\n\n`;
      reply += `Reply with a number:\n`;
      reply += `*1* — My Plans / میرے پلانز 📋\n`;
      reply += `*2* — My Udhar / ادھار 💰\n`;
      reply += `*3* — Next Payment Due / اگلی قسط 📅\n`;
      reply += `*4* — Full Statement / مکمل حساب 📊\n\n`;
      reply += `Or type any question and we'll get back to you! 🙏`;
    }

    else if (text === '1' || ['plan', 'plans', 'qist', 'قسط', 'قسطیں', 'installment'].some(k => text.includes(k))) {
      if (!customer) {
        reply = `Your phone number is not registered with us.\nآپ کا نمبر ہمارے پاس رجسٹرڈ نہیں ہے۔\n\nPlease contact the shop. 🙏`;
      } else {
        const myPlans = plans.filter(p => p.customerId === customer.id);
        if (myPlans.length === 0) {
          reply = `You have no installment plans.\nآپ کا کوئی قسط پلان نہیں ہے۔`;
        } else {
          reply = `📋 *Your Plans — ${customer.name}*\n━━━━━━━━━━━━━━━\n\n`;
          myPlans.forEach((pl, i) => {
            const prod = products.find(p => p.id === pl.productId);
            const paid = (pl.schedule || []).filter(s => s.paid).length;
            const total = (pl.schedule || []).length;
            const paidAmt = (pl.schedule || []).filter(s => s.paid).reduce((s, x) => s + (x.amountPaid || x.amount), 0);
            const remaining = pl.total - pl.down - paidAmt;
            const statusEmoji = pl.status === 'completed' ? '✅' : '🔄';
            reply += `${statusEmoji} *${prod ? prod.name : 'Product'}*\n`;
            reply += `   Total: ${fmtPKR(pl.total)} | Down: ${fmtPKR(pl.down)}\n`;
            reply += `   Paid: ${paid}/${total} installments (${fmtPKR(paidAmt)})\n`;
            reply += `   Remaining: ${fmtPKR(Math.max(0, remaining))}\n`;
            if (pl.voucherNo) reply += `   Voucher: ${pl.voucherNo}\n`;
            reply += `\n`;
          });
        }
      }
    }

    else if (text === '2' || ['udhar', 'ادھار', 'hisaab', 'حساب', 'balance', 'بقایا', 'khata', 'کھاتا'].some(k => text.includes(k))) {
      const personName = customer ? customer.name : null;
      if (!personName) {
        const allPeople = {};
        udpiEntries.forEach(u => {
          const n = u.person.trim();
          if (!allPeople[n]) allPeople[n] = { lent: 0, borrowed: 0 };
          if (u.direction === 'lent' && !u.returned) allPeople[n].lent += u.amount - (u.returnedAmount || 0);
          if (u.direction === 'borrowed' && !u.returned) allPeople[n].borrowed += u.amount - (u.returnedAmount || 0);
        });
        reply = `Your phone number is not registered.\nآپ کا نمبر رجسٹرڈ نہیں ہے۔\n\nContact the shop for your balance. 🙏`;
      } else {
        const entries = udpiEntries.filter(u => u.person.trim().toLowerCase() === personName.toLowerCase());
        let lent = 0, borrowed = 0;
        entries.forEach(u => {
          if (u.direction === 'lent' && !u.returned) lent += u.amount - (u.returnedAmount || 0);
          if (u.direction === 'borrowed' && !u.returned) borrowed += u.amount - (u.returnedAmount || 0);
        });
        const balance = lent - borrowed;
        reply = `💰 *Udhar — ${personName}*\n━━━━━━━━━━━━━━━\n\n`;
        if (balance > 0) {
          reply += `You owe: *${fmtPKR(balance)}*\nآپ کے ذمے: *${fmtPKR(balance)}*\n\n`;
        } else if (balance < 0) {
          reply += `We owe you: *${fmtPKR(Math.abs(balance))}*\nہمارے ذمے: *${fmtPKR(Math.abs(balance))}*\n\n`;
        } else {
          reply += `All clear! ✅\nکوئی بقایا نہیں 👍\n\n`;
        }
        const pending = entries.filter(u => !u.returned).slice(0, 8);
        if (pending.length > 0) {
          reply += `Recent pending:\n`;
          pending.forEach(u => {
            const isLent = u.direction === 'lent';
            const remaining = u.amount - (u.returnedAmount || 0);
            reply += `${isLent ? '🔴' : '🟢'} ${fmtPKR(remaining)} — ${u.note || (isLent ? 'Gave' : 'Got')} (${u.date})\n`;
          });
        }
      }
    }

    else if (text === '3' || ['next', 'due', 'agla', 'اگلی', 'coming'].some(k => text.includes(k))) {
      if (!customer) {
        reply = `Your number is not registered.\nآپ کا نمبر رجسٹرڈ نہیں۔ 🙏`;
      } else {
        const myPlans = plans.filter(p => p.customerId === customer.id && p.status === 'active');
        if (myPlans.length === 0) {
          reply = `No active plans found.\nکوئی فعال پلان نہیں ملا۔`;
        } else {
          reply = `📅 *Next Due — ${customer.name}*\n━━━━━━━━━━━━━━━\n\n`;
          myPlans.forEach(pl => {
            const prod = products.find(p => p.id === pl.productId);
            const next = (pl.schedule || []).find(s => !s.paid);
            if (next) {
              const today = new Date().toISOString().split('T')[0];
              const isOverdue = next.dueDate < today;
              reply += `${isOverdue ? '⚠️ OVERDUE' : '📌'} *${prod ? prod.name : 'Product'}*\n`;
              reply += `   Amount: ${fmtPKR(next.amount)}\n`;
              reply += `   Due: ${next.dueDate}\n`;
              reply += `   Installment #${next.n}/${(pl.schedule || []).length}\n\n`;
            }
          });
          reply += `Please pay on time. Shukriya! 🙏\nبراہ کرم وقت پر ادائیگی کریں۔`;
        }
      }
    }

    else if (text === '4' || ['statement', 'full', 'مکمل', 'detail', 'all'].some(k => text.includes(k))) {
      if (!customer) {
        reply = `Your number is not registered.\nآپ کا نمبر رجسٹرڈ نہیں۔ 🙏`;
      } else {
        reply = `📊 *Full Statement — ${customer.name}*\n━━━━━━━━━━━━━━━\n\n`;

        const myPlans = plans.filter(p => p.customerId === customer.id);
        if (myPlans.length > 0) {
          reply += `*INSTALLMENT PLANS:*\n`;
          myPlans.forEach(pl => {
            const prod = products.find(p => p.id === pl.productId);
            const paid = (pl.schedule || []).filter(s => s.paid);
            const unpaid = (pl.schedule || []).filter(s => !s.paid);
            const paidAmt = paid.reduce((s, x) => s + (x.amountPaid || x.amount), 0);
            reply += `\n${pl.status === 'completed' ? '✅' : '📋'} ${prod ? prod.name : 'Product'}\n`;
            reply += `   Total: ${fmtPKR(pl.total)} | Down: ${fmtPKR(pl.down)}\n`;
            reply += `   Paid: ${paid.length}/${pl.schedule.length} (${fmtPKR(paidAmt)})\n`;
            if (unpaid.length > 0) {
              reply += `   Next: ${fmtPKR(unpaid[0].amount)} due ${unpaid[0].dueDate}\n`;
            }
          });
          reply += '\n';
        }

        const entries = udpiEntries.filter(u => u.person.trim().toLowerCase() === customer.name.toLowerCase());
        if (entries.length > 0) {
          let lent = 0, borrowed = 0;
          entries.forEach(u => {
            if (u.direction === 'lent' && !u.returned) lent += u.amount - (u.returnedAmount || 0);
            if (u.direction === 'borrowed' && !u.returned) borrowed += u.amount - (u.returnedAmount || 0);
          });
          const balance = lent - borrowed;
          reply += `*UDHAR:*\n`;
          reply += `Balance: ${balance > 0 ? 'You owe ' : balance < 0 ? 'We owe ' : ''}${fmtPKR(Math.abs(balance))}\n`;
          const pending = entries.filter(u => !u.returned);
          pending.slice(0, 5).forEach(u => {
            const isLent = u.direction === 'lent';
            const rem = u.amount - (u.returnedAmount || 0);
            reply += `${isLent ? '🔴' : '🟢'} ${fmtPKR(rem)} — ${u.note || (isLent ? 'Gave' : 'Got')} (${u.date})\n`;
          });
        }

        reply += `\n━━━━━━━━━━━━━━━\n${shopName} 🙏`;
      }
    }

    else {
      reply = `*${shopName}* 🏪\n\n`;
      reply += `Reply with a number:\n`;
      reply += `*1* — My Plans / میرے پلانز 📋\n`;
      reply += `*2* — My Udhar / ادھار 💰\n`;
      reply += `*3* — Next Payment Due / اگلی قسط 📅\n`;
      reply += `*4* — Full Statement / مکمل حساب 📊\n\n`;
      reply += `Or type *hi* for help. 🙏`;
    }

    if (reply) {
      await client.sendMessage(msg.from, reply);
      botLog.unshift({ time: new Date().toISOString(), from: phone, name: senderName || phone, text: msg.body, reply: reply.substring(0, 100) + '...' });
      if (botLog.length > 50) botLog = botLog.slice(0, 50);
    }
  } catch (err) {
    console.error('[WA Bot] Error handling message:', err);
  }
}

function getClient() {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
  });

  client.on('qr', (qr) => {
    qrCode = qr;
    status = 'qr';
    statusMessage = 'Scan QR code to connect WhatsApp';
  });

  client.on('ready', () => {
    qrCode = null;
    status = 'ready';
    statusMessage = 'WhatsApp connected!';
    console.log('[WhatsApp] Client ready');
  });

  client.on('authenticated', () => {
    status = 'authenticated';
    statusMessage = 'Authenticated, loading chats...';
    console.log('[WhatsApp] Authenticated');
  });

  client.on('auth_failure', (msg) => {
    status = 'error';
    statusMessage = 'Auth failed: ' + msg;
    console.error('[WhatsApp] Auth failure:', msg);
  });

  client.on('disconnected', (reason) => {
    status = 'disconnected';
    statusMessage = 'Disconnected: ' + reason;
    client = null;
    console.log('[WhatsApp] Disconnected:', reason);
  });

  client.on('message', handleIncomingMessage);

  client.initialize().catch(err => {
    status = 'error';
    statusMessage = 'Init error: ' + err.message;
    console.error('[WhatsApp] Init error:', err);
  });

  return client;
}

function getStatus() {
  return { status, message: statusMessage, hasQR: !!qrCode, botEnabled, botLogCount: botLog.length };
}

function getQR() {
  return qrCode;
}

function getBotLog() {
  return botLog;
}

function setBotEnabled(val) {
  botEnabled = !!val;
  return botEnabled;
}

async function sendMessage(phone, message) {
  if (status !== 'ready') {
    return { ok: false, error: 'WhatsApp not connected. Status: ' + status };
  }

  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.length === 10) cleaned = '92' + cleaned;
  if (cleaned.startsWith('0')) cleaned = '92' + cleaned.substring(1);

  const chatId = cleaned + '@c.us';

  try {
    const msg = await client.sendMessage(chatId, message);
    return { ok: true, messageId: msg.id._serialized };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function sendBulkReminders() {
  if (status !== 'ready') {
    return { ok: false, error: 'WhatsApp not connected' };
  }

  const shopData = await getShopData();
  if (!shopData) return { ok: false, error: 'Shop data not found' };

  const customers = (shopData.customers || []).filter(c => !c._deleted);
  const plans = (shopData.plans || []).filter(p => !p._deleted && p.status === 'active');
  const products = (shopData.products || []).filter(p => !p._deleted);
  const udpiEntries = (shopData.udpiEntries || []).filter(u => !u._deleted);
  const settings = shopData.settings || {};
  const shopName = settings.shopName || settings.businessName || 'Aqsat';
  const today = new Date().toISOString().split('T')[0];

  const results = [];

  for (const pl of plans) {
    const next = (pl.schedule || []).find(s => !s.paid);
    if (!next || !next.dueDate) continue;
    const daysUntil = Math.round((new Date(next.dueDate) - new Date(today)) / 86400000);
    if (daysUntil > 3 || daysUntil < -30) continue;

    const c = customers.find(x => x.id === pl.customerId);
    if (!c || !c.phone) continue;
    const prod = products.find(x => x.id === pl.productId);

    const isOverdue = daysUntil < 0;
    const msg = `السلام وعلیکم ${c.name}! 🙏\n\n` +
      `*${shopName}* کی طرف سے ${isOverdue ? '⚠️ اہم' : ''} یاد دہانی:\n\n` +
      `📦 ${prod ? prod.name : 'Product'}\n` +
      `💳 قسط نمبر: ${next.n}/${(pl.schedule || []).length}\n` +
      `💰 رقم: ${fmtPKR(next.amount)}\n` +
      `📅 تاریخ: ${next.dueDate}\n` +
      (isOverdue ? `\n⚠️ ${Math.abs(daysUntil)} دن اوورڈیو ہے!\n` : daysUntil === 0 ? '\n📌 آج واجب الادا ہے!\n' : `\n📌 ${daysUntil} دن باقی\n`) +
      (pl.voucherNo ? `🔖 وچر: ${pl.voucherNo}\n` : '') +
      `\nبراہ کرم بروقت ادائیگی کریں۔\nشکریہ 🙏`;

    const result = await sendMessage(c.phone, msg);
    results.push({ type: 'plan', name: c.name, phone: c.phone, ...result });
    await new Promise(r => setTimeout(r, 2000));
  }

  const people = {};
  udpiEntries.forEach(u => {
    if (u.returned) return;
    const name = u.person.trim();
    if (!people[name]) people[name] = { name, balance: 0, pending: [] };
    const remaining = u.amount - (u.returnedAmount || 0);
    if (u.direction === 'lent') {
      people[name].balance += remaining;
      people[name].pending.push(u);
    } else {
      people[name].balance -= remaining;
    }
  });

  const udharMeta = settings.udharMeta || {};
  for (const p of Object.values(people)) {
    if (p.balance <= 0) continue;
    const meta = udharMeta[p.name] || {};
    const hasReminder = meta.reminderDate && meta.reminderDate <= today;
    const hasOverdue = p.pending.some(u => u.dueDate && u.dueDate < today);
    if (!hasReminder && !hasOverdue) continue;

    const c = customers.find(x => x.name.toLowerCase() === p.name.toLowerCase());
    if (!c || !c.phone) continue;

    const msg = `السلام وعلیکم ${p.name}! 🙏\n\n` +
      `*${shopName}* — ادھار یاد دہانی:\n\n` +
      `💰 بقایا: *${fmtPKR(p.balance)}*\n\n` +
      p.pending.slice(0, 5).map(u => `• ${u.note || 'Amount'}: ${fmtPKR(u.amount - (u.returnedAmount || 0))}${u.dueDate ? ' (due: ' + u.dueDate + ')' : ''}`).join('\n') +
      `\n\nبراہ کرم جلد ادائیگی کریں۔\nشکریہ 🙏`;

    const result = await sendMessage(c.phone, msg);
    results.push({ type: 'udhar', name: p.name, phone: c.phone, ...result });
    await new Promise(r => setTimeout(r, 2000));
  }

  return { ok: true, sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results };
}

async function disconnect() {
  if (client) {
    try { await client.destroy(); } catch (e) {}
    client = null;
    status = 'disconnected';
    statusMessage = 'Disconnected';
    qrCode = null;
  }
}

module.exports = { getClient, getStatus, getQR, sendMessage, disconnect, getBotLog, setBotEnabled, sendBulkReminders };
