import crypto from 'crypto';
import { supabaseAdmin, SHOP_ID } from './serverAuth';

// Firebase Cloud Messaging (HTTP v1) with a service-account key from
// FCM_SERVICE_ACCOUNT (the JSON, raw or base64). Unset = push disabled.
function serviceAccount() {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const sa = JSON.parse(json);
    return sa.client_email && sa.private_key && sa.project_id ? sa : null;
  } catch (e) { return null; }
}

let cached = { token: null, exp: 0 };

async function accessToken(sa) {
  if (cached.token && Date.now() < cached.exp - 60000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  });
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error('fcm auth failed: ' + (j.error_description || j.error || r.status));
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cached.token;
}

// Data-only, high priority: wakes the app to check in now. Carries no command, so
// the authenticated check-in stays the only source of truth.
// Returns 'sent' | 'disabled' | 'no-token' | 'stale' | 'error'.
export async function sendCheckin(pushToken) {
  const sa = serviceAccount();
  if (!sa) return 'disabled';
  if (!pushToken) return 'no-token';
  try {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + await accessToken(sa), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token: pushToken, data: { type: 'checkin' }, android: { priority: 'high', ttl: '3600s' } } }),
    });
    if (r.ok) return 'sent';
    const j = await r.json().catch(() => ({}));
    const code = j.error && j.error.details && j.error.details.find(d => d.errorCode)?.errorCode;
    return r.status === 404 || code === 'UNREGISTERED' ? 'stale' : 'error';
  } catch (e) { return 'error'; }
}

// Wake one device (by id) or every live device on a plan. Best effort: the 6h
// heartbeat still applies if the push is lost. Clears tokens FCM reports dead.
export async function pokeDevices({ deviceId, planId }) {
  if (!serviceAccount()) return [];
  let q = supabaseAdmin.from('devices').select('id, push_token').eq('shop_id', SHOP_ID).neq('status', 'deleted');
  q = deviceId ? q.eq('id', deviceId) : q.eq('plan_id', planId);
  const { data } = await q;
  const out = [];
  for (const d of data || []) {
    const res = await sendCheckin(d.push_token);
    if (res === 'stale') await supabaseAdmin.from('devices').update({ push_token: null }).eq('id', d.id);
    out.push({ id: d.id, res });
  }
  return out;
}
