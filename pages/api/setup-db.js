import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.json({ ok: true }); // skip if not configured

  const supabaseAdmin = createClient(
    'https://ujxrxbzglcsyppwoazll.supabase.co',
    serviceKey
  );

  const { error } = await supabaseAdmin.from('shops').select('id').limit(1);
  if (error && error.code === '42P01') {
    return res.json({ needsManualSetup: true });
  }
  res.json({ ok: true });
}
