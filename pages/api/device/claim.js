import { supabaseAdmin, SHOP_ID } from '../../../lib/serverAuth';
import { CLAIM_TTL_MS } from '../../../lib/deviceLock';

// Called by a freshly-provisioned phone. The short claim code (shown once on the
// Devices page) is the credential; it is single-use and expires, so no login here.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const code = String((req.body && req.body.claimCode) || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'claimCode required' });

  const { data: device } = await supabaseAdmin
    .from('devices').select('*')
    .eq('shop_id', SHOP_ID).eq('claim_code', code).eq('claimed', false).maybeSingle();
  if (!device) return res.status(404).json({ error: 'invalid or used code' });

  if (Date.now() - new Date(device.created_at).getTime() > CLAIM_TTL_MS)
    return res.status(410).json({ error: 'code expired — create a new enrollment' });

  await supabaseAdmin.from('devices')
    .update({ claimed: true, claim_code: null }).eq('id', device.id);

  const base = process.env.APP_BASE_URL || ('https://' + (req.headers.host || ''));
  res.json({ deviceId: device.id, secret: device.secret, baseUrl: base });
}
