import { supabaseAdmin, SHOP_ID } from './serverAuth';

// Read-modify-write of the shop blob with compare-and-swap on updated_at, so a
// server-side change never overwrites a device's save that landed in between.
// `mutate(data)` edits and returns the data, or returns null to write nothing.
export async function updateShopData(mutate) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: row, error: readErr } = await supabaseAdmin
      .from('shops').select('data, updated_at').eq('id', SHOP_ID).single();
    if (readErr) return { error: readErr.message };
    const next = mutate((row && row.data) || {});
    if (!next) return { ok: true, skipped: true };
    const { data: rows, error } = await supabaseAdmin.from('shops')
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq('id', SHOP_ID).eq('updated_at', row.updated_at).select('id');
    if (error) return { error: error.message };
    if (rows && rows.length) return { ok: true };
  }
  return { error: 'shop data busy, try again' };
}
