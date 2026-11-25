import React from 'react';
import AuthGate, { C } from '../lib/ui/AuthGate';

const fmt = n => 'Rs ' + Math.round(n || 0).toLocaleString('en-PK');
const waNum = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '92' + d.slice(1); return d; };
const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((ok, fail) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = LEAFLET + 'leaflet.js'; s.onload = () => ok(window.L); s.onerror = fail; document.head.appendChild(s);
  });
}

class Recovery extends React.Component {
  state = { data: null, err: '', q: '', view: 'list', pick: null, sel: [], busy: false, done: null };
  mapEl = React.createRef();

  componentDidMount() { this.load(); }
  load = async () => {
    try { this.setState({ data: await this.props.api('/api/recovery'), err: '' }); }
    catch (e) { this.setState({ err: e.message }); }
  };

  showMap = async () => {
    this.setState({ view: 'map' });
    try {
      const L = await loadLeaflet();
      const pts = this.rows().filter(r => r.location);
      if (this.map) this.map.remove();
      this.map = L.map(this.mapEl.current);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(this.map);
      const b = [];
      pts.forEach(r => {
        const ll = [r.location.lat, r.location.lng]; b.push(ll);
        L.circleMarker(ll, { radius: 9, color: r.daysLate > 30 ? C.red : C.amber, fillOpacity: 0.8 }).addTo(this.map)
          .bindPopup(`<b>${r.customer.name}</b><br>${fmt(r.overdueAmount)} · ${r.daysLate}d late<br><a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${ll.join(',')}">Directions</a>`);
      });
      if (b.length) this.map.fitBounds(b, { padding: [30, 30], maxZoom: 15 }); else this.map.setView([31.27, 72.31], 11);
    } catch (e) { this.setState({ err: 'Map could not load (no internet?)' }); }
  };

  rows = () => {
    const q = this.state.q.trim().toLowerCase();
    return (this.state.data ? this.state.data.list : []).filter(r => !q || [r.customer.name, r.customer.area, r.customer.phone, r.voucher].some(x => String(x).toLowerCase().includes(q)));
  };

  collect = async () => {
    const r = this.state.pick;
    const total = r.overdue.filter(o => this.state.sel.includes(o.n)).reduce((t, o) => t + o.amount, 0);
    if (!confirm(`Collected ${fmt(total)} cash from ${r.customer.name}?\n${r.customer.name} سے ${fmt(total)} وصول کیے؟`)) return;
    this.setState({ busy: true });
    try {
      const j = await this.props.api('/api/recovery', { method: 'POST', body: { planId: r.planId, ns: this.state.sel } });
      const shop = this.state.data.shopName;
      const text = `✅ *${shop}* — رسید / Receipt\n\n${r.customer.name}${r.voucher ? ' · ' + r.voucher : ''}\nReceived: *${fmt(j.total)}* (installment ${j.marked.join(', ')})\nCollected by: ${this.state.data.me.name}\nRemaining: ${fmt(j.remaining)}\n\nشکریہ 🙏`;
      this.setState({ done: { text, phone: r.customer.phone, total: j.total }, pick: null, sel: [] });
      this.load();
    } catch (e) { alert(e.message); }
    this.setState({ busy: false });
  };

