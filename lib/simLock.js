// SIM lock: a phone is bound to the SIM(s) in it when the shop registers them
// (automatically at the first readable report). The phone mirrors this check
// offline in SimGuard.kt, so both must agree on what "changed" means.

export const SIM_MESSAGE = 'Original SIM card not found. Insert the shop-registered SIM or contact the shop.';
export const SIM_MODES = ['lock', 'alert', 'off'];

const iccidOk = s => /^[0-9A-F]{10,22}$/.test(s);

export function cleanSim(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const iccids = [...new Set((Array.isArray(raw.iccids) ? raw.iccids : []).map(s => String(s).trim().toUpperCase()).filter(iccidOk))].slice(0, 4);
  const slots = (Array.isArray(raw.slots) ? raw.slots : []).slice(0, 4).map(s => ({
    slot: Number.isInteger(s && s.slot) ? s.slot : null,
    iccid: iccidOk(String((s && s.iccid) || '').toUpperCase()) ? String(s.iccid).toUpperCase() : '',
    carrier: String((s && s.carrier) || '').slice(0, 40),
    number: String((s && s.number) || '').replace(/[^\d+]/g, '').slice(0, 20),
  }));
  return { readable: raw.readable === true && iccids.length > 0, absent: raw.absent === true, iccids, slots };
}

// true = foreign SIM in, or none of the registered SIMs present (incl. no SIM at all);
// false = matches; null = can't tell (nothing registered yet, or SIM IDs unreadable).
export function simChanged(baseline, sim) {
  const base = Array.isArray(baseline) ? baseline : [];
  if (!base.length || !sim) return null;
  if (sim.absent) return true;
  if (!sim.readable) return null;
  return sim.iccids.some(i => !base.includes(i)) || !sim.iccids.some(i => base.includes(i));
}

// What the check-in should write and answer for this report.
export function simCheck(device, sim) {
  const patch = {};
  let baseline = Array.isArray(device.sim_baseline) ? device.sim_baseline : [];
  if (sim) patch.sim_current = sim;
  if (!baseline.length && sim && sim.readable) {
    baseline = sim.iccids;
    patch.sim_baseline = baseline;
  }
  const changed = simChanged(baseline, sim);
  if (changed === true && !device.sim_changed_at) patch.sim_changed_at = new Date().toISOString();
  if (changed === false && device.sim_changed_at) patch.sim_changed_at = null;
  let mode = SIM_MODES.includes(device.sim_mode) ? device.sim_mode : 'lock';
  // The owner's explicit force-unlock wins; the SIM change is still flagged.
  if (mode === 'lock' && device.lock_mode === 'force_unlock') mode = 'alert';
  return { patch, baseline, changed, mode, lock: changed === true && mode === 'lock' };
}

const str = (v, n = 60) => (v == null ? '' : String(v).slice(0, n));
export function cleanInfo(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const num = v => (Number.isFinite(v) ? v : null);
  return {
    imei1: str(raw.imei1, 20), imei2: str(raw.imei2, 20), serial: str(raw.serial, 40),
    brand: str(raw.brand, 30), model: str(raw.model, 40), android: str(raw.android, 10), sdk: num(raw.sdk),
    battery: num(raw.battery), charging: raw.charging === true, network: str(raw.network, 12),
  };
}
