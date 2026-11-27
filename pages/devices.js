import React from 'react';
import { COMMAND_OPS } from '../lib/deviceCommands';
import Head from 'next/head';
import { supabase, getSessionSafe, SHOP_ID } from '../lib/supabase';

const C = { green: '#0f6b4b', red: '#b91c1c', amber: '#b45309', ink: '#1a2b1f', mut: '#7a7663', line: '#ece8dc' };

// Self-hosted APK (direct, no redirect) + its signing-cert checksum. Must stay in
// sync with the published app-release.apk.
const APK_URL = 'https://aqsaat.vercel.app/device-lock.apk';
const APK_CHECKSUM = 'rMUF7bdAJ91h_LKXg2yQqLhwJq5mdQlXX-eWPh3qmMk';
const RATE_PER_DEVICE = 700;

const appVersionName = (code) => 'v1.' + (code - 1);

export default class Devices extends React.Component {
  state = {
    authUser: undefined, email: '', password: '', authErr: '', busy: false,
    devices: null, error: '', enroll: null, enrollBusy: false,
    form: { label: '', planId: '', customerId: '', graceDays: '' },
    qrCfg: { apkUrl: APK_URL, checksum: APK_CHECKSUM, ssid: '', wifiPass: '' }, qrImg: '', qrBusy: false,
    tab: 'all', qrOpen: false, billMonth: '',
    shop: null, pickQ: '',
    detail: null, payBusy: '',
  };

