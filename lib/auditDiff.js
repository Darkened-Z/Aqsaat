// What one save changed, as audit entries: diff of the cloud copy before the write
// against what was written. Merged-in rows from other devices are identical on both
// sides, so only this device's changes show up.

const COLLECTIONS = {
  customers: { entity: 'customer', label: r => r.name },
  products: { entity: 'product', label: r => r.name },
  plans: { entity: 'plan', label: r => r.voucherNo || r.id },
  ledger: { entity: 'ledger', label: r => `${r.category || r.type || 'entry'} ${r.amount != null ? 'Rs ' + r.amount : ''}`.trim() },
  udpiEntries: { entity: 'udhar', label: r => `${r.person || ''} Rs ${r.amount || 0}` },
  staff: { entity: 'staff', label: r => r.name },
  invoices: { entity: 'invoice', label: r => r.no || r.id },
};
const IGNORE = new Set(['updatedAt', 'schedule']);
const NOISY_SETTINGS = new Set(['updatedAt', 'udharMeta', 'lastReportMonth', 'reportMonth']);
const MAX = 60;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function diffShop(before, after) {
  const out = [];
  const custName = id => ((after.customers || []).find(c => c.id === id) || {}).name || '';
  for (const [key, meta] of Object.entries(COLLECTIONS)) {
    const prev = new Map((before[key] || []).filter(r => r && r.id).map(r => [r.id, r]));
    for (const r of after[key] || []) {
      if (!r || !r.id) continue;
      const p = prev.get(r.id);
      const label = meta.label(r) + (key === 'plans' && r.customerId ? ' — ' + custName(r.customerId) : '');
      if (!p) {
        if (!r._deleted) out.push({ action: 'create', entity: meta.entity, entity_id: r.id, summary: `Added ${meta.entity} ${label}` });
        continue;
      }
      if (p === r || same(p, r)) continue;
      if (!p._deleted && r._deleted) { out.push({ action: 'delete', entity: meta.entity, entity_id: r.id, summary: `Deleted ${meta.entity} ${label}` }); continue; }
      if (p._deleted && !r._deleted) { out.push({ action: 'restore', entity: meta.entity, entity_id: r.id, summary: `Restored ${meta.entity} ${label}` }); continue; }

      if (key === 'plans') {
        const ps = new Map((p.schedule || []).map(s => [s.n, s]));
        for (const s of r.schedule || []) {
          const o = ps.get(s.n) || {};
          if (!o.paid && s.paid) out.push({ action: 'pay', entity: 'plan', entity_id: r.id, summary: `Marked installment ${s.n} paid Rs ${s.amountPaid != null ? s.amountPaid : s.amount} — ${label}`, details: { n: s.n, amount: s.amountPaid != null ? s.amountPaid : s.amount, accountId: s.accountId || null } });
          else if (o.paid && !s.paid) out.push({ action: 'unpay', entity: 'plan', entity_id: r.id, summary: `Undid payment of installment ${s.n} (was Rs ${o.amountPaid != null ? o.amountPaid : o.amount}) — ${label}`, details: { n: s.n } });
          else if (o.paid && s.paid && (o.amountPaid !== s.amountPaid || o.paidDate !== s.paidDate)) out.push({ action: 'edit-payment', entity: 'plan', entity_id: r.id, summary: `Changed payment of installment ${s.n}: Rs ${o.amountPaid} → ${s.amountPaid}, ${o.paidDate} → ${s.paidDate} — ${label}` });
          else if (!s.paid && (o.amount !== s.amount || o.dueDate !== s.dueDate) && ps.has(s.n)) out.push({ action: 'edit', entity: 'plan', entity_id: r.id, summary: `Changed installment ${s.n}: Rs ${o.amount} → ${s.amount}, due ${o.dueDate} → ${s.dueDate} — ${label}` });
        }
      }
      const fields = Object.keys({ ...p, ...r }).filter(k => !IGNORE.has(k) && !same(p[k], r[k]));
      if (fields.length) {
        const changes = {};
        fields.slice(0, 8).forEach(k => { changes[k] = [p[k], r[k]]; });
        out.push({ action: 'edit', entity: meta.entity, entity_id: r.id, summary: `Edited ${meta.entity} ${label}: ${fields.join(', ')}`, details: { changes } });
      }
    }
  }
  const sb = before.settings || {}, sa = after.settings || {};
  const changed = Object.keys({ ...sb, ...sa }).filter(k => !NOISY_SETTINGS.has(k) && !same(sb[k], sa[k]));
  if (changed.length) out.push({ action: 'settings', entity: 'settings', entity_id: null, summary: `Changed settings: ${changed.join(', ')}` });
  return out.slice(0, MAX).map(e => ({ ...e, details: trimDetails(e.details) }));
}

// Keep a row small: long strings (photos, notes) are cut.
function trimDetails(d) {
  if (!d) return null;
  const s = JSON.stringify(d, (k, v) => (typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' : v));
  return s.length > 4000 ? { truncated: true } : JSON.parse(s);
}

module.exports = { diffShop };
