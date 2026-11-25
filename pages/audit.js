import React from 'react';
import { C } from '../lib/ui/AuthGate';

const ACTIONS = { create: '➕ Added', delete: '🗑 Deleted', restore: '↩ Restored', edit: '✏️ Edited', pay: '💰 Paid', unpay: '⚠️ Undo pay', 'edit-payment': '✏️ Payment edit', settings: '⚙️ Settings', collect: '🛵 Collected' };
const ROLE = { owner: 'Owner', salesman: 'Salesman', agent: 'Recovery agent', system: 'System' };

export class Audit extends React.Component {
  state = { tab: 'log', entries: null, writes: [], staff: null, f: { actor: '', action: '', q: '', from: '' }, err: '', form: { name: '', username: '', password: '', role: 'salesman' }, busy: false, msg: '' };

  componentDidMount() { this.load(); this.loadStaff(); }

  load = async () => {
    const { actor, action, q, from } = this.state.f;
    const qs = new URLSearchParams({ ...(actor && { actor }), ...(action && { action }), ...(q && { q }), ...(from && { from: from + 'T00:00:00+05:00' }) });
    try { const j = await this.props.api('/api/audit?' + qs); this.setState({ entries: j.entries, writes: j.writes, err: '' }); }
    catch (e) { this.setState({ err: e.message, entries: [] }); }
  };
  loadStaff = async () => { try { this.setState({ staff: (await this.props.api('/api/staff')).staff }); } catch (e) { this.setState({ staff: [] }); } };

  setF = (k, v) => this.setState(s => ({ f: { ...s.f, [k]: v } }), this.load);

  staffAct = async (body, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    this.setState({ busy: true, msg: '' });
    try {
      await this.props.api('/api/staff', { method: 'POST', body });
      if (body.action === 'create') this.setState({ form: { name: '', username: '', password: '', role: 'salesman' } });
      this.setState({ msg: 'Done' });
      this.loadStaff(); this.load();
    } catch (e) { this.setState({ msg: e.message }); }
    this.setState({ busy: false });
  };

