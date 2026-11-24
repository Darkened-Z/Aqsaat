import { supabaseAdmin, SHOP_ID } from '../../../lib/serverAuth';
import { requireRole, audit, LOGIN_DOMAIN, PASS_SUFFIX } from '../../../lib/staff';

const ROLES = ['salesman', 'agent'];
const BAN = '876000h'; // ~100 years: Supabase's way to disable a login

// Owner-only: staff logins. A salesman is a shop member (uses the main app); an
// agent is not, and only reaches the recovery endpoints.
export default async function handler(req, res) {
  const me = await requireRole(req, res, ['owner']);
  if (!me) return;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('shop_staff').select('user_id, username, name, role, active, created_at')
      .eq('shop_id', SHOP_ID).order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ staff: data || [] });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const b = req.body || {};
  if (b.action === 'create') {
    const username = String(b.username || '').trim().toLowerCase();
    const name = String(b.name || '').trim();
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ error: 'Username: 3–30 letters/numbers, no spaces' });
    if (!name) return res.status(400).json({ error: 'Name required' });
    if (!ROLES.includes(b.role)) return res.status(400).json({ error: 'Role must be salesman or agent' });
    if (String(b.password || '').length < 4) return res.status(400).json({ error: 'Password: at least 4 characters' });
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: username + LOGIN_DOMAIN, password: b.password + PASS_SUFFIX, email_confirm: true,
    });
    if (error) return res.status(400).json({ error: /already/i.test(error.message) ? 'That username is taken' : error.message });
    const uid = created.user.id;
    const { error: e2 } = await supabaseAdmin.from('shop_staff').insert({ user_id: uid, shop_id: SHOP_ID, username, name, role: b.role, active: true });
    if (e2) { await supabaseAdmin.auth.admin.deleteUser(uid); return res.status(500).json({ error: e2.message }); }
    if (b.role === 'salesman') await supabaseAdmin.from('shop_members').insert({ shop_id: SHOP_ID, user_id: uid });
    await audit(me, [{ action: 'staff-create', entity: 'login', entity_id: username, summary: `Created ${b.role} login "${username}" for ${name}` }]);
    return res.json({ ok: true });
  }

  const { data: st } = await supabaseAdmin.from('shop_staff').select('*').eq('user_id', b.userId || '').eq('shop_id', SHOP_ID).maybeSingle();
  if (!st) return res.status(404).json({ error: 'Staff login not found' });

  if (b.action === 'disable' || b.action === 'enable') {
    const on = b.action === 'enable';
    await supabaseAdmin.auth.admin.updateUserById(st.user_id, { ban_duration: on ? 'none' : BAN });
    await supabaseAdmin.from('shop_staff').update({ active: on }).eq('user_id', st.user_id);
    if (st.role === 'salesman') {
      if (on) await supabaseAdmin.from('shop_members').upsert({ shop_id: SHOP_ID, user_id: st.user_id });
      else await supabaseAdmin.from('shop_members').delete().eq('shop_id', SHOP_ID).eq('user_id', st.user_id);
    }
    await audit(me, [{ action: 'staff-' + b.action, entity: 'login', entity_id: st.username, summary: `${on ? 'Enabled' : 'Disabled'} login "${st.username}" (${st.name})` }]);
    return res.json({ ok: true });
  }
  if (b.action === 'password') {
    if (String(b.password || '').length < 4) return res.status(400).json({ error: 'Password: at least 4 characters' });
    const { error } = await supabaseAdmin.auth.admin.updateUserById(st.user_id, { password: b.password + PASS_SUFFIX });
    if (error) return res.status(500).json({ error: error.message });
    await audit(me, [{ action: 'staff-password', entity: 'login', entity_id: st.username, summary: `Reset password for "${st.username}"` }]);
    return res.json({ ok: true });
  }
  res.status(400).json({ error: 'unknown action' });
}
