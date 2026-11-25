import React from 'react';
import AuthGate, { C } from '../lib/ui/AuthGate';

const fmt = n => 'Rs ' + Math.round(n || 0).toLocaleString('en-PK');

class SignPad extends React.Component {
  ref = React.createRef();
  drawn = false;
  componentDidMount() {
    const cv = this.ref.current;
    const ratio = window.devicePixelRatio || 1;
    cv.width = cv.offsetWidth * ratio; cv.height = cv.offsetHeight * ratio;
    const ctx = cv.getContext('2d');
    ctx.scale(ratio, ratio); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
    let down = false;
    const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.onpointerdown = e => { down = true; cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); ctx.beginPath(); ctx.moveTo(x, y); };
    cv.onpointermove = e => { if (!down) return; const [x, y] = pt(e); ctx.lineTo(x, y); ctx.stroke(); this.drawn = true; };
    cv.onpointerup = cv.onpointercancel = () => { down = false; this.props.onChange && this.props.onChange(); };
  }
  clear = () => { const cv = this.ref.current; cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); this.drawn = false; this.props.onChange && this.props.onChange(); };
  value = () => (this.drawn ? this.ref.current.toDataURL('image/png') : null);
  render() {
    return (
      <div>
        <canvas ref={this.ref} style={{ width: '100%', height: 120, border: '1.5px dashed ' + C.line, borderRadius: 10, background: '#fff', touchAction: 'none' }} />
        <button type="button" onClick={this.clear} className="no-print" style={{ fontSize: 12, background: 'none', border: 'none', color: C.mut, cursor: 'pointer' }}>Clear</button>
      </div>
    );
  }
}

class Agreement extends React.Component {
  state = { d: null, err: '', busy: false, tick: 0 };
  pads = { customer: React.createRef(), guarantor: React.createRef(), shop: React.createRef() };

  componentDidMount() { this.load(); }
  planId = () => new URLSearchParams(window.location.search).get('plan') || '';
  load = async () => {
    try { this.setState({ d: await this.props.api('/api/agreement?planId=' + encodeURIComponent(this.planId())), err: '' }); }
    catch (e) { this.setState({ err: e.message }); }
  };

  sign = async () => {
    const sigs = {};
    Object.entries(this.pads).forEach(([k, r]) => { const v = r.current && r.current.value(); if (v) sigs[k] = v; });
    if (!sigs.customer || !sigs.shop) { alert('Customer and shop must both sign.\nخریدار اور دکان دونوں کے دستخط ضروری ہیں۔'); return; }
    if (!confirm('Save the signed agreement? It can\'t be changed afterwards.')) return;
    this.setState({ busy: true });
    try { await this.props.api('/api/agreement', { method: 'POST', body: { action: 'sign', planId: this.planId(), sigs } }); await this.load(); }
    catch (e) { alert(e.message); }
    this.setState({ busy: false });
  };

