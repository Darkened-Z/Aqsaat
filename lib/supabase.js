import { createClient } from '@supabase/supabase-js';

// The default cross-tab Web Lock can deadlock getSession() on iOS Safari /
// home-screen PWAs, leaving the app on "Loading…" forever. One tab is the norm here.
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { lock: async (_name, _timeout, fn) => fn() },
});
export const SHOP_ID  = 'aqsat-main';

export const getSessionSafe = (ms = 6000) => Promise.race([
  supabase.auth.getSession(),
  new Promise(r => setTimeout(() => r({ data: { session: null }, error: new Error('timeout') }), ms)),
]);
