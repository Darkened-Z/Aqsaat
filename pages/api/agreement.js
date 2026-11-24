import crypto from 'crypto';
import { supabaseAdmin, SHOP_ID, requireMember } from '../../lib/serverAuth';
import { updateShopData } from '../../lib/shopData';
import { planFacts, termsFor, parseSignature } from '../../lib/agreement';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };
const WHO = ['customer', 'guarantor', 'shop'];
const BUCKET = 'agreements';

async function signedUrls(paths) {
  const out = {};
  for (const [who, path] of Object.entries(paths || {})) {
    const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (data) out[who] = data.signedUrl;
  }
  return out;
}

// Shop members only. GET: what goes on the agreement (+ signature images if signed).
// POST sign: stores the drawn signatures privately and stamps the plan.
// POST terms: the shop's own clauses (the device-lock consent clause is fixed).
export default async function handler(req, res) {
  if (!(await requireMember(req, res))) return;
  const load = async () => ((await supabaseAdmin.from('shops').select('data').eq('id', SHOP_ID).single()).data || {}).data || {};

  if (req.method === 'GET') {
    const shop = await load();
    const facts = planFacts(shop, String(req.query.planId || ''));
    if (!facts) return res.status(404).json({ error: 'Plan not found' });
    const a = facts.agreement;
    return res.json({ ...facts, terms: a && a.terms ? a.terms : termsFor(shop.settings), signatures: a ? await signedUrls(a.sigPaths) : {} });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};

  if (b.action === 'terms') {
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 15)
      .map(t => ({ en: String(t.en || '').trim().slice(0, 600), ur: String(t.ur || '').trim().slice(0, 600) }))
      .filter(t => t.en || t.ur);
    const r = await updateShopData(d => ({ ...d, settings: { ...(d.settings || {}), agreementTerms: { items, updatedAt: new Date().toISOString() } } }));
    return r.error ? res.status(500).json(r) : res.json({ ok: true });
  }

  if (b.action !== 'sign') return res.status(400).json({ error: 'unknown action' });
  const planId = String(b.planId || '');
  const sigs = {};
  for (const who of WHO) {
    if (!b.sigs || !b.sigs[who]) continue;
    const buf = parseSignature(b.sigs[who]);
    if (!buf) return res.status(400).json({ error: `The ${who} signature is not a valid drawing` });
    sigs[who] = buf;
  }
  if (!sigs.customer) return res.status(400).json({ error: 'The customer must sign' });
  if (!sigs.shop) return res.status(400).json({ error: 'The shop must sign' });

  const shop = await load();
  const facts = planFacts(shop, planId);
  if (!facts) return res.status(404).json({ error: 'Plan not found' });
  if (facts.agreement && facts.agreement.signedAt) return res.status(409).json({ error: 'Already signed' });

  const stamp = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
  const sigPaths = {};
  for (const [who, buf] of Object.entries(sigs)) {
    const path = `${planId}/${stamp}-${who}.png`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, { contentType: 'image/png', upsert: false });
    if (error) return res.status(500).json({ error: 'Upload failed: ' + error.message });
    sigPaths[who] = path;
  }
  // The terms exactly as shown at signing, so later edits never change a signed copy.
  const agreement = { signedAt: new Date().toISOString(), terms: termsFor(shop.settings), sigPaths, facts: { ...facts, agreement: undefined } };
  let clash = false;
  const r = await updateShopData((d) => {
    const plans = (d.plans || []).slice();
    const i = plans.findIndex(p => p && p.id === planId && !p._deleted);
    if (i < 0) return null;
    if (plans[i].agreement && plans[i].agreement.signedAt) { clash = true; return null; }
    plans[i] = { ...plans[i], agreement, updatedAt: agreement.signedAt };
    return { ...d, plans };
  });
  if (r.error) return res.status(500).json(r);
  if (clash) return res.status(409).json({ error: 'Already signed' });
  res.json({ ok: true, signedAt: agreement.signedAt });
}
