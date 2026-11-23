import crypto from 'crypto';
import { supabaseAdmin, SHOP_ID } from '../../../lib/serverAuth';
import { config, checkoutFields, newTxnRef } from '../../../lib/payments/jazzcash';
import { deviceFromToken, dueNow, planOf, loadShop, payToken } from '../../../lib/payments/online';

// Public (the customer's phone, no login). Authorised by the signed pay token.
// Quotes what is due now and returns the JazzCash form to auto-submit.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const cfg = config();
  if (!cfg) return res.status(503).json({ error: 'Online payment is not available. Please contact the shop.' });
  const device = await deviceFromToken(req.body && req.body.token);
  if (!device) return res.status(404).json({ error: 'Link not valid' });

  const plan = planOf(await loadShop(), device.plan_id);
  const due = dueNow(plan);
  if (!due.amount) return res.status(409).json({ error: 'Nothing is due right now.' });

  const txnRef = newTxnRef();
  const { error } = await supabaseAdmin.from('payments').insert({
    id: 'pay_' + crypto.randomBytes(8).toString('hex'), shop_id: SHOP_ID, device_id: device.id,
    plan_id: device.plan_id, txn_ref: txnRef, amount: due.amount, installments: due.installments,
  });
  if (error) return res.status(500).json({ error: error.message });

  const fields = checkoutFields(cfg, {
    txnRef, amount: due.amount,
    billRef: String(plan.voucherNo || plan.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 20) || 'bill',
    description: 'Installment ' + due.installments.join(' '),
    returnUrl: `https://${req.headers.host}/api/pay/jazzcash/return`,
    extra: { ppmpf_1: payToken(device) },
  });
  res.json({ action: cfg.checkoutUrl, fields });
}
