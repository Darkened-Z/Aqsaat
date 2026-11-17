import { supabaseAdmin, SHOP_ID, requireMember } from '../../../lib/serverAuth';
import { newDeviceId, newSecret, newClaimCode } from '../../../lib/deviceLock';

// Owner-only. Creates a device record and returns the string the counter PC
// pastes/scans into the phone app before provisioning Device Owner.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireMember(req, res))) return;

  const { planId, customerId, label, graceDays } = req.body || {};
  const id = newDeviceId();
  const secret = newSecret();
  const claimCode = newClaimCode();

  const { error } = await supabaseAdmin.from('devices').insert({
    id, shop_id: SHOP_ID,
    plan_id: planId || null, customer_id: customerId || null,
    label: label || null,
    secret, claim_code: claimCode, claimed: false,
    status: 'active', lock_mode: 'auto',
    grace_days: (graceDays != null && graceDays !== '') ? parseInt(graceDays, 10) : null,
  });
  if (error) return res.status(500).json({ error: error.message });

  const base = process.env.APP_BASE_URL || ('https://' + (req.headers.host || ''));
  // claimCode is the counter path (scan QR, type code); enrollString is the PC fallback.
  res.json({ deviceId: id, claimCode, enrollString: [id, secret, base].join('|') });
}
