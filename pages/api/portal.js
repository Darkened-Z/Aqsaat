import { supabaseAdmin, SHOP_ID } from '../../lib/serverAuth';

const digits = s => String(s || '').replace(/[^0-9]/g, '');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const q10 = digits(req.body && req.body.phone).slice(-10);
  if (q10.length < 10) return res.status(400).json({ error: 'invalid_phone' });

  const { data, error } = await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single();
  if (error || !data) return res.status(500).json({ error: 'lookup_failed' });

  const d = data.data || {};
  const customer = (d.customers || []).find(c => !c._deleted &&
    (digits(c.phone).slice(-10) === q10 || digits(c.altPhone).slice(-10) === q10));

  const s = d.settings || {};
  const shop = { businessName: s.businessName || '', shopName: s.shopName || '', shopPhone: s.shopPhone || '' };
  if (!customer) return res.json({ found: false, settings: shop });

  const plans = (d.plans || [])
    .filter(p => !p._deleted && p.customerId === customer.id)
    .map(p => ({ id: p.id, productId: p.productId, voucherNo: p.voucherNo, total: p.total, down: p.down, startDate: p.startDate, status: p.status, schedule: p.schedule || [] }));
  const productIds = new Set(plans.map(p => p.productId));
  const products = (d.products || [])
    .filter(p => productIds.has(p.id))
    .map(p => ({ id: p.id, name: p.name, emoji: p.emoji }));

  res.json({
    found: true,
    customer: { id: customer.id, name: customer.name, phone: customer.phone, avatar: customer.avatar, color: customer.color },
    plans,
    products,
    settings: shop,
  });
}
