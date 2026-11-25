import { whoAmI } from '../../../lib/staff';

export default async function handler(req, res) {
  const me = await whoAmI(req);
  if (!me) return res.status(401).json({ error: 'No access' });
  res.json({ role: me.role, name: me.name, username: me.username || null });
}
