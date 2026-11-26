import { supabaseAdmin, SHOP_ID } from '../../../lib/serverAuth';
import { planSummary } from '../../../lib/devicePlan';

// The customer's own plan for the phone app. Authenticated by the device secret,
// like check-in; returns plan money and dates only.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { deviceId, secret } = req.body || {};
  if (!deviceId || !secret) return res.status(400).json({ error: 'deviceId and secret required' });

  const { data: device } = await supabaseAdmin
    .from('devices').select('id, secret, status, plan_id, allow_number').eq('id', deviceId).eq('shop_id', SHOP_ID).maybeSingle();
  if (!device || device.secret !== secret || device.status === 'deleted') return res.status(401).json({ error: 'unknown device' });
  if (!device.plan_id) return res.json({ plan: null });

  const { data: shop } = await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single();
  const plan = planSummary((shop && shop.data) || {}, device.plan_id);
  if (plan && !plan.shop.phone && device.allow_number) plan.shop.phone = device.allow_number;
  res.json({ plan });
}
