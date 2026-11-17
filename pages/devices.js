import React from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

const C = { green: '#0f6b4b', red: '#b91c1c', amber: '#b45309', ink: '#1a2b1f', mut: '#7a7663', line: '#ece8dc', bg: '#f7f5ef' };

export default class Devices extends React.Component {
  state = {
    authUser: undefined, email: '', password: '', authErr: '', busy: false,
    devices: null, error: '', enroll: null, enrollBusy: false,
    form: { label: '', planId: '', customerId: '', graceDays: '' },
  };

  async componentDidMount() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) this.onAuthed(session.user); else this.setState({ authUser: null });
  }
  onAuthed = (user) => { this.setState({ authUser: user }); this.load(); };

  token = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? session.access_token : '';
  };
  api = async (method, body) => {
    const t = await this.token();
    const resp = await fetch('/api/device/manage', {
      method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
      body: body ? JSON.stringify(body) : undefined,
    });
    return resp;
  };

  signIn = async () => {
    if (!this.state.email.trim() || !this.state.password) { this.setState({ authErr: 'Enter email and password' }); return; }
    this.setState({ busy: true, authErr: '' });
    const { data, error } = await supabase.auth.signInWithPassword({ email: this.state.email.trim(), password: this.state.password });
    if (error) { this.setState({ busy: false, authErr: error.message }); return; }
    this.setState({ busy: false, password: '' });
    this.onAuthed(data.user);
  };
  signOut = async () => { await supabase.auth.signOut(); this.setState({ authUser: null, devices: null }); };

  load = async () => {
    try {
      const resp = await this.api('GET');
      if (!resp.ok) throw new Error((await resp.json()).error || 'load failed');
      this.setState({ devices: (await resp.json()).devices, error: '' });
    } catch (e) { this.setState({ error: e.message }); }
  };

  act = async (deviceId, action, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    const resp = await this.api('POST', { deviceId, action });
    if (!resp.ok) { alert((await resp.json()).error || 'action failed'); return; }
    this.load();
  };

  enroll = async () => {
    this.setState({ enrollBusy: true });
    try {
      const t = await this.token();
      const resp = await fetch('/api/device/enroll', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify(this.state.form),
      });
      if (!resp.ok) throw new Error((await resp.json()).error || 'enroll failed');
      const r = await resp.json();
      this.setState({ enroll: r, form: { label: '', planId: '', customerId: '', graceDays: '' } });
      this.load();
    } catch (e) { alert(e.message); }
    this.setState({ enrollBusy: false });
  };

  render() {
    const { authUser } = this.state;
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: C.ink }}>
        <Head><title>Devices — Aqsat</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
        {authUser === undefined ? <div style={{ padding: 40, color: C.mut }}>Loading…</div>
          : authUser === null ? this.renderLogin() : this.renderApp()}
      </div>
    );
  }

  renderLogin() {
    const inp = { width: '100%', border: '1.5px solid ' + C.line, borderRadius: 12, padding: '12px 14px', fontSize: 15, background: '#fdfcf8', outline: 'none', boxSizing: 'border-box', marginBottom: 10 };
    const onKey = e => { if (e.key === 'Enter') this.signIn(); };
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 20, padding: 24, border: '1px solid ' + C.line }}>
          <div style={{ fontSize: 20, fontWeight: 800, textAlign: 'center' }}>Device Lock</div>
          <div style={{ fontSize: 13, color: C.mut, textAlign: 'center', marginBottom: 20 }}>Sign in with your shop account</div>
          <input type="email" placeholder="Email" value={this.state.email} onChange={e => this.setState({ email: e.target.value, authErr: '' })} onKeyDown={onKey} style={inp} />
          <input type="password" placeholder="Password" value={this.state.password} onChange={e => this.setState({ password: e.target.value, authErr: '' })} onKeyDown={onKey} style={inp} />
          {this.state.authErr ? <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 10, textAlign: 'center' }}>{this.state.authErr}</div> : null}
          <button onClick={this.signIn} disabled={this.state.busy} style={{ width: '100%', padding: 13, borderRadius: 12, background: this.state.busy ? C.mut : C.green, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>{this.state.busy ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </div>
    );
  }

  renderApp() {
    const { devices, error, enroll, form } = this.state;
    const fi = { border: '1px solid ' + C.line, borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fdfcf8', outline: 'none', width: '100%', boxSizing: 'border-box' };
    const badge = (cur) => {
      const m = { ok: ['#eaf5ee', C.green, 'OK'], warn: ['#fef3c7', C.amber, 'WARNING'], lock: ['#fdecea', C.red, 'LOCKED'], release: ['#eef2ff', '#4338ca', 'RELEASED'] }[cur] || ['#f4f1e6', C.mut, cur];
      return <span style={{ background: m[0], color: m[1], fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8 }}>{m[2]}</span>;
    };
    const btn = (label, bg, col, onClick) => <button onClick={onClick} style={{ padding: '6px 10px', borderRadius: 8, background: bg, color: col, fontWeight: 600, fontSize: 12, border: '1px solid ' + C.line, cursor: 'pointer' }}>{label}</button>;

    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '20px 16px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Device Lock</div>
            <div style={{ fontSize: 12, color: C.mut }}>Enrolled phones on installment</div>
          </div>
          <button onClick={this.load} style={{ marginRight: 8, padding: '8px 12px', borderRadius: 10, background: '#fff', border: '1px solid ' + C.line, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>↻ Refresh</button>
          <button onClick={this.signOut} style={{ padding: '8px 12px', borderRadius: 10, background: '#f4f1e6', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Sign out</button>
        </div>

        <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Enroll a new phone</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input placeholder="Label (model / IMEI)" value={form.label} onChange={e => this.setState({ form: { ...form, label: e.target.value } })} style={fi} />
            <input placeholder="Plan voucher / ID (optional)" value={form.planId} onChange={e => this.setState({ form: { ...form, planId: e.target.value } })} style={fi} />
            <input placeholder="Customer ID (optional)" value={form.customerId} onChange={e => this.setState({ form: { ...form, customerId: e.target.value } })} style={fi} />
            <input placeholder="Grace days (blank = shop default)" value={form.graceDays} onChange={e => this.setState({ form: { ...form, graceDays: e.target.value } })} style={fi} />
          </div>
          <button onClick={this.enroll} disabled={this.state.enrollBusy} style={{ padding: '10px 16px', borderRadius: 10, background: C.green, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>{this.state.enrollBusy ? 'Creating…' : '+ Create enrollment'}</button>
          {enroll ? (
            <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 6 }}>Paste this into the phone app (Device Lock → Enroll), then set Device Owner by USB:</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', background: '#fff', border: '1px solid ' + C.line, borderRadius: 8, padding: 10, userSelect: 'all' }}>{enroll.enrollString}</div>
              <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(enroll.enrollString); }} style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, background: '#fff', border: '1px solid ' + C.line, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Copy</button>
            </div>
          ) : null}
        </div>

        {error ? <div style={{ color: C.red, marginBottom: 12 }}>{error}</div> : null}
        {devices === null ? <div style={{ color: C.mut }}>Loading…</div>
          : devices.length === 0 ? <div style={{ color: C.mut, textAlign: 'center', padding: 30 }}>No devices enrolled yet.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {devices.map(d => (
                <div key={d.id} style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 14, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{d.label || d.id}</div>
                      <div style={{ fontSize: 12, color: C.mut }}>{[d.customer, d.plan].filter(Boolean).join(' · ') || '—'}</div>
                    </div>
                    {badge(d.current)}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: C.mut, marginBottom: 10 }}>
                    <span>Mode: <b style={{ color: C.ink }}>{d.lockMode}</b></span>
                    <span>Status: <b style={{ color: C.ink }}>{d.status}</b></span>
                    <span>Last check-in: <b style={{ color: C.ink }}>{d.lastCheckin ? new Date(d.lastCheckin).toLocaleString() : 'never'}</b></span>
                    <span>Today's unlock code: <b style={{ color: C.green, fontFamily: 'monospace', fontSize: 14 }}>{d.unlockCode}</b></span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {btn('🔒 Lock', '#fdecea', C.red, () => this.act(d.id, 'lock', 'Force-lock this phone now?'))}
                    {btn('🔓 Unlock', '#eaf5ee', C.green, () => this.act(d.id, 'unlock', 'Force-unlock (ignore overdue) this phone?'))}
                    {btn('⚙ Auto', '#f4f1e6', C.ink, () => this.act(d.id, 'auto'))}
                    {btn('⚠ Mark lost', '#fff7ed', C.amber, () => this.act(d.id, 'lost', 'Mark this phone as LOST/STOLEN? It will lock on next check-in.'))}
                    {btn('✓ Release', '#eef2ff', '#4338ca', () => this.act(d.id, 'release', 'Release this phone (loan fully paid)? It will unlock permanently.'))}
                    {btn('🗑 Delete', '#fff', C.mut, () => this.act(d.id, 'delete', 'Delete this device record? The phone will stop locking.'))}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    );
  }
}
