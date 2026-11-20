import React from 'react';
import Head from 'next/head';
import { supabase, getSessionSafe, SHOP_ID } from '../lib/supabase';

const C = { green: '#0f6b4b', red: '#b91c1c', amber: '#b45309', ink: '#1a2b1f', mut: '#7a7663', line: '#ece8dc', bg: '#f7f5ef' };

// Self-hosted APK (direct, no redirect) + its signing-cert checksum. Must stay in
// sync with the published app-release.apk.
const APK_URL = 'https://aqsaat.vercel.app/device-lock.apk';
const APK_CHECKSUM = 'rMUF7bdAJ91h_LKXg2yQqLhwJq5mdQlXX-eWPh3qmMk';

export default class Devices extends React.Component {
  state = {
    authUser: undefined, email: '', password: '', authErr: '', busy: false,
    devices: null, error: '', enroll: null, enrollBusy: false,
    form: { label: '', planId: '', customerId: '', graceDays: '' },
    qrCfg: { apkUrl: APK_URL, checksum: APK_CHECKSUM, ssid: '', wifiPass: '' }, qrImg: '', qrBusy: false,
    tab: 'all', qrOpen: false, billMonth: '', rate: 0,
    shop: null, pickQ: '',
  };

  async componentDidMount() {
    try { const s = JSON.parse(localStorage.getItem('devicelock_qrcfg') || '{}'); if (s && typeof s === 'object') this.setState(st => ({ qrCfg: { ...st.qrCfg, ...s, apkUrl: APK_URL, checksum: APK_CHECKSUM } })); } catch (e) {}
    try { const r = parseFloat(localStorage.getItem('devicelock_rate') || '0'); if (r > 0) this.setState({ rate: r }); } catch (e) {}
    const { data: { session } } = await getSessionSafe();
    if (session) this.onAuthed(session.user); else this.setState({ authUser: null });
  }

  showQr = async () => {
    const { apkUrl, checksum, ssid, wifiPass } = this.state.qrCfg;
    if (!apkUrl || !checksum) { alert('APK URL and signature checksum are required'); return; }
    try { localStorage.setItem('devicelock_qrcfg', JSON.stringify(this.state.qrCfg)); } catch (e) {}
    this.setState({ qrBusy: true });
    try {
      const t = await this.token();
      const q = new URLSearchParams({ apkUrl, checksum, ssid: ssid || '', wifiPass: wifiPass || '' }).toString();
      const resp = await fetch('/api/device/provision-qr?' + q, { headers: { Authorization: 'Bearer ' + t } });
      if (!resp.ok) throw new Error((await resp.json()).error || 'qr failed');
      this.setState({ qrImg: (await resp.json()).qr });
    } catch (e) { alert(e.message); }
    this.setState({ qrBusy: false });
  };
  onAuthed = (user) => { this.setState({ authUser: user }); this.load(); this.loadShop(); };

  // The shop blob (customers/plans/products) so enrollment can link to a real plan
  // by its internal id — which is what drives auto-lock on overdue.
  loadShop = async () => {
    try {
      const { data } = await supabase.from('shops').select('data').eq('id', SHOP_ID).maybeSingle();
      const d = (data && data.data) || {};
      this.setState({ shop: { customers: d.customers || [], plans: d.plans || [], products: d.products || [] } });
    } catch (e) {}
  };

