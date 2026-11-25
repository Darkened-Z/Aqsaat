// IMEI / serial-level stock. Units live on their product (product.units) so they
// sync with the product row; product.stock is kept equal to the in-stock count.

const PK = 5 * 3600000;
const today = (now = Date.now()) => new Date(now + PK).toISOString().slice(0, 10);
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

export function luhnOk(imei) {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = +imei[14 - i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export const normCode = s => String(s || '').replace(/[\s-]/g, '').toUpperCase();

function inStock(p) { return (p.units || []).filter(u => !u._deleted && u.status === 'in_stock').length; }

/** Link plans to units by IMEI/serial; returns { data, changed, linked: [...] }. */
export function reconcile(data, now = Date.now()) {
  const nowIso = new Date(now).toISOString();
  const byCode = new Map();
  (data.products || []).forEach((p, pi) => (p.units || []).forEach((u, ui) => {
    if (u._deleted) return;
    [u.imei, u.imei2, u.serial].filter(Boolean).forEach(c => byCode.set(normCode(c), { pi, ui }));
  }));
  const products = (data.products || []).map(p => ({ ...p, units: (p.units || []).slice() }));
  const touched = new Set();
  const linked = [];
  for (const pl of data.plans || []) {
    if (!pl || pl._deleted) continue;
    for (const code of [pl.imei, pl.serialNo, pl.chassisNo].filter(Boolean)) {
      const hit = byCode.get(normCode(code));
      if (!hit) continue;
      const u = products[hit.pi].units[hit.ui];
      // A unit returned from this plan must not be re-sold to it just because the plan still carries the IMEI.
      if ((u.returnedFrom || []).includes(pl.id)) continue;
      if (u.status === 'in_stock' || (u.status === 'sold' && !u.planId)) {
        products[hit.pi].units[hit.ui] = { ...u, status: 'sold', planId: pl.id, soldAt: pl.startDate || today(now) };
        touched.add(hit.pi); linked.push({ planId: pl.id, unitId: u.id });
      }
    }
  }
  products.forEach((p, i) => {
    if (!(p.units || []).length) return;
    const n = inStock(p);
    if (touched.has(i) || p.stock !== n) { products[i] = { ...p, stock: n, updatedAt: nowIso }; touched.add(i); }
  });
  if (!touched.size) return { data, changed: false, linked };
  return { data: { ...data, products: products.map((p, i) => (touched.has(i) ? p : data.products[i])) }, changed: true, linked };
}

/** Owner view: units with who bought them, profit per sold unit, aging of what's left. */
export function stockReport(data, now = Date.now()) {
  const t = today(now);
  const plans = new Map((data.plans || []).filter(p => p && !p._deleted).map(p => [p.id, p]));
  const customers = new Map((data.customers || []).map(c => [c.id, c]));
  const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  let soldProfit = 0, soldCount = 0, stockValue = 0;
  const products = (data.products || []).filter(p => !p._deleted).map(p => {
    const units = (p.units || []).filter(u => !u._deleted).map(u => {
      const pl = u.planId ? plans.get(u.planId) : null;
      const age = u.addedAt ? days(u.addedAt.slice(0, 10), t) : 0;
      const sale = pl ? (pl.total || 0) : 0;
      const profit = pl && u.cost ? sale - u.cost : null;
      if (u.status === 'in_stock') {
        stockValue += u.cost || 0;
        aging[age <= 30 ? '0-30' : age <= 60 ? '31-60' : age <= 90 ? '61-90' : '90+']++;
      } else if (profit != null) { soldProfit += profit; soldCount++; }
      return { ...u, age, sale, profit, customer: pl ? ((customers.get(pl.customerId) || {}).name || '') : '', voucher: pl ? pl.voucherNo || '' : '' };
    });
    const left = units.filter(u => u.status === 'in_stock');
    return { id: p.id, name: p.name, category: p.category, units, inStock: left.length, oldest: left.reduce((m, u) => Math.max(m, u.age), 0) };
  });
  const slow = products.filter(p => p.inStock && p.oldest > 60).sort((a, b) => b.oldest - a.oldest).map(p => ({ id: p.id, name: p.name, inStock: p.inStock, oldest: p.oldest }));
  return { products, aging, slow, soldProfit, soldCount, stockValue };
}

/** Adds units after validation; returns { data, added, errors }. */
export function addUnits(data, productId, rows, now = Date.now()) {
  const products = (data.products || []).slice();
  const pi = products.findIndex(p => p && p.id === productId && !p._deleted);
  if (pi < 0) return { errors: ['Product not found'] };
  const existing = new Set();
  products.forEach(p => (p.units || []).forEach(u => { if (!u._deleted) [u.imei, u.imei2, u.serial].filter(Boolean).forEach(c => existing.add(normCode(c))); }));
  const isPhone = /mobile|phone|tablet/i.test(products[pi].category || '') || /phone|mobile/i.test(products[pi].name || '');
  const errors = [];
  const add = [];
  rows.forEach((r, i) => {
    const imei = normCode(r.imei), imei2 = normCode(r.imei2), serial = normCode(r.serial);
    const code = imei || serial;
    if (!code) { errors.push(`Row ${i + 1}: IMEI or serial required`); return; }
    if (isPhone && imei && !luhnOk(imei)) { errors.push(`Row ${i + 1}: ${imei} is not a valid IMEI`); return; }
    if (imei2 && !luhnOk(imei2)) { errors.push(`Row ${i + 1}: ${imei2} is not a valid IMEI`); return; }
    if ([imei, imei2, serial].filter(Boolean).some(c => existing.has(c))) { errors.push(`Row ${i + 1}: ${code} is already in stock records`); return; }
    [imei, imei2, serial].filter(Boolean).forEach(c => existing.add(c));
    add.push({ id: 'u_' + now.toString(36) + '_' + i, imei: imei || '', imei2: imei2 || '', serial: serial || '', cost: Math.max(0, Math.round(+r.cost || 0)) || products[pi].costPrice || 0, supplier: String(r.supplier || '').slice(0, 60), addedAt: new Date(now).toISOString(), status: 'in_stock' });
  });
  if (!add.length) return { errors };
  const units = [...(products[pi].units || []), ...add];
  products[pi] = { ...products[pi], units, stock: units.filter(u => !u._deleted && u.status === 'in_stock').length, updatedAt: new Date(now).toISOString() };
  return { data: { ...data, products }, added: add.length, errors };
}

/** remove (soft) | return (customer brought it back → in stock, unlinked). */
export function changeUnit(data, unitId, action, now = Date.now()) {
  const products = (data.products || []).slice();
  for (let pi = 0; pi < products.length; pi++) {
    const units = products[pi].units || [];
    const ui = units.findIndex(u => u.id === unitId);
    if (ui < 0) continue;
    const u = units[ui];
    const next = action === 'remove' ? { ...u, _deleted: true }
      : action === 'return' ? { ...u, status: 'in_stock', planId: null, soldAt: null, returnedAt: new Date(now).toISOString(), returnedFrom: [...(u.returnedFrom || []), u.planId].filter(Boolean) } : null;
    if (!next) return { error: 'unknown action' };
    const nu = units.slice(); nu[ui] = next;
    products[pi] = { ...products[pi], units: nu, stock: nu.filter(x => !x._deleted && x.status === 'in_stock').length, updatedAt: new Date(now).toISOString() };
    return { data: { ...data, products } };
  }
  return { error: 'Unit not found' };
}
