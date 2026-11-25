import { supabaseAdmin, SHOP_ID } from '../../../../lib/serverAuth';
import { config, verifyHash } from '../../../../lib/payments/jazzcash';
import { confirm } from '../../../../lib/payments/online';

// JazzCash posts the customer's browser here after checkout. The posted result is
// only a hint: it must carry a valid hash, and the payment is settled only after
// a server-side inquiry says it completed.
export default async function handler(req, res) {
  const cfg = config();
  const f = req.method === 'POST' ? (req.body || {}) : req.query;
  if (!cfg || !f.pp_TxnRefNo || !verifyHash(f, cfg.salt)) return res.status(400).send('Invalid payment response');

  const { data: payment } = await supabaseAdmin.from('payments').select('*')
    .eq('txn_ref', String(f.pp_TxnRefNo)).eq('shop_id', SHOP_ID).maybeSingle();
  if (!payment) return res.status(404).send('Unknown payment');

  let result = payment.status;
  if (f.pp_ResponseCode === '000' && String(f.pp_Amount) === String(payment.amount * 100)) {
    result = await confirm(payment);
  } else if (payment.status === 'pending') {
    await supabaseAdmin.from('payments').update({ status: 'failed', response_code: f.pp_ResponseCode || null, response_msg: f.pp_ResponseMessage || null })
      .eq('id', payment.id).eq('status', 'pending');
    result = 'failed';
  }
  const token = /^[\w]+\.[0-9a-f]+$/.test(f.ppmpf_1 || '') ? f.ppmpf_1 : '';
  res.redirect(303, `/pay/${token}?r=${result === 'already' ? 'paid' : result}`);
}
