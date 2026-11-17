import crypto from 'crypto';

// Offline unlock code. The phone computes the same value from the same per-device
// secret with no network, so the owner can read today's code to a customer who is
// offline or locked out. Big-endian uint32 of the last 4 HMAC bytes, mod 1e6.
export function dayNumber(ms = Date.now()) {
  return Math.floor(ms / 86400000);
}

export function unlockCode(secret, day = dayNumber()) {
  const mac = crypto.createHmac('sha256', String(secret)).update('unlock:' + day).digest();
  const n = mac.readUInt32BE(mac.length - 4) % 1000000;
  return String(n).padStart(6, '0');
}

export function newSecret() {
  return crypto.randomBytes(24).toString('hex');
}

export function newDeviceId() {
  return 'dev_' + crypto.randomBytes(9).toString('hex');
}

const DEFAULT_GRACE = 3;        // overdue days tolerated before a hard lock
export const OFFLINE_LOCK_DAYS = 7; // phone hard-locks if it can't reach the server this long

function daysBetween(fromYmd, toYmd) {
  const a = Date.parse(fromYmd + 'T00:00:00Z');
  const b = Date.parse(toYmd + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

// Decide what a device should do. Fail-open on missing/ambiguous data so a bad
// record never bricks a phone — a genuinely stolen phone is handled by the owner
// flipping status to 'lost' / lock_mode to 'force_lock'.
export function evaluate(device, shopData, now = Date.now()) {
  if (device.status === 'released') return { action: 'release', message: 'Account closed. Thank you.' };
  if (device.status === 'lost' || device.lock_mode === 'force_lock')
    return { action: 'lock', reason: 'manual', message: 'This phone is locked. Please contact the shop.' };
  if (device.lock_mode === 'force_unlock') return { action: 'ok' };

  const plan = (shopData.plans || []).find(p => p.id === device.plan_id && !p._deleted);
  if (!plan) return { action: 'ok' }; // no plan on file → don't lock
  const unpaid = (plan.schedule || []).filter(s => !s.paid);
  if (unpaid.length === 0) return { action: 'ok' }; // fully paid

  const today = new Date(now).toISOString().slice(0, 10);
  let overdue = 0;
  unpaid.forEach(s => {
    if (s.dueDate && s.dueDate < today) {
      const d = daysBetween(s.dueDate, today);
      if (d > overdue) overdue = d;
    }
  });
  if (overdue === 0) return { action: 'ok' };

  const grace = device.grace_days != null ? device.grace_days
    : ((shopData.settings && shopData.settings.graceDays) || DEFAULT_GRACE);
  if (overdue <= grace)
    return { action: 'warn', overdue, message: `Installment ${overdue} day(s) overdue. Please pay to avoid lock.` };
  return { action: 'lock', overdue, message: `Installment overdue. Phone locked — please contact the shop.` };
}