  render() {
    const { data, err, view, pick, done } = this.state;
    if (err && !data) return <div style={{ color: C.red }}>{err}</div>;
    if (!data) return <div style={{ color: C.mut }}>Loading…</div>;
    const rows = this.rows();
    const card = { background: '#fff', border: '1px solid ' + C.line, borderRadius: 16, padding: 14, marginBottom: 10 };
    const btn = (bg, fg) => ({ padding: '9px 12px', borderRadius: 10, border: 'none', background: bg, color: fg, fontWeight: 700, textDecoration: 'none', fontSize: 13, cursor: 'pointer', display: 'inline-block' });
    const todayTotal = data.today.reduce((t, x) => t + x.amount, 0);
    return (
      <div>
        <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}><b>{data.me.name}</b><div style={{ fontSize: 13, color: C.mut }}>{rows.length} overdue · {fmt(rows.reduce((t, r) => t + r.overdueAmount, 0))}</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: C.mut }}>Collected today</div><div style={{ fontWeight: 800, color: C.green }}>{fmt(todayTotal)}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input placeholder="Search name / area / phone" value={this.state.q} onChange={e => this.setState({ q: e.target.value })} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid ' + C.line }} />
          <button onClick={() => (view === 'map' ? this.setState({ view: 'list' }) : this.showMap())} style={btn('#fff', C.ink)}>{view === 'map' ? '☰ List' : '🗺 Map'}</button>
        </div>
        {done ? (
          <div style={{ ...card, background: C.soft }}>
            <b>Recorded {fmt(done.total)}.</b> Send the customer their receipt:
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {done.phone ? <a target="_blank" rel="noreferrer" href={`https://wa.me/${waNum(done.phone)}?text=${encodeURIComponent(done.text)}`} style={btn('#25d366', '#fff')}>💬 WhatsApp receipt</a> : null}
              <button onClick={() => this.setState({ done: null })} style={btn('#fff', C.ink)}>Close</button>
            </div>
          </div>
        ) : null}
        <div ref={this.mapEl} style={{ height: view === 'map' ? 420 : 0, borderRadius: 16, overflow: 'hidden', marginBottom: view === 'map' ? 10 : 0 }} />
        {view === 'list' ? rows.map(r => (
          <div key={r.planId} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div><b>{r.customer.name}</b> <span style={{ fontSize: 12, color: C.mut }}>{r.voucher}</span>
                <div style={{ fontSize: 13, color: C.mut }}>📍 {[r.customer.address, r.customer.area].filter(Boolean).join(', ') || '—'}</div>
                <div style={{ fontSize: 12, color: C.mut }}>{r.product}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 800, color: r.daysLate > 30 ? C.red : C.amber }}>{fmt(r.overdueAmount)}</div><div style={{ fontSize: 12, color: C.mut }}>{r.overdue.length} inst · {r.daysLate}d late</div></div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {r.customer.phone ? <a href={'tel:' + r.customer.phone} style={btn(C.soft, C.green)}>📞 Call</a> : null}
              {r.customer.phone ? <a target="_blank" rel="noreferrer" href={'https://wa.me/' + waNum(r.customer.phone)} style={btn(C.soft, C.green)}>💬</a> : null}
              <a target="_blank" rel="noreferrer" href={r.location ? `https://www.google.com/maps/dir/?api=1&destination=${r.location.lat},${r.location.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([r.customer.address, r.customer.area, r.customer.city].filter(Boolean).join(', '))}`} style={btn(C.soft, C.green)}>🧭 {r.location ? 'Phone location' : 'Address'}</a>
              {r.guarantor ? <a href={'tel:' + r.guarantor.phone} style={btn('#f4f1e6', C.ink)}>👤 Guarantor</a> : null}
              <button onClick={() => this.setState({ pick: r, sel: [r.overdue[0].n] })} style={btn(C.green, '#fff')}>💰 Collect</button>
            </div>
          </div>
        )) : null}
        {pick ? (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }} onClick={() => this.setState({ pick: null })}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', padding: 18 }}>
              <b>Collect from {pick.customer.name}</b>
              {pick.overdue.map(o => (
                <label key={o.n} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid ' + C.line, alignItems: 'center' }}>
                  <input type="checkbox" checked={this.state.sel.includes(o.n)} onChange={e => this.setState(s => ({ sel: e.target.checked ? [...s.sel, o.n] : s.sel.filter(x => x !== o.n) }))} style={{ width: 20, height: 20 }} />
                  <span style={{ flex: 1 }}>Installment {o.n} · due {o.dueDate}</span><b>{fmt(o.amount)}</b>
                </label>
              ))}
              <button disabled={this.state.busy || !this.state.sel.length} onClick={this.collect} style={{ ...btn(C.green, '#fff'), width: '100%', padding: 14, marginTop: 12, fontSize: 15 }}>
                {this.state.busy ? 'Saving…' : `Record ${fmt(pick.overdue.filter(o => this.state.sel.includes(o.n)).reduce((t, o) => t + o.amount, 0))} cash`}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}

export default function RecoveryPage() {
  return <AuthGate title="Recovery">{api => <Recovery api={api} />}</AuthGate>;
}
