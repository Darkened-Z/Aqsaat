import { supabaseAdmin, SHOP_ID } from './serverAuth';

export const LOGIN_DOMAIN = '@aqsaat.local';
export const PASS_SUFFIX = '.Aqsat9';

// Who is calling: 'owner' (shop member, not a staff login), 'salesman', 'agent',
// or 'system' (the shop-PC cron secret). Null = not allowed at all.
export async function whoAmI(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] === secret) return { role: 'system', name: 'System', userId: null };
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: { user } = {} } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  const { data: staff } = await supabaseAdmin.from('shop_staff').select('role, name, active, username')
    .eq('user_id', user.id).eq('shop_id', SHOP_ID).maybeSingle();
  if (staff) return staff.active ? { role: staff.role, name: staff.name, username: staff.username, userId: user.id } : null;
  const { data: member } = await supabaseAdmin.from('shop_members').select('user_id')
    .eq('shop_id', SHOP_ID).eq('user_id', user.id).maybeSingle();
  return member ? { role: 'owner', name: 'Owner', userId: user.id } : null;
}

// Sends the error itself; returns the caller or null.
export async function requireRole(req, res, roles) {
  const me = await whoAmI(req);
  if (!me) { res.status(401).json({ error: 'Not signed in or no access' }); return null; }
  if (!roles.includes(me.role)) { res.status(403).json({ error: 'Owner only' }); return null; }
  return me;
}

export async function audit(me, entries) {
  const rows = entries.map(e => ({
    shop_id: SHOP_ID, user_id: me.userId, actor: me.name, role: me.role,
    action: String(e.action || '').slice(0, 40), entity: e.entity ? String(e.entity).slice(0, 40) : null,
    entity_id: e.entity_id ? String(e.entity_id).slice(0, 80) : null,
    summary: String(e.summary || '').slice(0, 500), details: e.details || null,
  })).filter(r => r.action && r.summary);
  if (!rows.length) return { ok: true };
  const { error } = await supabaseAdmin.from('audit_log').insert(rows);
  return error ? { error: error.message } : { ok: true };
}
