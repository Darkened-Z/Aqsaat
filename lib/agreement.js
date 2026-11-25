// Installment agreement: default bilingual terms and the plan facts printed on it.
// Clause 6 is the customer's written consent to the device lock — the legal basis
// the shop relies on, so it is always included and can't be edited out.

export const LOCK_CLAUSE = {
  en: 'If this product is a mobile phone, the customer agrees that the shop has installed a payment-lock app on it. If an installment is overdue beyond the grace period, the phone may be locked until payment is made; emergency calls stay available. The lock is removed automatically when the plan is fully paid.',
  ur: 'اگر یہ پروڈکٹ موبائل فون ہے تو خریدار اس بات سے متفق ہے کہ دکان نے اس میں ادائیگی لاک ایپ انسٹال کی ہے۔ مقررہ مہلت کے بعد قسط ادا نہ ہونے پر فون ادائیگی تک لاک ہو سکتا ہے، ایمرجنسی کال ہر وقت دستیاب رہے گی۔ تمام اقساط ادا ہونے پر لاک خود بخود ختم ہو جائے گا۔',
};

export const DEFAULT_TERMS = [
  { en: 'The customer buys the product on installments as per the schedule below and will pay each installment on or before its due date.', ur: 'خریدار نیچے دیے گئے شیڈول کے مطابق قسطوں پر پروڈکٹ خرید رہا ہے اور ہر قسط مقررہ تاریخ تک ادا کرے گا۔' },
  { en: 'Ownership of the product stays with the shop until the last installment is paid.', ur: 'آخری قسط کی ادائیگی تک پروڈکٹ کی ملکیت دکان کی رہے گی۔' },
  { en: 'A late fee may be charged on overdue installments as per the shop\'s policy.', ur: 'تاخیر کی صورت میں دکان کی پالیسی کے مطابق لیٹ فیس لی جا سکتی ہے۔' },
  { en: 'The customer will not sell, pawn or transfer the product before full payment.', ur: 'مکمل ادائیگی سے پہلے خریدار پروڈکٹ فروخت، گروی یا منتقل نہیں کرے گا۔' },
  { en: 'The guarantor is jointly responsible for any unpaid amount.', ur: 'ضامن کسی بھی باقی رقم کی ادائیگی کا برابر کا ذمہ دار ہوگا۔' },
];

export function termsFor(settings) {
  const custom = settings && settings.agreementTerms && Array.isArray(settings.agreementTerms.items) ? settings.agreementTerms.items : null;
  return [...(custom && custom.length ? custom : DEFAULT_TERMS), LOCK_CLAUSE];
}

export function planFacts(shop, planId) {
  const plan = (shop.plans || []).find(p => p && p.id === planId && !p._deleted);
  if (!plan) return null;
  const c = (shop.customers || []).find(x => x.id === plan.customerId) || {};
  const prod = (shop.products || []).find(x => x.id === plan.productId) || {};
  const s = shop.settings || {};
  const sched = (plan.schedule || []).map(x => ({ n: x.n, dueDate: x.dueDate, amount: x.amount || 0 }));
  return {
    shop: { name: s.businessName || s.shopName || 'Warraich Corporation', owner: s.ownerName || '', city: s.city || '' },
    plan: { id: plan.id, voucher: plan.voucherNo || '', startDate: plan.startDate || '', total: plan.total || 0, down: plan.down || 0,
      months: plan.months || sched.length, imei: plan.imei || '', serialNo: plan.serialNo || '', chassisNo: plan.chassisNo || '', engineNo: plan.engineNo || '' },
    product: { name: prod.name || '', brand: prod.brand || '' },
    customer: { name: c.name || '', nameUr: c.nameUr || '', fatherName: c.fatherName || '', cnic: c.cnic || '', phone: c.phone || '', address: [c.address, c.area, c.city].filter(Boolean).join(', ') },
    guarantor: c.guarantor ? { name: c.guarantor.name || '', cnic: c.guarantor.cnic || '', phone: c.guarantor.phone || '', relation: c.guarantor.relation || '' } : null,
    schedule: sched,
    agreement: plan.agreement || null,
  };
}

const PNG = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
// A drawn signature, not anything else: PNG data URL, sane size.
export function parseSignature(dataUrl) {
  const m = PNG.exec(String(dataUrl || ''));
  if (!m) return null;
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length < 200 || buf.length > 400000) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return buf;
}