  render() {
    const { tab, entries, writes, staff, f, form } = this.state;
    const card = { background: '#fff', border: '1px solid ' + C.line, borderRadius: 16, padding: 16, marginBottom: 14 };
    const inp = { padding: 10, borderRadius: 10, border: '1px solid ' + C.line, boxSizing: 'border-box' };
    const tabBtn = (k, t) => <button onClick={() => this.setState({ tab: k })} style={{ padding: '8px 14px', borderRadius: 999, border: 'none', fontWeight: 700, cursor: 'pointer', background: tab === k ? C.green : '#fff', color: tab === k ? '#fff' : C.ink }}>{t}</button>;
    const actors = Array.from(new Set((entries || []).map(e => e.actor)));
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>{tabBtn('log', 'Activity log')}{tabBtn('staff', 'Staff logins')}{tabBtn('writes', 'Raw saves')}</div>
        {this.state.err ? <div style={{ ...card, color: C.red }}>{this.state.err}{/relation .* does not exist/.test(this.state.err) ? ' — run supabase/009_staff_audit.sql first.' : ''}</div> : null}

        {tab === 'log' ? (
          <div style={card}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <select value={f.actor} onChange={e => this.setF('actor', e.target.value)} style={inp}><option value="">Everyone</option>{actors.map(a => <option key={a}>{a}</option>)}</select>
              <select value={f.action} onChange={e => this.setF('action', e.target.value)} style={inp}><option value="">All actions</option>{Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <input type="date" value={f.from} onChange={e => this.setF('from', e.target.value)} style={inp} />
              <input placeholder="Search (name, voucher…)" value={f.q} onChange={e => this.setState({ f: { ...f, q: e.target.value } })} onKeyDown={e => { if (e.key === 'Enter') this.load(); }} style={{ ...inp, flex: 1, minWidth: 160 }} />
            </div>
            {!entries ? 'Loading…' : !entries.length ? <div style={{ color: C.mut }}>No activity yet.</div> : entries.map(e => (
              <div key={e.id} style={{ borderTop: '1px solid ' + C.line, padding: '9px 0', display: 'flex', gap: 10 }}>
                <div style={{ width: 92, flexShrink: 0, fontSize: 12, color: C.mut }}>{new Date(e.at).toLocaleDateString()}<br />{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14 }}>{e.summary}</div>
                  <div style={{ fontSize: 12, color: C.mut }}>{ACTIONS[e.action] || e.action} · <b style={{ color: e.role === 'owner' ? C.green : C.amber }}>{e.actor}</b> ({ROLE[e.role] || e.role})</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'staff' ? (
          <>
            <div style={card}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Add a staff login</div>
              <div style={{ fontSize: 13, color: C.mut, marginBottom: 10 }}>Salesman: uses the main app, can't open Settings, delete, or lock/unlock phones without the owner PIN. Recovery agent: only the /recovery field app (overdue list + collecting).</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input placeholder="Full name" value={form.name} onChange={e => this.setState({ form: { ...form, name: e.target.value } })} style={inp} />
                <input placeholder="Username" autoCapitalize="none" value={form.username} onChange={e => this.setState({ form: { ...form, username: e.target.value } })} style={inp} />
                <input placeholder="Password" value={form.password} onChange={e => this.setState({ form: { ...form, password: e.target.value } })} style={inp} />
                <select value={form.role} onChange={e => this.setState({ form: { ...form, role: e.target.value } })} style={inp}><option value="salesman">Salesman</option><option value="agent">Recovery agent</option></select>
                <button disabled={this.state.busy} onClick={() => this.staffAct({ action: 'create', ...form })} style={{ padding: '10px 16px', borderRadius: 10, background: C.green, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Create</button>
              </div>
              {this.state.msg ? <div style={{ marginTop: 8, fontSize: 13, color: this.state.msg === 'Done' ? C.green : C.red }}>{this.state.msg}</div> : null}
            </div>
            <div style={card}>
              {!staff ? 'Loading…' : !staff.length ? <div style={{ color: C.mut }}>No staff logins yet.</div> : staff.map(s => (
                <div key={s.user_id} style={{ borderTop: '1px solid ' + C.line, padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', opacity: s.active ? 1 : 0.55 }}>
                  <div style={{ flex: 1, minWidth: 160 }}><b>{s.name}</b> <span style={{ color: C.mut }}>@{s.username}</span><div style={{ fontSize: 12, color: C.mut }}>{ROLE[s.role]}{s.active ? '' : ' · disabled'}</div></div>
                  <button onClick={() => { const p = prompt('New password for ' + s.username + ':'); if (p) this.staffAct({ action: 'password', userId: s.user_id, password: p }); }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid ' + C.line, background: '#fff', cursor: 'pointer' }}>Password</button>
                  <button onClick={() => this.staffAct({ action: s.active ? 'disable' : 'enable', userId: s.user_id }, s.active ? `Disable ${s.name}? They are signed out and can't log in.` : null)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: s.active ? '#fdecea' : C.soft, color: s.active ? C.red : C.green, fontWeight: 700, cursor: 'pointer' }}>{s.active ? 'Disable' : 'Enable'}</button>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {tab === 'writes' ? (
          <div style={card}>
            <div style={{ fontSize: 13, color: C.mut, marginBottom: 8 }}>Every save to the shop data, recorded by the database itself (can't be skipped by the app). Use it to cross-check the activity log.</div>
            {writes.map((w, i) => <div key={i} style={{ borderTop: '1px solid ' + C.line, padding: '6px 0', fontSize: 13 }}>{new Date(w.at).toLocaleString()} — <b>{w.by}</b></div>)}
          </div>
        ) : null}
      </div>
    );
  }
}

export default function AuditPage() {
  React.useEffect(() => { window.location.replace('/?r=audit'); }, []);
  return null;
}
