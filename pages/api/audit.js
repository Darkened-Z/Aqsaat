import { supabaseAdmin, SHOP_ID } from '../../lib/serverAuth';
import { requireRole, audit } from '../../lib/staff';

// POST: the main app reports what a save changed; the actor comes from the login
// token, never from the body. GET: owner reads the log.
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const me = await requireRole(req, res, ['owner', 'salesman']);
    if (!me) return;
    const entries = Array.isArray(req.body && req.body.entries) ? req.body.entries.slice(0, 60) : [];
    const r = await audit(me, entries);
    return r.error ? res.status(500).json(r) : res.json({ ok: true });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const me = await requireRole(req, res, ['owner']);
  if (!me) return;
  const { actor, action, from, to, q } = req.query;
  let qb = supabaseAdmin.from('audit_log').select('*').eq('shop_id', SHOP_ID).order('at', { ascending: false }).limit(300);
  if (actor) qb = qb.eq('actor', actor);
  if (action) qb = qb.eq('action', action);
  if (from) qb = qb.gte('at', from);
  if (to) qb = qb.lte('at', to);
  if (q) qb = qb.ilike('summary', '%' + String(q).replace(/[%_]/g, '') + '%');
  const { data, error } = await qb;
  if (error) return res.status(500).json({ error: error.message });
  const { data: writes } = await supabaseAdmin.from('shop_writes').select('at, user_id').eq('shop_id', SHOP_ID).order('at', { ascending: false }).limit(200);
  const { data: staff } = await supabaseAdmin.from('shop_staff').select('user_id, name').eq('shop_id', SHOP_ID);
  const names = Object.fromEntries((staff || []).map(s => [s.user_id, s.name]));
  res.json({ entries: data || [], writes: (writes || []).map(w => ({ at: w.at, by: w.user_id ? (names[w.user_id] || 'Owner') : 'Server' })) });
}