  planResults = () => {
    const { shop, pickQ } = this.state;
    if (!shop || !pickQ.trim()) return [];
    const q = pickQ.trim().toLowerCase();
    const custById = {}; shop.customers.forEach(c => { custById[c.id] = c; });
    const prodById = {}; shop.products.forEach(p => { prodById[p.id] = p; });
    return shop.plans
      .filter(p => p && !p._deleted)
      .map(p => {
        const c = custById[p.customerId] || {};
        const pr = prodById[p.productId] || {};
        const remaining = (p.schedule || []).filter(s => !s.paid).reduce((a, s) => a + (s.amount || 0), 0);
        return { plan: p, custName: c.name || '', phone: c.phone || '', product: pr.name || '', voucher: p.voucherNo || '', status: p.status || '', remaining };
      })
      .filter(r => (r.custName + ' ' + r.phone + ' ' + r.product + ' ' + r.voucher).toLowerCase().includes(q))
      .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1))
      .slice(0, 8);
  };

  pickPlan = (r) => {
    const { form } = this.state;
    this.setState({
      pickQ: '',
      form: { ...form, planId: r.plan.id, customerId: r.plan.customerId || '', label: form.label || [r.custName, r.product].filter(Boolean).join(' — ') },
    });
  };

  clearPick = () => this.setState(st => ({ form: { ...st.form, planId: '', customerId: '' } }));

  renderPicker = () => {
    const { shop, pickQ, form } = this.state;
    const fi = { border: '1px solid ' + C.line, borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fdfcf8', outline: 'none', width: '100%', boxSizing: 'border-box' };
    const money = (n) => 'Rs ' + Math.round(n || 0).toLocaleString('en-US');

    if (form.planId) {
      const cust = (shop ? shop.customers : []).find(c => c.id === form.customerId);
      const plan = (shop ? shop.plans : []).find(p => p.id === form.planId);
      const prod = plan ? (shop.products || []).find(pr => pr.id === plan.productId) : null;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{cust ? cust.name : form.customerId || 'Customer'}{prod ? ' · ' + prod.name : ''}</div>
            <div style={{ fontSize: 11.5, color: C.mut }}>Linked to {plan ? (plan.voucherNo || plan.id) : form.planId} — auto-lock on overdue is ON</div>
          </div>
          <button onClick={this.clearPick} style={{ border: '1px solid ' + C.line, background: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', color: C.mut }}>Change</button>
        </div>
      );
    }

    const results = this.planResults();
    return (
      <div>
        <input placeholder={shop ? 'Search customer name, phone or voucher to link the plan' : 'Loading plans…'} disabled={!shop} value={pickQ} onChange={e => this.setState({ pickQ: e.target.value })} style={fi} />
        {pickQ.trim() ? (
          <div style={{ border: '1px solid ' + C.line, borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 260, overflowY: 'auto', background: '#fff' }}>
            {results.length === 0 ? <div style={{ padding: '10px 12px', fontSize: 12.5, color: C.mut }}>No match. Check the spelling, or leave unlinked (manual lock only).</div>
              : results.map(r => (
                <div key={r.plan.id} onClick={() => this.pickPlan(r)} style={{ padding: '9px 12px', borderBottom: '1px solid ' + C.line, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.custName || '—'}{r.phone ? ' · ' + r.phone : ''}</div>
                    <div style={{ fontSize: 11.5, color: C.mut }}>{[r.product, r.voucher].filter(Boolean).join(' · ') || r.plan.id}{r.remaining > 0 ? ` · ${money(r.remaining)} left` : ''}</div>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: r.status === 'active' ? C.green : C.mut, background: r.status === 'active' ? '#eafaf0' : '#f4f1e6', borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}>{r.status || '—'}</span>
                </div>
              ))}
          </div>
        ) : null}
      </div>
    );
  };

  token = async () => {
    const { data: { session } } = await getSessionSafe();
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
    const u = this.state.email.trim();
    if (!u || !this.state.password) { this.setState({ authErr: 'Enter username and password' }); return; }
    this.setState({ busy: true, authErr: '' });
    // Same mapping as the main app: username -> hidden email, short password padded.
    const email = u.includes('@') ? u.toLowerCase() : u.toLowerCase() + '@aqsaat.local';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: this.state.password + '.Aqsat9' });
    if (error) { this.setState({ busy: false, authErr: 'Wrong username or password' }); return; }
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

  act = async (deviceId, action, confirmMsg, value) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    const resp = await this.api('POST', { deviceId, action, value });
    if (!resp.ok) { alert((await resp.json()).error || 'action failed'); return; }
    this.load();
  };

  rename = (d) => {
    const name = prompt('Name for this phone (to remember which is which):', d.label || '');
    if (name === null) return;
    this.act(d.id, 'rename', null, name.trim());
  };

  setCallShop = (d) => {
    const num = prompt('Block ALL calls on this phone except this one number (incoming and outgoing). Enter the shop number the phone may call:', d.allowNumber || '');
    if (num === null) return;
    if (!num.trim()) { alert('Enter a number, or use "Calls: all" to lift the block.'); return; }
    this.act(d.id, 'callshop', null, num.trim());
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
      this.setState({ enroll: r, pickQ: '', form: { label: '', planId: '', customerId: '', graceDays: '' } });
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
          <input type="text" autoCapitalize="none" autoCorrect="off" placeholder="Username" value={this.state.email} onChange={e => this.setState({ email: e.target.value, authErr: '' })} onKeyDown={onKey} style={inp} />
          <input type="password" placeholder="Password" value={this.state.password} onChange={e => this.setState({ password: e.target.value, authErr: '' })} onKeyDown={onKey} style={inp} />
          {this.state.authErr ? <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 10, textAlign: 'center' }}>{this.state.authErr}</div> : null}
          <button onClick={this.signIn} disabled={this.state.busy} style={{ width: '100%', padding: 13, borderRadius: 12, background: this.state.busy ? C.mut : C.green, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>{this.state.busy ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </div>
    );
  }

  catOf = (d) => d.status === 'deleted' ? 'deleted' : d.status === 'released' ? 'released' : d.status === 'lost' ? 'lost' : d.current === 'lock' ? 'locked' : 'active';

  // Is the lock app actually alive on the phone? Based on how recently it checked
  // in (it pings every ~6h), so the owner can tell a live phone from a dead/removed
  // one at a glance.
  connStatus = (d) => {
    const rel = (min) => min < 60 ? `${Math.max(1, Math.round(min))} min` : min < 1440 ? `${Math.round(min / 60)} hr` : `${Math.round(min / 1440)} day(s)`;
    if (!d.lastCheckin) {
      return d.claimed
        ? { c: C.amber, bg: '#fffbeb', t: 'Set up, waiting for first check-in' }
        : { c: C.mut, bg: '#f4f1e6', t: 'Not set up yet — code not entered on the phone' };
    }
    const min = (Date.now() - new Date(d.lastCheckin).getTime()) / 60000;
    if (min < 60 * 13) return { c: C.green, bg: '#eafaf0', t: `App active — last seen ${rel(min)} ago` };
    if (min < 60 * 24 * 7) return { c: C.amber, bg: '#fffbeb', t: `Quiet ${rel(min)} — phone off or no internet` };
    return { c: C.red, bg: '#fdecea', t: `No check-in for ${rel(min)} — app may be removed` };
  };

  setRate = (v) => {
    const r = parseFloat(v) || 0;
    this.setState({ rate: r });
    try { localStorage.setItem('devicelock_rate', String(r)); } catch (e) {}
  };

  renderBilling = (list) => {
    const now = new Date();
    const curKey = now.toISOString().slice(0, 7);
    const sel = this.state.billMonth || curKey;
    const rate = this.state.rate || 0;

    // Count registrations by the month each device was created (deleted excluded).
    const billable = list.filter(d => this.catOf(d) !== 'deleted' && d.created);
    const byMonth = {};
    billable.forEach(d => { const k = new Date(d.created).toISOString().slice(0, 7); byMonth[k] = (byMonth[k] || 0) + 1; });

    // Month list from the earliest registration up to this month, newest first.
    const existing = Object.keys(byMonth).sort();
    let y = existing.length ? +existing[0].slice(0, 4) : now.getFullYear();
    let m = existing.length ? +existing[0].slice(5, 7) : now.getMonth() + 1;
    const ey = now.getFullYear(), em = now.getMonth() + 1;
    const months = [];
    while (y < ey || (y === ey && m <= em)) { months.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
    months.reverse();
    const label = (k) => new Date(k + '-01T00:00:00').toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const money = (n) => 'Rs ' + Math.round(n).toLocaleString('en-US');

    const selCount = byMonth[sel] || 0;
    const total = billable.length;
    const C2 = C;

    return (
      <div>
        <div style={{ background: '#fff', border: '1px solid ' + C2.line, borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: C2.mut, marginBottom: 4 }}>Month</div>
              <select value={sel} onChange={e => this.setState({ billMonth: e.target.value })} style={{ border: '1px solid ' + C2.line, borderRadius: 10, padding: '9px 12px', fontSize: 14, background: '#fdfcf8', minWidth: 170 }}>
                {months.map(k => <option key={k} value={k}>{label(k)}{k === curKey ? ' (this month)' : ''}</option>)}
              </select>
            </div>
            <button onClick={() => this.setState({ billMonth: '' })} style={{ padding: '9px 14px', borderRadius: 10, background: sel === curKey ? C2.green : '#fff', color: sel === curKey ? '#fff' : C2.ink, border: '1px solid ' + (sel === curKey ? C2.green : C2.line), fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>This month</button>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{ fontSize: 12, color: C2.mut, marginBottom: 4 }}>Rate per device (Rs)</div>
              <input type="number" value={rate || ''} placeholder="e.g. 100" onChange={e => this.setRate(e.target.value)} style={{ border: '1px solid ' + C2.line, borderRadius: 10, padding: '9px 12px', fontSize: 14, background: '#fdfcf8', width: 130 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: C2.mut, marginBottom: 4 }}>Registered in {label(sel)}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: C2.green }}>{selCount}</div>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: C2.mut, marginBottom: 4 }}>Amount for {label(sel)}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: C2.amber }}>{rate > 0 ? money(selCount * rate) : '—'}</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid ' + C2.line, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: C2.mut, marginBottom: 4 }}>Total registered (all time)</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: C2.ink }}>{total}</div>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid ' + C2.line, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, color: C2.mut, padding: '12px 16px', borderBottom: '1px solid ' + C2.line }}>
            <div style={{ flex: 1 }}>Month</div>
            <div style={{ width: 90, textAlign: 'right' }}>Devices</div>
            {rate > 0 ? <div style={{ width: 110, textAlign: 'right' }}>Amount</div> : null}
          </div>
          {months.map(k => (
            <div key={k} onClick={() => this.setState({ billMonth: k })} style={{ display: 'flex', fontSize: 13.5, padding: '11px 16px', borderBottom: '1px solid ' + C2.line, cursor: 'pointer', background: k === sel ? '#f0fdf4' : '#fff' }}>
              <div style={{ flex: 1, fontWeight: k === sel ? 700 : 500 }}>{label(k)}{k === curKey ? <span style={{ color: C2.green, fontSize: 11, marginLeft: 6 }}>this month</span> : null}</div>
              <div style={{ width: 90, textAlign: 'right', fontWeight: 700 }}>{byMonth[k] || 0}</div>
              {rate > 0 ? <div style={{ width: 110, textAlign: 'right', color: C2.amber, fontWeight: 700 }}>{money((byMonth[k] || 0) * rate)}</div> : null}
            </div>
          ))}
          {rate > 0 ? (
            <div style={{ display: 'flex', fontSize: 14, fontWeight: 800, padding: '13px 16px', background: '#faf8f1' }}>
              <div style={{ flex: 1 }}>Total</div>
              <div style={{ width: 90, textAlign: 'right' }}>{total}</div>
              <div style={{ width: 110, textAlign: 'right', color: C2.amber }}>{money(total * rate)}</div>
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 11.5, color: C2.mut, marginTop: 10 }}>Counts every phone by the month it was registered, deleted ones excluded. The rate is saved on this computer only.</div>
      </div>
    );
  };

  renderApp() {
    const { devices, error, enroll, form, tab, qrOpen } = this.state;
    const fi = { border: '1px solid ' + C.line, borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fdfcf8', outline: 'none', width: '100%', boxSizing: 'border-box' };
    const ghost = { padding: '8px 12px', borderRadius: 10, background: '#fff', border: '1px solid ' + C.line, fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' };
    const badge = (cur) => {
      const m = { ok: ['#eaf5ee', C.green, '● OK'], warn: ['#fef3c7', C.amber, '● Warning'], lock: ['#fdecea', C.red, '● Locked'], release: ['#eef2ff', '#4338ca', '● Released'] }[cur] || ['#f4f1e6', C.mut, cur];
      return <span style={{ background: m[0], color: m[1], fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{m[2]}</span>;
    };
    const btn = (label, bg, col, onClick) => <button onClick={onClick} style={{ padding: '7px 11px', borderRadius: 8, background: bg, color: col, fontWeight: 600, fontSize: 12, border: '1px solid ' + C.line, cursor: 'pointer' }}>{label}</button>;

    const list = devices || [];
    const counts = { all: 0, active: 0, locked: 0, released: 0, lost: 0, deleted: 0 };
    list.forEach(d => { const c = this.catOf(d); counts[c]++; if (c !== 'deleted') counts.all++; });
    counts.billing = list.filter(d => this.catOf(d) !== 'deleted').length;
    const tabs = [['all', 'All'], ['active', 'Active'], ['locked', 'Locked'], ['released', 'Released'], ['lost', 'Lost'], ['deleted', 'Deleted'], ['billing', '💰 Billing']];
    const shown = tab === 'all' ? list.filter(d => this.catOf(d) !== 'deleted') : list.filter(d => this.catOf(d) === tab);

    return (
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '16px 16px 64px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#0f6b4b,#14a374)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔒</div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Device Lock</div>
            <div style={{ fontSize: 12, color: C.mut }}>Enrolled phones on installment</div>
          </div>
          <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/'; }} style={{ ...ghost, background: C.green, color: '#fff', border: 'none' }}>← Back to Aqsat</button>
          <button onClick={this.load} style={ghost}>↻ Refresh</button>
          <button onClick={this.signOut} style={{ ...ghost, background: '#f4f1e6', border: 'none' }}>Sign out</button>
        </div>

        {/* Enroll */}
        <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Enroll a new phone</div>
          <div style={{ fontSize: 12, color: C.mut, marginBottom: 10 }}>Link the customer's plan so the phone auto-locks when they fall overdue. Then give it a name you'll recognise.</div>
          <div style={{ marginBottom: 10 }}>{this.renderPicker()}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8, marginBottom: 10 }}>
            <input placeholder="Name to remember (customer / model)" value={form.label} onChange={e => this.setState({ form: { ...form, label: e.target.value } })} style={fi} />
            <input placeholder="Grace days (blank = shop default)" value={form.graceDays} onChange={e => this.setState({ form: { ...form, graceDays: e.target.value } })} style={fi} />
          </div>
          <button onClick={this.enroll} disabled={this.state.enrollBusy} style={{ padding: '10px 16px', borderRadius: 10, background: C.green, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>{this.state.enrollBusy ? 'Creating…' : '+ Create enrollment'}</button>
          {enroll ? (
            <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 4 }}>On the phone (after scanning the provisioning QR), open Device Lock and type this code:</div>
              <div style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 800, letterSpacing: 4, color: C.ink, textAlign: 'center', padding: '6px 0' }}>{enroll.claimCode}</div>
              <div style={{ fontSize: 11, color: C.mut }}>One-time, expires in 24h. PC fallback string: <span style={{ fontFamily: 'monospace', wordBreak: 'break-all', userSelect: 'all' }}>{enroll.enrollString}</span></div>
            </div>
          ) : null}
        </div>

        {/* Provisioning QR — collapsible */}
        <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 16, marginBottom: 20, overflow: 'hidden' }}>
          <button onClick={() => this.setState({ qrOpen: !qrOpen })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Provisioning QR &amp; setup</div>
              <div style={{ fontSize: 12, color: C.mut }}>The scan code — set up once, same for every phone</div>
            </div>
            <span style={{ color: C.mut, fontSize: 13, transform: qrOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
          </button>
          {qrOpen ? (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid ' + C.line }}>
              <div style={{ fontSize: 12, color: C.mut, margin: '12px 0 10px' }}>On a factory-reset phone, tap the first welcome screen 6 times, then scan this QR.</div>
              <div style={{ marginBottom: 10 }}>
                <a href={APK_URL} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: C.green, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>⬇ Download lock app (APK)</a>
                <span style={{ fontSize: 11, color: C.mut, marginLeft: 10 }}>v1.1.0 · hosted on aqsaat</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8, marginBottom: 10 }}>
                <input placeholder="APK download URL (https)" value={this.state.qrCfg.apkUrl} onChange={e => this.setState({ qrCfg: { ...this.state.qrCfg, apkUrl: e.target.value } })} style={fi} />
                <input placeholder="APK signature checksum" value={this.state.qrCfg.checksum} onChange={e => this.setState({ qrCfg: { ...this.state.qrCfg, checksum: e.target.value } })} style={fi} />
                <input placeholder="Wi-Fi SSID (optional)" value={this.state.qrCfg.ssid} onChange={e => this.setState({ qrCfg: { ...this.state.qrCfg, ssid: e.target.value } })} style={fi} />
                <input placeholder="Wi-Fi password (optional)" value={this.state.qrCfg.wifiPass} onChange={e => this.setState({ qrCfg: { ...this.state.qrCfg, wifiPass: e.target.value } })} style={fi} />
              </div>
              <button onClick={this.showQr} disabled={this.state.qrBusy} style={{ padding: '10px 16px', borderRadius: 10, background: C.ink, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>{this.state.qrBusy ? 'Building…' : 'Show provisioning QR'}</button>
              {this.state.qrImg ? <div style={{ textAlign: 'center', marginTop: 12 }}><img src={this.state.qrImg} alt="Provisioning QR" style={{ width: 280, maxWidth: '100%', borderRadius: 12, border: '1px solid ' + C.line, background: '#fff' }} /></div> : null}

              <div style={{ marginTop: 16, padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>📵 Phone won't scan / "Something went wrong"?</div>
                <div style={{ fontSize: 12, color: C.mut, marginBottom: 8 }}>Some cheap phones (Dcode, Unisoc etc.) block QR setup. Lock them from a Windows PC instead: factory-reset the phone (no Google account), turn on USB debugging, connect the cable, then run this tool and double-click <b>LockPhone.bat</b>. The Urdu steps are inside.</div>
                <a href="/LockPhone.zip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: C.amber, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>⬇ Download USB lock tool (PC)</a>
              </div>
            </div>
          ) : null}
        </div>

        {/* Devices + tabs */}
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Devices</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
          {tabs.map(([k, lbl]) => {
            const on = tab === k;
            return (
              <button key={k} onClick={() => this.setState({ tab: k })} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: on ? C.green : '#fff', color: on ? '#fff' : C.ink, border: '1px solid ' + (on ? C.green : C.line) }}>
                {lbl}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: on ? 'rgba(255,255,255,.22)' : '#f4f1e6', color: on ? '#fff' : C.mut }}>{counts[k]}</span>
              </button>
            );
          })}
        </div>

        {error ? <div style={{ color: C.red, marginBottom: 12 }}>{error}</div> : null}
        {tab === 'billing' ? this.renderBilling(list)
          : devices === null ? <div style={{ color: C.mut, padding: 20 }}>Loading…</div>
          : list.length === 0 ? <div style={{ color: C.mut, textAlign: 'center', padding: '36px 20px', background: '#fff', border: '1px dashed ' + C.line, borderRadius: 14 }}>No devices enrolled yet. Enroll one above to get started.</div>
          : shown.length === 0 ? <div style={{ color: C.mut, textAlign: 'center', padding: '28px 20px', background: '#fff', border: '1px dashed ' + C.line, borderRadius: 14 }}>No {tab} devices.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shown.map(d => (
                <div key={d.id} style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 14, padding: 15 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: d.label ? C.ink : C.mut }}>
                        {d.label || 'Unnamed phone'}
                        <button onClick={() => this.rename(d)} title="Rename" style={{ marginLeft: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: C.green }}>✏️</button>
                      </div>
                      <div style={{ fontSize: 12, color: C.mut }}>{[d.customer, d.plan].filter(Boolean).join(' · ') || d.id}</div>
                    </div>
                    {badge(d.current)}
                  </div>
                  {(() => { const cs = this.connStatus(d); return (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: cs.bg, color: cs.c, fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 20, marginBottom: 11 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 8, background: cs.c, display: 'inline-block' }} />{cs.t}
                    </div>
                  ); })()}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 12, color: C.mut, marginBottom: 11 }}>
                    <span>Mode: <b style={{ color: C.ink }}>{d.lockMode}</b></span>
                    <span>Status: <b style={{ color: C.ink }}>{d.status}</b></span>
                    <span>Last check-in: <b style={{ color: C.ink }}>{d.lastCheckin ? new Date(d.lastCheckin).toLocaleString() : 'never'}</b></span>
                    <span>Unlock code: <b style={{ color: C.green, fontFamily: 'monospace', fontSize: 14, letterSpacing: 1 }}>{d.unlockCode}</b></span>
                    <span>Calls: <b style={{ color: d.callMode === 'shop_only' ? C.red : C.ink }}>{d.callMode === 'shop_only' ? `only ${d.allowNumber || '—'}` : 'all allowed'}</b></span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 12, color: C.mut, marginBottom: 11 }}>
                    <span>📍 Last location: {d.locAt
                      ? <><a href={`https://maps.google.com/?q=${d.lat},${d.lng}`} target="_blank" rel="noopener" style={{ color: C.green, fontWeight: 700 }}>{Number(d.lat).toFixed(5)}, {Number(d.lng).toFixed(5)}</a> <span style={{ color: C.mut }}>· {new Date(d.locAt).toLocaleString()}{d.locAcc ? ` · ±${Math.round(d.locAcc)}m` : ''}</span></>
                      : <b style={{ color: C.ink }}>not reported yet</b>}</span>
                  </div>
                  {d.status === 'deleted' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {btn('↩ Restore', '#eaf5ee', C.green, () => this.act(d.id, 'active'))}
                    {btn('🗑 Delete forever', '#fdecea', C.red, () => this.act(d.id, 'purge', 'Permanently delete this record? This CANNOT be undone.'))}
                  </div>
                  ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {btn('🔒 Lock', '#fdecea', C.red, () => this.act(d.id, 'lock', 'Force-lock this phone now?'))}
                    {btn('🔓 Unlock', '#eaf5ee', C.green, () => this.act(d.id, 'unlock', 'Force-unlock (ignore overdue) this phone?'))}
                    {btn('⚙ Auto', '#f4f1e6', C.ink, () => this.act(d.id, 'auto'))}
                    {(d.status === 'released' || d.status === 'lost') ? btn('● Activate', '#eafaf0', C.green, () => this.act(d.id, 'active', 'Bring this phone back to Active (auto-lock on overdue)?')) : null}
                    {btn('⚠ Mark lost', '#fff7ed', C.amber, () => this.act(d.id, 'lost', 'Mark this phone as LOST/STOLEN? It will lock on next check-in.'))}
                    {btn('✓ Release', '#eef2ff', '#4338ca', () => this.act(d.id, 'release', 'Release this phone? This UN-ENROLLS it and removes the lock permanently — only do this when the loan is fully paid.'))}
                    {btn('🗑 Delete', '#fff', C.mut, () => this.act(d.id, 'delete', 'Move this device to Deleted? The phone stops being managed until you restore it.'))}
                    {d.callMode === 'shop_only'
                      ? btn('📞 Calls: all', '#eaf5ee', C.green, () => this.act(d.id, 'callopen', 'Lift the call block — let this phone call any number?'))
                      : btn('📞 Shop-only calls', '#fff7ed', C.amber, () => this.setCallShop(d))}
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    );
  }
}
