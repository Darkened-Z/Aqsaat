import { supabaseAdmin, SHOP_ID, requireMember } from '../../../lib/serverAuth';

// Owner-only. Tells the main app whether a plan's phone is actually enrolled and
// provisioned (claimed), so handover can be gated on it.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireMember(req, res))) return;

  const planId = String(req.query.planId || '');
  if (!planId) return res.status(400).json({ error: 'planId required' });

  const { data: devices } = await supabaseAdmin
    .from('devices').select('id,status,claimed')
    .eq('shop_id', SHOP_ID).eq('plan_id', planId);

  const live = (devices || []).find(d => d.claimed && d.status === 'active');
  const anyClaimed = (devices || []).some(d => d.claimed);
  res.json({ enrolled: !!live || anyClaimed, active: !!live, deviceId: live ? live.id : null });
}
