import { requireMember } from '../../../lib/serverAuth';
import { pokeDevices } from '../../../lib/fcm';

// Owner-only. The main app calls this after a payment change has synced, so the
// plan's phone checks in now (unlocks on pay, relocks on undo) instead of in ~6h.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireMember(req, res))) return;
  const planIds = Array.isArray(req.body && req.body.planIds) ? req.body.planIds.filter(x => typeof x === 'string').slice(0, 20) : [];
  const results = [];
  for (const planId of planIds) results.push(...await pokeDevices({ planId }));
  res.json({ ok: true, results });
}