  async componentDidMount() {
    if (!this.props.embedded) { window.location.replace('/?r=devices'); return; }
    try { const s = JSON.parse(localStorage.getItem('devicelock_qrcfg') || '{}'); if (s && typeof s === 'object') this.setState(st => ({ qrCfg: { ...st.qrCfg, ...s, apkUrl: APK_URL, checksum: APK_CHECKSUM } })); } catch (e) {}
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
  onAuthed = (user) => { this.setState({ authUser: user }); this.load(); this.loadShop(); this.loadFrp(); };

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

  openDetail = (d) => { this.setState({ detail: d, history: null }); this.loadShop(); this.loadHistory(d.id); };

  loadHistory = async (id) => {
    try {
      const t = await this.token();
      const r = await fetch('/api/device/manage?history=' + encodeURIComponent(id), { headers: { Authorization: 'Bearer ' + t } });
      const j = await r.json();
      this.setState({ history: j.points || [] }, this.drawTrail);
    } catch (e) { this.setState({ history: [] }); }
  };

  // Leaflet + OpenStreetMap from the CDN, loaded only when a trail is shown.
  drawTrail = async () => {
    const pts = this.state.history || [];
    const el = document.getElementById('trail-map');
    if (!pts.length || !el) return;
    if (!window.L) {
      await new Promise((ok, fail) => {
        const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
        const sc = document.createElement('script'); sc.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; sc.onload = ok; sc.onerror = fail; document.head.appendChild(sc);
      }).catch(() => {});
    }
    const L = window.L;
    if (!L) return;
    if (this._trail) this._trail.remove();
    this._trail = L.map(el);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(this._trail);
    const ll = pts.slice().reverse().map(p => [p.lat, p.lng]);
    L.polyline(ll, { color: C.green, weight: 3 }).addTo(this._trail);
    pts.forEach((p, i) => L.circleMarker([p.lat, p.lng], { radius: i === 0 ? 8 : 4, color: i === 0 ? C.red : C.green, fillOpacity: 0.9 }).addTo(this._trail).bindPopup(new Date(p.at).toLocaleString() + (p.acc ? ' · ±' + Math.round(p.acc) + 'm' : '')));
    this._trail.fitBounds(ll, { padding: [20, 20], maxZoom: 16 });
  };

  loadFrp = async () => {
    try { const t = await this.token(); const r = await fetch('/api/device/settings', { headers: { Authorization: 'Bearer ' + t } }); const j = await r.json(); this.setState({ frpIds: (j.frpAccountIds || []).join(', ') }); } catch (e) {}
  };
  saveFrp = async () => {
    try {
      const t = await this.token();
      const r = await fetch('/api/device/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ frpAccountIds: this.state.frpIds }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      this.setState({ frpIds: j.frpAccountIds.join(', ') });
      alert(j.frpAccountIds.length ? 'Saved. Each phone arms it at its next check-in.' : 'Cleared. Phones drop factory-reset protection at their next check-in.');
    } catch (e) { alert(e.message || 'Save failed'); }
  };
  refresh = () => { this.load(); this.loadShop(); };
  closeDetail = () => this.setState({ detail: null });

  payInstallment = async (planId, n) => {
    this.setState({ payBusy: planId + ':' + n });
    try {
      const t = await this.token();
      const resp = await fetch('/api/device/pay', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ planId, n }) });
      if (!resp.ok) throw new Error((await resp.json()).error || 'failed');
      await this.loadShop();
      await this.load();
    } catch (e) { alert(e.message); }
    this.setState({ payBusy: '' });
  };

  renderDetail = () => {
    const { detail, shop } = this.state;
    if (!detail) return null;
    const d = detail;
    const cs = this.connStatus(d);
    const plan = shop ? (shop.plans || []).find(p => p.id === d.planId) : null;
    const cust = shop ? (shop.customers || []).find(c => c.id === d.customerId) : null;
    const prod = plan && shop ? (shop.products || []).find(pr => pr.id === plan.productId) : null;
    const today = new Date().toISOString().slice(0, 10);
    const sched = plan ? (plan.schedule || []).slice().sort((a, b) => (a.n || 0) - (b.n || 0)) : [];
    const unpaid = sched.filter(s => !s.paid);
    const overdue = unpaid.filter(s => s.dueDate && s.dueDate < today);
    const remaining = unpaid.reduce((a, s) => a + (s.amount || 0), 0);
    const money = (n) => 'Rs ' + Math.round(n || 0).toLocaleString('en-US');
    const btnInline = (label, col, onClick) => <button onClick={() => { onClick(); this.closeDetail(); }} style={{ padding: '8px 12px', borderRadius: 9, background: '#fff', color: col, fontWeight: 700, fontSize: 12.5, border: '1px solid ' + C.line, cursor: 'pointer' }}>{label}</button>;

    const row = (s) => {
      const isOverdue = !s.paid && s.dueDate && s.dueDate < today;
      const st = s.paid ? [C.green, 'Paid'] : isOverdue ? [C.red, 'Overdue'] : [C.amber, 'Due'];
      return (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid ' + C.line }}>
          <div style={{ width: 26, fontWeight: 700, color: C.mut, fontSize: 13 }}>#{s.n}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{money(s.amount)}</div>
            <div style={{ fontSize: 11.5, color: C.mut }}>Due {s.dueDate || '—'}{s.paid && s.paidDate ? ` · paid ${s.paidDate}` : ''}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: st[0], border: '1px solid ' + st[0], borderRadius: 4, padding: '2px 7px' }}>{st[1]}</span>
          {!s.paid ? (
            <button disabled={this.state.payBusy === d.planId + ':' + s.n} onClick={() => this.payInstallment(d.planId, s.n)} style={{ padding: '6px 11px', borderRadius: 8, background: C.ink, color: '#fff', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}>{this.state.payBusy === d.planId + ':' + s.n ? '…' : 'Mark paid'}</button>
          ) : null}
        </div>
      );
    };

    return (
      <div onClick={this.closeDetail} style={{ position: 'fixed', inset: 0, background: 'rgba(20,25,20,.45)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 12px', overflowY: 'auto' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid ' + C.line }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid ' + C.line, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{d.label || 'Unnamed phone'}</div>
              <div style={{ fontSize: 12, color: C.mut }}>{cust ? cust.name : d.customer || '—'}{prod ? ' · ' + prod.name : ''}</div>
            </div>
            <button onClick={this.closeDetail} style={{ border: '1px solid ' + C.line, background: '#fff', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', fontSize: 15 }}>✕</button>
          </div>

          <div style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: cs.c, fontSize: 12, marginBottom: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: 7, background: cs.c, display: 'inline-block' }} />{cs.t}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: C.mut, marginBottom: 6 }}>
              <span>Status: <b style={{ color: C.ink }}>{d.status}</b></span>
              <span>Mode: <b style={{ color: C.ink }}>{d.lockMode}</b></span>
              {this.timedNote(d)}
              <span>Calls: <b style={{ color: d.callMode === 'shop_only' ? C.red : C.ink }}>{d.callMode === 'shop_only' ? 'only ' + (d.allowNumber || '—') : 'all'}</b></span>
            </div>
            <div style={{ marginTop: 10 }}>{this.renderTempUnlock(d)}</div>
            <div style={{ fontSize: 12, color: C.mut, marginBottom: 14 }}>📍 {d.locAt ? <a href={`https://maps.google.com/?q=${d.lat},${d.lng}`} target="_blank" rel="noopener" style={{ color: C.green, fontWeight: 700 }}>View last location</a> : 'Location not reported yet'}</div>
            {this.state.history && this.state.history.length ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Location trail — {this.state.history.length} points{d.status === 'lost' ? ' · lost mode: every 15 min' : ''}</div>
                <div id="trail-map" style={{ height: 240, borderRadius: 8, overflow: 'hidden', border: '1px solid ' + C.line }} />
              </div>
            ) : null}

            {!plan ? (
              <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 6, padding: 12, fontSize: 12.5, color: C.amber }}>No plan linked to this phone. Enroll it again with a plan, or it can only be locked manually.</div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, background: '#fff', border: '1px solid ' + C.line, borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: C.mut }}>Overdue</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: overdue.length ? C.red : C.green }}>{overdue.length}</div>
                  </div>
                  <div style={{ flex: 1, background: '#fff', border: '1px solid ' + C.line, borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: C.mut }}>Remaining</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{money(remaining)}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, margin: '6px 0 4px' }}>Installments — {plan.voucherNo || plan.id}</div>
                <div style={{ border: '1px solid ' + C.line, borderRadius: 8, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
                  {sched.length ? sched.map(row) : <div style={{ padding: 12, color: C.mut, fontSize: 12.5 }}>No schedule on this plan.</div>}
                </div>
                <div style={{ fontSize: 11, color: C.mut, marginTop: 8 }}>Marking an installment paid here records it in the app (to Cash) and stops the auto-lock. For a part payment or a different account, record it in the main app instead.</div>
              </div>
            )}
          </div>

          <div style={{ padding: '12px 18px', borderTop: '1px solid ' + C.line, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {btnInline('🔒 Lock', C.red, () => this.act(d.id, 'lock', 'Force-lock this phone now?'))}
            {btnInline('🔓 Unlock', C.green, () => this.act(d.id, 'unlock', 'Force-unlock this phone?'))}
            {btnInline('⚙ Auto', C.ink, () => this.act(d.id, 'auto'))}
          </div>
        </div>
      </div>
    );
  };

  renderPicker = () => {
    const { shop, pickQ, form } = this.state;
    const fi = { border: '1px solid ' + C.line, borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fdfcf8', outline: 'none', width: '100%', boxSizing: 'border-box' };
    const money = (n) => 'Rs ' + Math.round(n || 0).toLocaleString('en-US');

    if (form.planId) {
      const cust = (shop ? shop.customers : []).find(c => c.id === form.customerId);
      const plan = (shop ? shop.plans : []).find(p => p.id === form.planId);
      const prod = plan ? (shop.products || []).find(pr => pr.id === plan.productId) : null;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid ' + C.line, borderRadius: 6, padding: '10px 12px' }}>
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
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: r.status === 'active' ? C.green : C.mut, border: '1px solid currentColor', borderRadius: 4, padding: '1px 7px', whiteSpace: 'nowrap' }}>{r.status || '—'}</span>
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
      const j = await resp.json();
      this.setState({ devices: j.devices, latestVersion: j.latestVersion, error: '' });
    } catch (e) { this.setState({ error: e.message }); }
  };

  act = async (deviceId, action, confirmMsg, value) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    const resp = await this.api('POST', { deviceId, action, value });
    if (!resp.ok) { alert((await resp.json()).error || 'action failed'); return; }
    this.load();
  };

  // Remote fixes (lib/deviceCommands.js): run by the phone at its next check-in, app v1.23+.
  sendFix = async (d) => {
    const st = (this.state.fix || {})[d.id] || {};
    const op = st.op || 'clear_restriction';
    const resp = await this.api('POST', { deviceId: d.id, action: 'command', value: { op, arg: st.arg || '' } });
    if (!resp.ok) { alert((await resp.json()).error || 'failed'); return; }
    this.setState(s => ({ fix: { ...s.fix, [d.id]: { op } } }));
    this.load();
  };

  renderRemoteFix = (d) => {
    const st = (this.state.fix || {})[d.id] || {};
    const op = st.op || 'clear_restriction';
    const spec = COMMAND_OPS[op];
    const set = (patch) => this.setState(s => ({ fix: { ...s.fix, [d.id]: { ...st, ...patch } } }));
    const inp = { padding: '7px 9px', borderRadius: 6, border: '1px solid ' + C.line, fontSize: 13, background: '#fff' };
    const log = d.info && d.info.cmdLog;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {d.appVersion && d.appVersion < 24 ? <div style={{ fontSize: 12, color: C.amber }}>Needs app v1.23. This phone runs fixes after it updates.</div> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <select value={op} onChange={e => set({ op: e.target.value })} style={inp}>
            {Object.entries(COMMAND_OPS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {spec.arg ? <input value={st.arg || ''} onChange={e => set({ arg: e.target.value })} placeholder={spec.hint} style={{ ...inp, flex: '1 1 180px', fontFamily: 'monospace' }} /> : null}
          <button onClick={() => this.sendFix(d)} style={{ ...inp, background: C.ink, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Send</button>
        </div>
        {(d.commands || []).map(c => (
          <div key={c.id} style={{ fontSize: 12, color: C.mut, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>⏳ {(COMMAND_OPS[c.op] || {}).label || c.op}{c.arg ? ' · ' + c.arg : ''} — waiting for the phone</span>
            <button onClick={() => this.act(d.id, 'uncommand', null, c.id)} style={{ border: 'none', background: 'none', color: C.red, cursor: 'pointer', fontSize: 12 }}>cancel</button>
          </div>
        ))}
        {log ? <pre style={{ margin: 0, fontSize: 11, color: C.ink, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#faf8f2', padding: 8, borderRadius: 6 }}>{log}</pre> : null}
      </div>
    );
  };

  // One duration drives both ways of unlocking: online now, or an offline code (shown on tap).
  TU = [{ mins: 30, label: '30 min', code: '30 min' }, { mins: 120, label: '2 hours', code: '2 hours' }, { mins: 4320, label: '3 days', code: '3 days' }];

  renderTempUnlock = (d) => {
    const sel = this.TU.find(t => t.mins === (this.state.tuMins || {})[d.id]) || this.TU[0];
    const shown = (this.state.tuCode || {})[d.id] === sel.mins;
    const c = (d.unlockCodes || []).find(x => x.label === sel.code);
    const codeOk = c && (d.appVersion >= 13 || sel.code === '3 days');
    const pick = (mins) => this.setState(st => ({ tuMins: { ...st.tuMins, [d.id]: mins }, tuCode: { ...st.tuCode, [d.id]: null } }));
    const reveal = () => this.setState(st => ({ tuCode: { ...st.tuCode, [d.id]: shown ? null : sel.mins } }));
    const opt = { flex: '1 1 200px', background: '#fff', border: '1px solid ' + C.line, borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 };
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, flex: 1 }}>⏱️ Temporary unlock</div>
          {this.timedNote(d)}
        </div>
        <div style={{ display: 'inline-flex', border: '1px solid ' + C.ink, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
          {this.TU.map((t, i) => (
            <button key={t.mins} onClick={() => pick(t.mins)} style={{ padding: '6px 14px', border: 'none', borderLeft: i ? '1px solid ' + C.ink : 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: t.mins === sel.mins ? C.ink : '#fff', color: t.mins === sel.mins ? '#fff' : C.ink }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={opt}>
            <div style={{ fontSize: 12, color: C.mut }}><b style={{ color: C.ink }}>Phone has internet</b> — opens in seconds, locks again by itself after {sel.label}.</div>
            <button onClick={() => this.act(d.id, 'unlockfor', `Unlock this phone for ${sel.label}? It locks again by itself after that if the installment is still due.`, sel.mins)} style={{ padding: '9px 12px', borderRadius: 6, border: 'none', background: C.ink, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 'auto' }}>⚡ Unlock for {sel.label}</button>
          </div>
          <div style={opt}>
            <div style={{ fontSize: 12, color: C.mut }}><b style={{ color: C.ink }}>No internet</b> — customer types this code on the lock screen. Valid today only.</div>
            {shown ? (
              codeOk
                ? <div onClick={reveal} style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 800, letterSpacing: 6, textAlign: 'center', color: C.ink, background: '#fff', border: '1px solid ' + C.line, borderRadius: 6, padding: '6px 0', cursor: 'pointer', marginTop: 'auto' }}>{c.code.slice(0, 3)} {c.code.slice(3)}</div>
                : <div style={{ fontSize: 12, color: C.amber, fontWeight: 600, marginTop: 'auto' }}>This phone's app is too old for a {sel.label} code — use 3 days, or wait for it to update.</div>
            ) : (
              <button onClick={reveal} style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid ' + C.ink, background: '#fff', color: C.ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 'auto' }}>🔑 Show {sel.label} code</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  timedNote = (d) => d.unlockUntil
    ? <span style={{ color: C.green, fontWeight: 600 }}>Unlocked until {new Date(d.unlockUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{new Date(d.unlockUntil).toDateString() !== new Date().toDateString() ? ' ' + new Date(d.unlockUntil).toLocaleDateString() : ''}</span>
    : null;

  checkInNow = async (d) => {
    const resp = await this.api('POST', { deviceId: d.id, action: 'checkin' });
    if (!resp.ok) { alert((await resp.json()).error || 'failed'); return; }
    alert('Sent. The phone checks in within a minute if it has internet — any pending app update starts then.');
    setTimeout(this.load, 30000);
  };

  rename = (d) => {
    const name = prompt('Name for this phone (to remember which is which):', d.label || '');
    if (name === null) return;
    this.act(d.id, 'rename', null, name.trim());
  };

  setSimMode = (d, next) => {
    if (!next || next === d.simMode) return;
    const msg = {
      lock: 'SIM lock → LOCK: the phone locks itself if its registered SIM is removed or swapped (works offline). Continue?',
      alert: 'SIM lock → ALERT ONLY: a SIM change is flagged here but the phone is not locked. Continue?',
      off: 'SIM lock → OFF: SIM changes are ignored and airplane mode is allowed again. Continue?',
    }[next];
    this.act(d.id, 'simmode', msg, next);
  };

  simFields = (d, field) => {
    const cur = d.simCurrent, base = d.simBaseline || [], info = d.info;
    const tail = s => '…' + String(s).slice(-6);
    const mono = { fontFamily: 'ui-monospace,Consolas,monospace', fontSize: 12.5 };
    let state;
    if (!cur && !info) state = <span style={{ color: C.mut }}>Waiting for app v1.9+</span>;
    else if (d.simChangedAt) state = <span style={{ color: C.red, fontWeight: 600 }}>Changed{cur && cur.absent ? ' — no SIM in phone' : ''}<div style={{ fontSize: 11.5, fontWeight: 400, color: C.mut }}>since {new Date(d.simChangedAt).toLocaleString()}</div></span>;
    else if (!base.length) state = <span style={{ color: C.amber }}>No SIM registered yet</span>;
    else state = <span style={{ color: C.green }}>Original SIM</span>;
    const slots = (cur && cur.slots) || [];
    const labels = d.simLabels || {};
    const simList = (ids) => ids.map(id => {
      const sl = slots.find(x => x.iccid === id) || {};
      const l = labels[id] || {};
      const num = sl.number || l.number;
      return (
        <div key={id} style={{ marginBottom: 6 }}>
          <div style={{ fontWeight: 600 }}>{sl.carrier || l.carrier || 'SIM'}:</div>
          <div style={num ? mono : { color: C.mut, fontSize: 12 }}>{num || 'number not read yet'}</div>
          {!num && sl.reply ? <div style={{ color: C.mut, fontSize: 11 }}>network said: {sl.reply}</div> : null}
        </div>
      );
    });
    const modeTxt = { lock: 'Locks phone', alert: 'Alert only', off: 'Off' }[d.simMode] || d.simMode;
    return [
      field('SIM', state),
      field('SIM lock', d.simMode === 'lock' && d.lockMode === 'force_unlock' ? modeTxt + ' (alert only while unlocked)' : modeTxt),
      base.length ? field('Registered', simList(base)) : null,
      d.simChangedAt && slots.length ? field('In phone now', simList(slots.map(x => x.iccid).filter(Boolean))) : null,
      info ? field('FRP', !info.frpSupported ? <span style={{ color: C.amber }}>Not supported (needs Android 11+)</span>
        : info.frpIds ? <span style={{ color: C.green }}>Armed · {info.frpIds.split(',').length} account{info.frpIds.includes(',') ? 's' : ''}</span>
        : <span style={{ color: C.red }}>Not armed — set the shop account above</span>) : null,
      info && (info.pinned || info.pinFix) ? field('Screen pinning', info.pinned
        ? <span style={{ color: info.lock === 'hard' ? C.mut : C.red }}>{info.lock === 'hard' ? 'On (lock screen showing)' : 'Stuck on — other apps blocked'}</span>
        : <span style={{ color: C.green }}>Off · stuck pin {info.pinFix}</span>) : null,
      info && info.diag ? field('Phone blocks', <span style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-word' }}>{info.diag}</span>) : null,
      info && info.appsFix ? field('Preloaded apps', <span style={{ color: C.green }}>{info.appsFix}</span>) : null,
    ];
  };

  setCallShop = (d) => {
    const num = prompt('Block ALL calls on this phone except this one number (incoming and outgoing). Enter the shop number the phone may call:', d.allowNumber || '');
    if (num === null) return;
    if (!num.trim()) { alert('Enter a number, or use "Calls: all" to lift the block.'); return; }
    this.act(d.id, 'callshop', null, num.trim());
  };

  enroll = async () => {
    if (!this.state.form.planId) { alert('Link the customer\'s plan first (search above), so this phone auto-locks on overdue.'); return; }
    this.setState({ enrollBusy: true });
    try {
      const t = await this.token();
      const resp = await fetch('/api/device/enroll', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify(this.state.form),
      });
      if (!resp.ok) throw new Error((await resp.json()).error || 'enroll failed');
      const r = await resp.json();
      const { form, shop } = this.state;
      const cust = ((shop && shop.customers) || []).find(c => c.id === form.customerId);
      this.setState({ enroll: { ...r, label: form.label, customer: cust ? cust.name : '' }, pickQ: '', form: { label: '', planId: '', customerId: '', graceDays: '' } });
      this.load();
    } catch (e) { alert(e.message); }
    this.setState({ enrollBusy: false });
  };

  render() {
    const { authUser } = this.state;
    if (this.props.embedded) return authUser ? this.renderApp() : <div style={{ padding: 30, color: C.mut }}>Loading…</div>;
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: C.ink }}>
        <Head><title>Devices — Aqsat</title></Head>
        {authUser === undefined ? <div style={{ padding: 40, color: C.mut }}>Loading…</div>
          : authUser === null ? this.renderLogin() : this.renderApp()}
      </div>
    );
  }

  renderLogin() {
    const inp = { width: '100%', border: '1.5px solid ' + C.line, borderRadius: 8, padding: '12px 14px', fontSize: 15, background: '#fdfcf8', outline: 'none', boxSizing: 'border-box', marginBottom: 10 };
    const onKey = e => { if (e.key === 'Enter') this.signIn(); };
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 20, padding: 24, border: '1px solid ' + C.line }}>
          <div style={{ fontSize: 20, fontWeight: 800, textAlign: 'center' }}>Device Lock</div>
          <div style={{ fontSize: 13, color: C.mut, textAlign: 'center', marginBottom: 20 }}>Sign in with your shop account</div>
          <input type="text" autoCapitalize="none" autoCorrect="off" placeholder="Username" value={this.state.email} onChange={e => this.setState({ email: e.target.value, authErr: '' })} onKeyDown={onKey} style={inp} />
          <input type="password" placeholder="Password" value={this.state.password} onChange={e => this.setState({ password: e.target.value, authErr: '' })} onKeyDown={onKey} style={inp} />
          {this.state.authErr ? <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 10, textAlign: 'center' }}>{this.state.authErr}</div> : null}
          <button onClick={this.signIn} disabled={this.state.busy} style={{ width: '100%', padding: 13, borderRadius: 8, background: this.state.busy ? C.mut : C.green, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>{this.state.busy ? 'Signing in…' : 'Sign in'}</button>
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
    const ago = d.lastCheckin ? rel((Date.now() - new Date(d.lastCheckin).getTime()) / 60000) : '';
    if (d.lastAction === 'release') return { c: '#4338ca', t: `Released — app un-enrolled itself ${ago} ago, phone no longer managed` };
    if (d.status === 'released') return { c: C.amber, t: 'Release pending — the phone frees itself at its next check-in' };
    if (d.status === 'deleted') return { c: C.mut, t: d.claimed ? 'Deleted while still enrolled — phone is stuck managed, restore it' : 'Deleted — never set up' };
    if (!d.lastCheckin) {
      return d.claimed
        ? { c: C.amber, t: 'Set up, waiting for first check-in' }
        : { c: C.mut, t: 'Not set up yet — code not entered on the phone' };
    }
    const min = (Date.now() - new Date(d.lastCheckin).getTime()) / 60000;
    if (min < 60 * 13) return { c: C.green, t: `App active — last seen ${rel(min)} ago` };
    if (min < 60 * 24 * 7) return { c: C.amber, t: `Quiet ${rel(min)} — phone off or no internet` };
    return { c: C.red, t: `No check-in for ${rel(min)} — app may be removed` };
  };

  appVersionLabel = (d) => {
    const latest = this.state.latestVersion;
    if (!d.appVersion) return <b style={{ color: C.amber }}>old (no auto-update) — update once from the phone's browser</b>;
    const upd = d.info && d.info.upd;
    if (latest && d.appVersion < latest) return <b style={{ color: C.amber }}>{appVersionName(d.appVersion)} → updating to {appVersionName(latest)} at next check-in{upd ? <span style={{ fontWeight: 400, color: C.mut }}> · last try: {upd}</span> : null}</b>;
    return <b style={{ color: C.green }}>{appVersionName(d.appVersion)} ✓ latest</b>;
  };

  canDelete = (d) => !d.claimed || d.lastAction === 'release';

  renderBilling = (list) => {
    const now = new Date();
    const curKey = now.toISOString().slice(0, 7);
    const sel = this.state.billMonth || curKey;
    const rate = RATE_PER_DEVICE;

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
        <div style={{ background: '#fff', border: '1px solid ' + C2.line, borderRadius: 8, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: C2.mut, marginBottom: 4 }}>Month</div>
              <select value={sel} onChange={e => this.setState({ billMonth: e.target.value })} style={{ border: '1px solid ' + C2.line, borderRadius: 10, padding: '9px 12px', fontSize: 14, background: '#fdfcf8', minWidth: 170 }}>
                {months.map(k => <option key={k} value={k}>{label(k)}{k === curKey ? ' (this month)' : ''}</option>)}
              </select>
            </div>
            <button onClick={() => this.setState({ billMonth: '' })} style={{ padding: '9px 14px', borderRadius: 10, background: sel === curKey ? C2.green : '#fff', color: sel === curKey ? '#fff' : C2.ink, border: '1px solid ' + (sel === curKey ? C2.green : C2.line), fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>This month</button>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: C2.mut, marginBottom: 4 }}>Rate per device (one-time)</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C2.ink }}>{money(rate)}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
            <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: C2.mut, marginBottom: 4 }}>Registered in {label(sel)}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: C2.green }}>{selCount}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: C2.mut, marginBottom: 4 }}>Amount for {label(sel)}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: C2.amber }}>{money(selCount * rate)}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid ' + C2.line, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: C2.mut, marginBottom: 4 }}>Total registered (all time)</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: C2.ink }}>{total}</div>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid ' + C2.line, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', fontSize: 12, fontWeight: 700, color: C2.mut, padding: '12px 16px', borderBottom: '1px solid ' + C2.line }}>
            <div style={{ flex: 1 }}>Month</div>
            <div style={{ width: 90, textAlign: 'right' }}>Devices</div>
            <div style={{ width: 110, textAlign: 'right' }}>Amount</div>
          </div>
          {months.map(k => (
            <div key={k} onClick={() => this.setState({ billMonth: k })} style={{ display: 'flex', fontSize: 13.5, padding: '11px 16px', borderBottom: '1px solid ' + C2.line, cursor: 'pointer', background: k === sel ? '#f2f2f2' : '#fff' }}>
              <div style={{ flex: 1, fontWeight: k === sel ? 700 : 500 }}>{label(k)}{k === curKey ? <span style={{ color: C2.green, fontSize: 11, marginLeft: 6 }}>this month</span> : null}</div>
              <div style={{ width: 90, textAlign: 'right', fontWeight: 700 }}>{byMonth[k] || 0}</div>
              <div style={{ width: 110, textAlign: 'right', color: C2.amber, fontWeight: 700 }}>{money((byMonth[k] || 0) * rate)}</div>
            </div>
          ))}
          <div style={{ display: 'flex', fontSize: 14, fontWeight: 800, padding: '13px 16px', background: '#faf8f1' }}>
            <div style={{ flex: 1 }}>Total</div>
            <div style={{ width: 90, textAlign: 'right' }}>{total}</div>
            <div style={{ width: 110, textAlign: 'right', color: C2.amber }}>{money(total * rate)}</div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C2.mut, marginTop: 10 }}>One-time charge per phone, billed in the month it was registered (deleted ones excluded). Never charged again.</div>
      </div>
    );
  };

  renderApp() {
    const { devices, error, enroll, form, tab, qrOpen } = this.state;
    const fi = { border: '1px solid ' + C.line, borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#fdfcf8', outline: 'none', width: '100%', boxSizing: 'border-box' };
    const ghost = { padding: '8px 12px', borderRadius: 10, background: '#fff', border: '1px solid ' + C.line, fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' };
    const badge = (cur) => {
      const m = { ok: [C.green, 'OK'], warn: [C.amber, 'Warning'], lock: [C.red, 'Locked'], release: [C.ink, 'Released'] }[cur] || [C.mut, cur];
      return <span style={{ color: m[0], border: '1px solid ' + m[0], fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>{m[1]}</span>;
    };
    const btnS = { padding: '7px 12px', borderRadius: 6, background: '#fff', color: C.ink, fontWeight: 600, fontSize: 12.5, border: '1px solid ' + C.line, cursor: 'pointer' };
    const btn = (label, tone, onClick) => <button onClick={onClick} style={{ ...btnS, ...(tone === 'danger' ? { color: C.red } : tone === 'off' ? { color: '#b5b5b5' } : tone === 'on' ? { borderColor: C.ink } : null) }}>{label}</button>;
    const link = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: C.mut, textDecoration: 'underline' };
    const mono = { fontFamily: 'ui-monospace,Consolas,monospace', fontSize: 12.5 };
    const field = (label, value) => value == null || value === '' ? null : (
      <div key={label} style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.mut, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, color: C.ink, overflowWrap: 'anywhere' }}>{value}</div>
      </div>
    );
    const section = (title, fields) => {
      const f = fields.filter(Boolean);
      return f.length ? (
        <div style={{ borderTop: '1px solid ' + C.line, padding: '12px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: '12px 20px' }}>{f}</div>
        </div>
      ) : null;
    };

    const list = devices || [];
    const counts = { all: 0, active: 0, locked: 0, released: 0, lost: 0, deleted: 0 };
    list.forEach(d => { const c = this.catOf(d); counts[c]++; if (c !== 'deleted') counts.all++; });
    counts.billing = list.filter(d => this.catOf(d) !== 'deleted').length;
    const tabs = [['all', 'All'], ['active', 'Active'], ['locked', 'Locked'], ['released', 'Released'], ['lost', 'Lost'], ['deleted', 'Deleted'], ['billing', 'Billing']];
    const shown = tab === 'all' ? list.filter(d => this.catOf(d) !== 'deleted') : list.filter(d => this.catOf(d) === tab);

    return (
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '16px 16px 64px' }}>
        {this.renderDetail()}
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <img src="/icon-lock.png" alt="" style={{ width: 42, height: 42, borderRadius: 8, border: '1px solid ' + C.line }} />
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Device Lock</div>
            <div style={{ fontSize: 12, color: C.mut }}>Enrolled phones on installment</div>
          </div>
          {this.props.embedded ? null : <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/'; }} style={{ ...ghost, background: C.green, color: '#fff', border: 'none' }}>← Back to Aqsat</button>}
          <button onClick={this.refresh} style={ghost}>↻ Refresh</button>
          {this.props.embedded ? null : <button onClick={this.signOut} style={{ ...ghost, background: '#f4f1e6', border: 'none' }}>Sign out</button>}
        </div>

        {/* Enroll */}
        <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 8, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Enroll a new phone</div>
          <div style={{ fontSize: 12, color: C.mut, marginBottom: 10 }}><b style={{ color: C.red }}>Required:</b> link the customer's plan so the phone auto-locks on overdue. Then give it a name you'll recognise.</div>
          <div style={{ marginBottom: 10 }}>{this.renderPicker()}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8, marginBottom: 10 }}>
            <input placeholder="Name to remember (customer / model)" value={form.label} onChange={e => this.setState({ form: { ...form, label: e.target.value } })} style={fi} />
            <input placeholder="Grace days (blank = shop default)" value={form.graceDays} onChange={e => this.setState({ form: { ...form, graceDays: e.target.value } })} style={fi} />
          </div>
          <button onClick={this.enroll} disabled={this.state.enrollBusy || !form.planId} style={{ padding: '10px 16px', borderRadius: 10, background: (this.state.enrollBusy || !form.planId) ? C.mut : C.green, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: (this.state.enrollBusy || !form.planId) ? 'not-allowed' : 'pointer' }}>{this.state.enrollBusy ? 'Creating…' : form.planId ? '+ Create enrollment' : 'Link a plan first'}</button>
          {enroll ? (
            <div style={{ marginTop: 12, background: '#fff', border: '1px solid ' + C.line, borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 13, color: C.ink, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid ' + C.line }}>📱 Code for: <b>{enroll.label || 'this phone'}</b>{enroll.customer ? <span style={{ color: C.mut }}> · linked to {enroll.customer}'s plan ✓</span> : null}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 4 }}>On the phone (after scanning the provisioning QR), open Device Lock and type this code:</div>
              <div style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 800, letterSpacing: 4, color: C.ink, textAlign: 'center', padding: '6px 0' }}>{enroll.claimCode}</div>
              <div style={{ fontSize: 11, color: C.mut }}>One-time, expires in 24h. PC fallback string: <span style={{ fontFamily: 'monospace', wordBreak: 'break-all', userSelect: 'all' }}>{enroll.enrollString}</span></div>
            </div>
          ) : null}
        </div>

        <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 8, marginBottom: 12, padding: '12px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>🛡 Factory-reset protection (shop Google account)</div>
          <div style={{ fontSize: 12, color: C.mut, margin: '4px 0 8px' }}>If someone wipes a phone from recovery mode, it will ask for this Google account before it can be used. Enter the account's numeric ID: open Google Maps signed in to the shop account → profile → <b>Your contributions</b>, and copy the long number after <b>/contrib/</b> in the link. Use an account the shop will keep forever — losing its password bricks wiped phones. Each phone shows "FRP ✓ armed" below once it has applied it (Android 11+).</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={this.state.frpIds || ''} onChange={e => this.setState({ frpIds: e.target.value })} placeholder="e.g. 112233445566778899001" style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid ' + C.line, fontFamily: 'monospace' }} />
            <button onClick={this.saveFrp} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Save</button>
          </div>
        </div>

        {/* Provisioning QR — collapsible */}
        <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 8, marginBottom: 20, overflow: 'hidden' }}>
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
                <span style={{ fontSize: 11, color: C.mut, marginLeft: 10 }}>{this.state.latestVersion ? appVersionName(this.state.latestVersion) + ' · ' : ''}hosted on aqsaat</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8, marginBottom: 10 }}>
                <input placeholder="APK download URL (https)" value={this.state.qrCfg.apkUrl} onChange={e => this.setState({ qrCfg: { ...this.state.qrCfg, apkUrl: e.target.value } })} style={fi} />
                <input placeholder="APK signature checksum" value={this.state.qrCfg.checksum} onChange={e => this.setState({ qrCfg: { ...this.state.qrCfg, checksum: e.target.value } })} style={fi} />
                <input placeholder="Wi-Fi SSID (optional)" value={this.state.qrCfg.ssid} onChange={e => this.setState({ qrCfg: { ...this.state.qrCfg, ssid: e.target.value } })} style={fi} />
                <input placeholder="Wi-Fi password (optional)" value={this.state.qrCfg.wifiPass} onChange={e => this.setState({ qrCfg: { ...this.state.qrCfg, wifiPass: e.target.value } })} style={fi} />
              </div>
              <button onClick={this.showQr} disabled={this.state.qrBusy} style={{ padding: '10px 16px', borderRadius: 10, background: C.ink, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>{this.state.qrBusy ? 'Building…' : 'Show provisioning QR'}</button>
              {this.state.qrImg ? <div style={{ textAlign: 'center', marginTop: 12 }}><img src={this.state.qrImg} alt="Provisioning QR" style={{ width: 280, maxWidth: '100%', borderRadius: 8, border: '1px solid ' + C.line, background: '#fff' }} /></div> : null}

              <div style={{ marginTop: 16, padding: 12, background: '#fff', border: '1px solid ' + C.line, borderRadius: 6 }}>
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
              <button key={k} onClick={() => this.setState({ tab: k })} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: on ? C.ink : '#fff', color: on ? '#fff' : C.ink, border: '1px solid ' + (on ? C.ink : C.line) }}>
                {lbl}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: 'transparent', color: on ? '#fff' : C.mut, padding: 0 }}>{counts[k]}</span>
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
              {shown.map(d => {
                const cs = this.connStatus(d);
                const live = d.claimed && d.status !== 'deleted';
                const info = d.info;
                const mode = d.lockMode || 'auto';
                return (
                <div key={d.id} style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 8, padding: '14px 16px 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
                        <span onClick={() => this.openDetail(d)} title="Open details & history" style={{ fontWeight: 700, fontSize: 15, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: d.label ? C.ink : C.mut }}>{d.label || 'Unnamed phone'}</span>
                        <button onClick={() => this.rename(d)} style={link}>✏️ Rename</button>
                      </div>
                      <div style={{ fontSize: 12, color: C.mut, marginTop: 2 }}>{[d.customer, d.plan].filter(Boolean).join(' · ') || d.id}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: cs.c, marginTop: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 7, background: cs.c }} />{cs.t}
                      </div>
                    </div>
                    {badge(d.current)}
                  </div>

                  {section('🔒 Lock', [
                    field('Mode', ({ auto: 'Auto — follows plan', force_lock: 'Locked by shop', force_unlock: 'Unlocked by shop' })[mode] || mode),
                    field('Status', d.status),
                    d.unlockUntil ? field('Temporary unlock', this.timedNote(d)) : null,
                    field('Calls', d.callMode === 'shop_only' ? <span style={{ color: C.red }}>Only {d.allowNumber || '—'}</span> : 'All allowed'),
                    live ? field('Control', d.instant ? 'Instant' : 'At next check-in (~6h)') : null,
                  ])}

                  {section('📱 Phone', [
                    live ? field('App', this.appVersionLabel(d)) : null,
                    field('Last check-in', d.lastCheckin ? new Date(d.lastCheckin).toLocaleString() : 'Never'),
                    field('📍 Location', d.locAt
                      ? <><a href={`https://maps.google.com/?q=${d.lat},${d.lng}`} target="_blank" rel="noopener" style={{ color: C.ink, textDecoration: 'underline' }}>{Number(d.lat).toFixed(5)}, {Number(d.lng).toFixed(5)}</a>
                          <div style={{ fontSize: 11.5, color: C.mut }}>{new Date(d.locAt).toLocaleString()}{d.locAcc ? ` · ±${Math.round(d.locAcc)}m` : ''}</div>
                          {d.locPerm && d.locPerm !== 'fg+bg' ? <div style={{ fontSize: 11.5, color: C.amber }}>{d.locPerm === 'none' ? 'Location permission off' : 'Background location off — updates only when the app is opened'}</div> : null}</>
                      : 'Not reported yet'),
                    info ? field('Model', [[info.brand, info.model].filter(Boolean).join(' '), info.android ? 'Android ' + info.android : ''].filter(Boolean).join(' · ')) : null,
                    info && info.imei1 ? field('IMEI', <span style={mono}>{info.imei1}{info.imei2 ? <><br />{info.imei2}</> : null}</span>) : null,
                    info && info.serial ? field('Serial', <span style={mono}>{info.serial}</span>) : null,
                    info && info.battery != null ? field('Battery', `${info.battery}%${info.charging ? ' · charging' : ''}${info.network ? ' · ' + info.network : ''}`) : null,
                  ])}

                  {live ? section('📶 SIM & protection', this.simFields(d, field)) : null}

                  {live && d.claimed ? section('🛠️ Remote fix', [<div key="fix" style={{ gridColumn: '1 / -1' }}>{this.renderRemoteFix(d)}</div>]) : null}

                  {d.status !== 'deleted' && this.state.tuOpen === d.id ? <div style={{ borderTop: '1px solid ' + C.line, padding: '12px 0' }}>{this.renderTempUnlock(d)}</div> : null}

                  <div style={{ borderTop: '1px solid ' + C.line, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {d.status === 'deleted' ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {btn('↩️ Restore', '', () => this.act(d.id, 'active'))}
                      {btn('🗑️ Delete forever', 'danger', () => this.act(d.id, 'purge', 'Permanently delete this record? This CANNOT be undone.'))}
                    </div>
                  ) : (<>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <div style={{ display: 'inline-flex', border: '1px solid ' + C.ink, borderRadius: 6, overflow: 'hidden' }}>
                        {[['force_lock', 'lock', '🔒 Lock', 'Force-lock this phone now?'], ['auto', 'auto', '⚙️ Auto', null], ['force_unlock', 'unlock', '🔓 Unlock', 'Force-unlock (ignore overdue) this phone?']].map(([m, a, lbl, q], i) => (
                          <button key={m} onClick={() => this.act(d.id, a, q)} style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 'none', borderLeft: i ? '1px solid ' + C.ink : 'none', background: mode === m ? C.ink : '#fff', color: mode === m ? '#fff' : C.ink }}>{lbl}</button>
                        ))}
                      </div>
                      {btn(this.state.tuOpen === d.id ? '✕ Close temporary unlock' : '⏱️ Temporary unlock', this.state.tuOpen === d.id ? 'on' : '', () => this.setState({ tuOpen: this.state.tuOpen === d.id ? null : d.id }))}
                      <span style={{ flex: 1 }} />
                      {d.claimed ? btn('🔄 Check in now', '', () => this.checkInNow(d)) : null}
                      {btn('📋 Details & history', '', () => this.openDetail(d))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      {d.callMode === 'shop_only'
                        ? btn('📞 Allow all calls', '', () => this.act(d.id, 'callopen', 'Lift the call block — let this phone call any number?'))
                        : btn('📞 Shop-only calls', '', () => this.setCallShop(d))}
                      <select value={d.simMode || 'lock'} onChange={e => this.setSimMode(d, e.target.value)} title="SIM lock for this phone" style={btnS}>
                        <option value="lock">📶 SIM: lock phone</option>
                        <option value="alert">📶 SIM: alert only</option>
                        <option value="off">📶 SIM: off</option>
                      </select>
                      {d.simChangedAt ? btn('✅ Accept new SIM', '', () => this.act(d.id, 'simaccept', 'Register the SIM now in this phone as its own? The SIM lock will then protect the NEW SIM.')) : null}
                      {(d.status === 'released' || d.status === 'lost') ? btn('▶️ Activate', '', () => this.act(d.id, 'active', 'Bring this phone back to Active (auto-lock on overdue)?')) : null}
                      <span style={{ flex: 1 }} />
                      {btn('⚠️ Mark lost', 'danger', () => this.act(d.id, 'lost', 'Mark this phone as LOST/STOLEN? It will lock on next check-in.'))}
                      {btn('🏁 Release', 'danger', () => this.act(d.id, 'release', 'Release this phone? This UN-ENROLLS it and removes the lock permanently — only do this when the loan is fully paid.'))}
                      {this.canDelete(d)
                        ? btn('🗑️ Delete', 'danger', () => this.act(d.id, 'delete', 'Move this device to Deleted?'))
                        : btn('🗑️ Delete', 'off', () => alert(d.status === 'released'
                            ? 'Release is still pending — wait until the phone checks in and frees itself, then delete.'
                            : 'Release this phone first. Deleting an enrolled phone leaves it stuck: it stays managed and locks itself when it can\'t reach the server.'))}
                    </div>
                  </>)}
                  </div>
                </div>
                );
              })}
            </div>
          )}
      </div>
    );
  }
}
