// Remote fixes the shop can send to a phone from /devices, so a stuck phone can be
// sorted out without a new app version. The phone (v1.23+) runs each one at its
// next check-in and acks it; acked ones are dropped from the queue.

export const COMMAND_OPS = {
  clear_restriction: { label: 'Lift a restriction', arg: /^(no_)?[a-z_]{3,60}$/, hint: 'e.g. config_mobile_networks' },
  show_app: { label: 'Unblock an app', arg: /^[A-Za-z][\w]*(\.[A-Za-z][\w]*)+$/, hint: 'package, e.g. com.whatsapp' },
  restore_apps: { label: 'Restore preloaded apps', arg: null },
  clear_pinning: { label: 'Clear screen pinning', arg: null },
  reapply: { label: 'Re-apply shop policies', arg: null },
};

export function newCommand(op, arg) {
  const spec = COMMAND_OPS[op];
  if (!spec) return { error: 'unknown fix' };
  const a = String(arg || '').trim();
  if (spec.arg && !spec.arg.test(a)) return { error: `Needs ${spec.hint}` };
  return { cmd: { id: Math.random().toString(36).slice(2, 10), op, arg: spec.arg ? a : '', at: new Date().toISOString() } };
}

// What's still queued after the phone acked `done` (ids).
export function pending(commands, done) {
  const ids = new Set((Array.isArray(done) ? done : []).map(String));
  return (Array.isArray(commands) ? commands : []).filter(c => c && !ids.has(String(c.id)));
}
