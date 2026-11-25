import { supabaseAdmin, SHOP_ID } from '../../../lib/serverAuth';
import { requireRole } from '../../../lib/staff';
import { updateShopData } from '../../../lib/shopData';
import { cleanFrpIds } from '../../../lib/lockPro';

// Owner: shop-wide device-lock settings. FRP account IDs reach every phone at its
// next check-in (Android 11+ on OEMs that honour the policy).
export default async function handler(req, res) {
  if (!(await requireRole(req, res, ['owner']))) return;
  if (req.method === 'GET') {
    const { data } = await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single();
    const frp = (((data && data.data) || {}).settings || {}).frp || {};
    return res.json({ frpAccountIds: cleanFrpIds(frp.accountIds) });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const ids = cleanFrpIds(req.body && req.body.frpAccountIds);
  if (req.body && req.body.frpAccountIds && !ids.length) return res.status(400).json({ error: 'Enter the numeric Google account ID (digits only)' });
  const r = await updateShopData(d => ({ ...d, settings: { ...(d.settings || {}), frp: { accountIds: ids, updatedAt: new Date().toISOString() } } }));
  if (r.error) return res.status(500).json(r);
  res.json({ ok: true, frpAccountIds: ids });
}
