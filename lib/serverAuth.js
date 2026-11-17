import { createClient } from '@supabase/supabase-js';

export const SHOP_ID = 'aqsat-main';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Allows a signed-in shop member (Bearer token from the app) or the local
// scheduled reminder script (x-cron-secret). Sends the error response itself.
export async function requireMember(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] === secret) return true;

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: 'Not signed in' }); return false; }

  const { data: { user } = {} } = await supabaseAdmin.auth.getUser(token);
  if (!user) { res.status(401).json({ error: 'Session expired — sign in again' }); return false; }

  const { data: member } = await supabaseAdmin
    .from('shop_members').select('user_id')
    .eq('shop_id', SHOP_ID).eq('user_id', user.id).maybeSingle();
  if (!member) { res.status(403).json({ error: 'This account has no access to the shop' }); return false; }

  return true;
}
