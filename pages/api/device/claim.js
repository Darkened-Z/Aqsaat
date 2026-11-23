import { supabaseAdmin, SHOP_ID } from '../../../lib/serverAuth';
import { CLAIM_TTL_MS } from '../../../lib/deviceLock';
import { updateShopData } from '../../../lib/shopData';

// Called by a freshly-provisioned phone. The short claim code (shown once on the
// Devices page) is the credential; it is single-use and expires, so no login here.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const code = String((req.body && req.body.claimCode) || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'claimCode required' });

  const { data: device } = await supabaseAdmin
    .from('devices').select('*')
    .eq('shop_id', SHOP_ID).eq('claim_code', code).eq('claimed', false).neq('status', 'deleted').maybeSingle();
  if (!device) return res.status(404).json({ error: 'invalid or used code' });

  if (Date.now() - new Date(device.created_at).getTime() > CLAIM_TTL_MS)
    return res.status(410).json({ error: 'code expired — create a new enrollment' });

  await supabaseAdmin.from('devices')
    .update({ claimed: true, claim_code: null }).eq('id', device.id);

  // The phone is now under lock, so the plan counts as handed over. Bump updatedAt
  // so the app's union-by-id sync keeps this over an older local copy.
  if (device.plan_id) {
    await updateShopData((data) => {
      const plans = data.plans || [];
      const pi = plans.findIndex(p => p && p.id === device.plan_id && !p._deleted);
      if (pi < 0 || plans[pi].handedOver) return null;
      const now = new Date().toISOString();
      plans[pi] = { ...plans[pi], handedOver: true, handoverAt: now.slice(0, 10), updatedAt: now };
      data.plans = plans;
      return data;
    });
  }

  const base = process.env.APP_BASE_URL || ('https://' + (req.headers.host || ''));
  res.json({ deviceId: device.id, secret: device.secret, baseUrl: base });
}
