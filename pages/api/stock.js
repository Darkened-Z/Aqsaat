import { supabaseAdmin, SHOP_ID, requireMember } from '../../lib/serverAuth';
import { updateShopData } from '../../lib/shopData';
import { reconcile, stockReport, addUnits, changeUnit } from '../../lib/stock';

// Shop members. GET links new plans to units by IMEI/serial (writes only if
// something changed) and returns the stock report. POST add | remove | return.
export default async function handler(req, res) {
  if (!(await requireMember(req, res))) return;

  if (req.method === 'GET') {
    let report = null;
    const r = await updateShopData((d) => {
      const rec = reconcile(d);
      report = stockReport(rec.data);
      return rec.changed ? rec.data : null;
    });
    if (r.error) return res.status(500).json(r);
    return res.json(report);
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};
  let out = {};
  const r = await updateShopData((d) => {
    out = b.action === 'add' ? addUnits(d, b.productId, Array.isArray(b.units) ? b.units.slice(0, 200) : [])
      : changeUnit(d, b.unitId, b.action);
    return out.data || null;
  });
  if (r.error) return res.status(500).json(r);
  if (out.error) return res.status(400).json({ error: out.error });
  if (!out.data) return res.status(400).json({ error: (out.errors || []).join('\n') || 'Nothing added' });
  res.json({ ok: true, added: out.added || 0, errors: out.errors || [] });
}
