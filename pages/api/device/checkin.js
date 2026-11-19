import { supabaseAdmin, SHOP_ID } from '../../../lib/serverAuth';
import { evaluate, OFFLINE_LOCK_DAYS } from '../../../lib/deviceLock';

// Called by the phone app on a timer. Authenticated by the per-device secret, not
// a user login. No member check — the device is not a signed-in person.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { deviceId, secret, lat, lng, acc } = req.body || {};
  if (!deviceId || !secret) return res.status(400).json({ error: 'deviceId and secret required' });

  const { data: device } = await supabaseAdmin
    .from('devices').select('*').eq('id', deviceId).eq('shop_id', SHOP_ID).maybeSingle();
  if (!device || device.secret !== secret || device.status === 'deleted') return res.status(401).json({ error: 'unknown device' });

  const { data: shop } = await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single();
  const result = evaluate(device, (shop && shop.data) || {});

  const patch = { last_checkin: new Date().toISOString(), last_action: result.action };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    patch.last_lat = lat;
    patch.last_lng = lng;
    patch.last_loc_acc = Number.isFinite(acc) ? acc : null;
    patch.last_loc_at = new Date().toISOString();
  }
  await supabaseAdmin.from('devices').update(patch).eq('id', deviceId);

  res.json({
    action: result.action,            // ok | warn | lock | release
    overdue: result.overdue || 0,
    message: result.message || '',
    offlineLockDays: OFFLINE_LOCK_DAYS,
    callMode: device.call_mode || 'open',
    allowNumber: device.allow_number || '',
    serverTime: Date.now(),
  });
}
