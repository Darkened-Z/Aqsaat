import crypto from 'crypto';

// JazzCash hosted checkout ("Page Redirection"). Off unless all three credentials
// are set. JAZZCASH_ENV=live switches from the sandbox.
export function config() {
  const merchantId = process.env.JAZZCASH_MERCHANT_ID;
  const password = process.env.JAZZCASH_PASSWORD;
  const salt = process.env.JAZZCASH_INTEGRITY_SALT;
  if (!merchantId || !password || !salt) return null;
  const host = process.env.JAZZCASH_ENV === 'live' ? 'https://payments.jazzcash.com.pk' : 'https://sandbox.jazzcash.com.pk';
  return {
    merchantId, password, salt,
    version: process.env.JAZZCASH_VERSION || '1.1',
    checkoutUrl: host + '/CustomerPortal/transactionmanagement/merchantform/',
    inquiryUrl: host + '/ApplicationAPI/API/PaymentInquiry/Inquire',
  };
}

// HMAC-SHA256(salt, salt & values of non-empty pp_/ppmpf_ fields sorted by key).
export function secureHash(fields, salt) {
  const keys = Object.keys(fields)
    .filter(k => k !== 'pp_SecureHash' && /^(pp_|ppmpf_)/.test(k))
    .filter(k => fields[k] != null && String(fields[k]).length > 0)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const message = [salt, ...keys.map(k => String(fields[k]))].join('&');
  return crypto.createHmac('sha256', salt).update(message, 'utf8').digest('hex').toUpperCase();
}

export function verifyHash(fields, salt) {
  const got = String(fields.pp_SecureHash || '').toUpperCase();
  const want = secureHash(fields, salt);
  return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

// yyyyMMddHHmmss in Pakistan time (UTC+5, no DST).
export function pkTime(ms = Date.now()) {
  return new Date(ms + 5 * 3600000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

export function newTxnRef(ms = Date.now()) {
  return 'T' + pkTime(ms) + crypto.randomBytes(2).toString('hex').toUpperCase();
}

export function checkoutFields(cfg, { txnRef, amount, billRef, description, returnUrl, extra = {}, now = Date.now() }) {
  const fields = {
    pp_Version: cfg.version,
    pp_TxnType: '',
    pp_Language: 'EN',
    pp_MerchantID: cfg.merchantId,
    pp_SubMerchantID: '',
    pp_Password: cfg.password,
    pp_BankID: '',
    pp_ProductID: '',
    pp_TxnRefNo: txnRef,
    pp_Amount: String(Math.round(amount * 100)),
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: pkTime(now),
    pp_BillReference: billRef,
    pp_Description: description,
    pp_TxnExpiryDateTime: pkTime(now + 24 * 3600000),
    pp_ReturnURL: returnUrl,
    ppmpf_1: extra.ppmpf_1 || '', ppmpf_2: '', ppmpf_3: '', ppmpf_4: '', ppmpf_5: '',
  };
  fields.pp_SecureHash = secureHash(fields, cfg.salt);
  return fields;
}

// Server-to-server status check, so a forged or replayed redirect can't mark
// anything paid on its own. Returns { paid, code, message } or { error }.
export async function inquire(cfg, txnRef) {
  const body = { pp_TxnRefNo: txnRef, pp_MerchantID: cfg.merchantId, pp_Password: cfg.password };
  body.pp_SecureHash = secureHash(body, cfg.salt);
  try {
    const r = await fetch(cfg.inquiryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    // pp_ResponseCode is the inquiry call itself; pp_PaymentResponseCode is the
    // payment ('121' = completed). Anything else counts as not paid yet.
    const paid = j.pp_ResponseCode === '000' && ['121', '000'].includes(j.pp_PaymentResponseCode);
    return { paid, code: j.pp_PaymentResponseCode || j.pp_ResponseCode, message: j.pp_PaymentResponseMessage || j.pp_ResponseMessage || '', amount: j.pp_Amount };
  } catch (e) { return { error: e.message }; }
}