  render() {
    const { d, err } = this.state;
    if (err) return <div style={{ color: C.red }}>{err}</div>;
    if (!d) return <div style={{ color: C.mut }}>Loading…</div>;
    const signed = d.agreement && d.agreement.signedAt;
    const f = signed && d.agreement.facts ? d.agreement.facts : d;
    const ur = { direction: 'rtl', fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif", color: '#333', fontSize: 14, lineHeight: 2 };
    const cell = { padding: '4px 8px', borderBottom: '1px solid #eee', fontSize: 13 };
    const sigBox = (who, label, labelUr) => (
      <div style={{ flex: '1 1 220px' }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{label} <span style={{ ...ur, fontSize: 12 }}>{labelUr}</span></div>
        {signed ? (d.signatures[who] ? <img src={d.signatures[who]} alt={label} style={{ width: '100%', height: 110, objectFit: 'contain', borderBottom: '1px solid #333' }} /> : <div style={{ height: 110, borderBottom: '1px solid #333', color: C.mut, fontSize: 12 }}>—</div>)
          : <SignPad ref={this.pads[who]} />}
      </div>
    );
    return (
      <div>
        <style>{'@media print{.no-print{display:none!important}body{background:#fff!important}}'}</style>
        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {signed ? <span style={{ background: C.soft, color: C.green, padding: '8px 12px', borderRadius: 10, fontWeight: 700 }}>✓ Signed {new Date(d.agreement.signedAt).toLocaleString()}</span> : null}
          <button onClick={() => window.print()} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid ' + C.line, background: '#fff', fontWeight: 700, cursor: 'pointer' }}>🖨 Print / PDF</button>
        </div>
        <div style={{ background: '#fff', border: '1px solid ' + C.line, borderRadius: 16, padding: 24 }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid ' + C.green, paddingBottom: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{f.shop.name}</div>
            <div style={{ fontWeight: 700 }}>Installment Sale Agreement <span style={ur}>معاہدہ برائے اقساط</span></div>
            <div style={{ fontSize: 12, color: C.mut }}>{f.plan.voucher ? 'Voucher ' + f.plan.voucher + ' · ' : ''}Date {f.plan.startDate}</div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, lineHeight: 1.7 }}>
            <div style={{ flex: '1 1 260px' }}><b>Customer / خریدار</b><br />{f.customer.name}{f.customer.fatherName ? ' s/o ' + f.customer.fatherName : ''}<br />CNIC: {f.customer.cnic || '—'}<br />Phone: {f.customer.phone}<br />{f.customer.address}</div>
            <div style={{ flex: '1 1 260px' }}><b>Guarantor / ضامن</b><br />{f.guarantor && f.guarantor.name ? <>{f.guarantor.name}{f.guarantor.relation ? ' (' + f.guarantor.relation + ')' : ''}<br />CNIC: {f.guarantor.cnic || '—'}<br />Phone: {f.guarantor.phone}</> : '—'}</div>
            <div style={{ flex: '1 1 260px' }}><b>Product / پروڈکٹ</b><br />{f.product.name}<br />{f.plan.imei ? 'IMEI: ' + f.plan.imei : ''}{f.plan.serialNo ? ' Serial: ' + f.plan.serialNo : ''}{f.plan.chassisNo ? ' Chassis: ' + f.plan.chassisNo : ''}{f.plan.engineNo ? ' Engine: ' + f.plan.engineNo : ''}<br />Total {fmt(f.plan.total)} · Down {fmt(f.plan.down)}</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '14px 0' }}>
            <thead><tr><th style={{ ...cell, textAlign: 'left' }}>#</th><th style={{ ...cell, textAlign: 'left' }}>Due date / تاریخ</th><th style={{ ...cell, textAlign: 'right' }}>Amount / رقم</th></tr></thead>
            <tbody>{f.schedule.map(s => <tr key={s.n}><td style={cell}>{s.n}</td><td style={cell}>{s.dueDate}</td><td style={{ ...cell, textAlign: 'right' }}>{fmt(s.amount)}</td></tr>)}</tbody>
          </table>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Terms / شرائط</div>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {d.terms.map((t, i) => <li key={i} style={{ marginBottom: 8, fontSize: 13 }}>{t.en}<div style={ur}>{t.ur}</div></li>)}
          </ol>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 20 }}>
            {sigBox('customer', 'Customer signature', 'دستخط خریدار')}
            {sigBox('guarantor', 'Guarantor signature', 'دستخط ضامن')}
            {sigBox('shop', 'For the shop', 'منجانب دکان')}
          </div>
        </div>
        {!signed ? (
          <button className="no-print" disabled={this.state.busy} onClick={this.sign} style={{ marginTop: 14, width: '100%', padding: 14, borderRadius: 12, background: C.green, color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer' }}>
            {this.state.busy ? 'Saving…' : 'Save signed agreement'}
          </button>
        ) : null}
      </div>
    );
  }
}

export default function AgreementPage() {
  return <AuthGate title="Agreement">{api => <Agreement api={api} />}</AuthGate>;
}
