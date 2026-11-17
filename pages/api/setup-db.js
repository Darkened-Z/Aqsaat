import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.json({ ok: true }); // skip if not configured

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey);

  const { error } = await supabaseAdmin.from('shops').select('id').limit(1);
  if (error && error.code === '42P01') {
    return res.json({ needsManualSetup: true });
  }
  res.json({ ok: true });
}
