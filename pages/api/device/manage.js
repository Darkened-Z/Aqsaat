import { supabaseAdmin, SHOP_ID, requireMember } from '../../../lib/serverAuth';
import { evaluate, unlockCode, LATEST_APP_VERSION } from '../../../lib/deviceLock';

// Owner-only. GET lists devices with live status + today's unlock code.
// POST applies an action to one device.
export default async function handler(req, res) {
  if (!(await requireMember(req, res))) return;

  if (req.method === 'GET') {
    const { data: devices } = await supabaseAdmin
      .from('devices').select('*').eq('shop_id', SHOP_ID).order('created_at', { ascending: false });
    const { data: shop } = await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single();
    const d = (shop && shop.data) || {};
    const custName = id => (d.customers || []).find(c => c.id === id)?.name || '';
    const planLabel = id => { const p = (d.plans || []).find(x => x.id === id); return p ? (p.voucherNo || p.id) : ''; };

    const list = (devices || []).map(dev => ({
      id: dev.id, label: dev.label, status: dev.status, lockMode: dev.lock_mode,
      customer: custName(dev.customer_id), plan: planLabel(dev.plan_id),
      lastCheckin: dev.last_checkin, lastAction: dev.last_action,
      current: evaluate(dev, d).action,
      unlockCode: unlockCode(dev.secret),
      lat: dev.last_lat, lng: dev.last_lng, locAcc: dev.last_loc_acc, locAt: dev.last_loc_at,
      callMode: dev.call_mode || 'open', allowNumber: dev.allow_number || '',
      created: dev.created_at, claimed: dev.claimed,
      planId: dev.plan_id, customerId: dev.customer_id,
      appVersion: dev.app_version,
    }));
    return res.json({ devices: list, latestVersion: LATEST_APP_VERSION });
  }

  if (req.method === 'POST') {
    const { deviceId, action, value } = req.body || {};
    if (!deviceId || !action) return res.status(400).json({ error: 'deviceId and action required' });
    if (action === 'rename') {
      const { error } = await supabaseAdmin.from('devices')
        .update({ label: String(value || '').trim() || null })
        .eq('id', deviceId).eq('shop_id', SHOP_ID);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }
    if (action === 'callshop') {
      const num = String(value || '').trim();
      const { error } = await supabaseAdmin.from('devices')
        .update({ call_mode: 'shop_only', allow_number: num || null })
        .eq('id', deviceId).eq('shop_id', SHOP_ID);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }
    const patch = {
      lock:     { lock_mode: 'force_lock' },
      unlock:   { lock_mode: 'force_unlock' },
      auto:     { lock_mode: 'auto' },
      lost:     { status: 'lost' },
      release:  { status: 'released', lock_mode: 'force_unlock', call_mode: 'open' },
      active:   { status: 'active', lock_mode: 'auto' },
      delete:   { status: 'deleted' },   // soft delete; restore via 'active'
      callopen: { call_mode: 'open' },
    }[action];
    if (action === 'purge') {
      const { error } = await supabaseAdmin.from('devices').delete().eq('id', deviceId).eq('shop_id', SHOP_ID);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }
    if (!patch) return res.status(400).json({ error: 'unknown action' });
    if (action === 'delete') {
      // A claimed phone that hasn't run its release would stay managed and then
      // offline-lock once the server starts rejecting it.
      const { data: dev } = await supabaseAdmin.from('devices').select('claimed, last_action')
        .eq('id', deviceId).eq('shop_id', SHOP_ID).single();
      if (dev && dev.claimed && dev.last_action !== 'release') {
        return res.status(409).json({ error: 'Release this phone first and wait for it to check in before deleting.' });
      }
    }
    const { error } = await supabaseAdmin.from('devices').update(patch).eq('id', deviceId).eq('shop_id', SHOP_ID);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
