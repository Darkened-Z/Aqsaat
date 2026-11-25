// Lock Pro: location trail, faster check-in while lost, FRP with the shop account.

export const NORMAL_CHECKIN_MIN = 360;
export const LOST_CHECKIN_MIN = 15; // WorkManager's floor

export function checkinMinutes(device) {
  return device.status === 'lost' || device.lock_mode === 'force_lock' ? LOST_CHECKIN_MIN : NORMAL_CHECKIN_MIN;
}

// Haversine, metres.
export function distanceM(a, b) {
  const R = 6371000, rad = x => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Keep a point when the phone moved 100 m+, or every 3 h when it sits still — or
// every fix while it's lost, so the trail is useful to the police.
export function keepPoint(last, next, lost, now = Date.now()) {
  if (!last) return true;
  if (lost) return true;
  const age = now - Date.parse(last.at);
  return distanceM(last, next) >= 100 || age >= 3 * 3600000;
}

// Google account IDs (numeric "obfuscated Gaia IDs") — digits only, 1–5 of them.
export function cleanFrpIds(input) {
  return Array.from(new Set(String(input || '').split(/[\s,]+/).map(s => s.trim()).filter(s => /^\d{6,30}$/.test(s)))).slice(0, 5);
}
