import React from 'react';
import AuthGate, { C } from '../lib/ui/AuthGate';

const fmt = n => 'Rs ' + Math.round(n || 0).toLocaleString('en-PK');

class Stock extends React.Component {
  state = { r: null, err: '', q: '', open: null, addFor: null, paste: '', cost: '', busy: false, msg: '' };
  componentDidMount() { this.load(); }
  load = async () => { try { this.setState({ r: await this.props.api('/api/stock'), err: '' }); } catch (e) { this.setState({ err: e.message }); } };

  add = async () => {
    // One unit per line: "IMEI1 [IMEI2] [cost]" — barcode scanners type the IMEI + Enter.
    const units = this.state.paste.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => {
      const parts = l.split(/[\s,;]+/);
      const codes = parts.filter(x => /^\d{15}$/.test(x));
      const other = parts.filter(x => !/^\d{15}$/.test(x));
      const cost = other.find(x => /^\d{3,7}$/.test(x));
      const serial = codes.length ? '' : (other.find(x => x !== cost) || '');
      return { imei: codes[0] || '', imei2: codes[1] || '', serial, cost: cost || this.state.cost };
    });
    if (!units.length) return;
    this.setState({ busy: true, msg: '' });
    try {
      const j = await this.props.api('/api/stock', { method: 'POST', body: { action: 'add', productId: this.state.addFor, units } });
      this.setState({ paste: '', msg: `Added ${j.added}` + (j.errors.length ? '\n' + j.errors.join('\n') : '') });
      this.load();
    } catch (e) { this.setState({ msg: e.message }); }
    this.setState({ busy: false });
  };

  unit = async (unitId, action, msg) => {
    if (!confirm(msg)) return;
    try { await this.props.api('/api/stock', { method: 'POST', body: { action, unitId } }); this.load(); } catch (e) { alert(e.message); }
  };

  render() {
    const { r, err, q, open } = this.state;
    if (err) return <div style={{ color: C.red }}>{err}</div>;
    if (!r) return <div style={{ color: C.mut }}>Loading…</div>;
    const card = { background: '#fff', border: '1px solid ' + C.line, borderRadius: 16, padding: 14, marginBottom: 10 };
    const tile = (label, v, color) => <div style={{ ...card, flex: '1 1 140px', marginBottom: 0 }}><div style={{ fontSize: 12, color: C.mut }}>{label}</div><div style={{ fontWeight: 800, fontSize: 18, color: color || C.ink }}>{v}</div></div>;
    const qq = q.trim().replace(/\s/g, '').toUpperCase();
    const hits = qq.length >= 4 ? r.products.flatMap(p => p.units.filter(u => [u.imei, u.imei2, u.serial].some(c => c && c.includes(qq))).map(u => ({ ...u, product: p.name }))) : [];
    const inStockTotal = r.products.reduce((t, p) => t + p.inStock, 0);
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          {tile('In stock', inStockTotal)}{tile('Stock value (cost)', fmt(r.stockValue))}
          {tile('Profit on sold units', fmt(r.soldProfit), C.green)}{tile('Older than 90 days', r.aging['90+'], r.aging['90+'] ? C.red : C.ink)}
        </div>
        <div style={card}>
          <div style={{ fontSize: 12, color: C.mut, marginBottom: 6 }}>Age of stock (days in shop): 0–30: <b>{r.aging['0-30']}</b> · 31–60: <b>{r.aging['31-60']}</b> · 61–90: <b>{r.aging['61-90']}</b> · 90+: <b>{r.aging['90+']}</b></div>
          {r.slow.length ? <div style={{ fontSize: 13 }}>🐢 Slow: {r.slow.map(s => `${s.name} (${s.inStock}, oldest ${s.oldest}d)`).join(' · ')}</div> : null}
        </div>
        <input placeholder="Find IMEI / serial (who has this phone?)" value={q} onChange={e => this.setState({ q: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12, border: '1px solid ' + C.line, marginBottom: 10, fontFamily: 'monospace' }} />
        {hits.length ? <div style={card}>{hits.map(u => <div key={u.id} style={{ fontSize: 13, padding: '4px 0' }}><b>{u.product}</b> <span style={{ fontFamily: 'monospace' }}>{u.imei || u.serial}</span> — {u.status === 'in_stock' ? 'in stock' : `sold to ${u.customer} ${u.voucher}`}</div>)}</div> : null}
        {r.products.map(p => (
          <div key={p.id} style={card}>
            <div onClick={() => this.setState({ open: open === p.id ? null : p.id })} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ flex: 1 }}><b>{p.name}</b> <span style={{ fontSize: 12, color: C.mut }}>{p.category}</span></div>
              <div style={{ fontSize: 13 }}><b>{p.inStock}</b> in stock · {p.units.length - p.inStock} sold</div>
            </div>
            {open === p.id ? (
              <div style={{ marginTop: 10 }}>
                {p.units.map(u => (
                  <div key={u.id} style={{ display: 'flex', gap: 8, borderTop: '1px solid ' + C.line, padding: '7px 0', fontSize: 13, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', flex: '1 1 160px' }}>{u.imei || u.serial}{u.imei2 ? ' / ' + u.imei2 : ''}</span>
                    <span style={{ flex: '1 1 160px', color: u.status === 'in_stock' ? C.green : C.mut }}>{u.status === 'in_stock' ? `In stock · ${u.age}d` : `Sold · ${u.customer} ${u.voucher}`}</span>
                    <span>cost {fmt(u.cost)}{u.profit != null ? <> · profit <b style={{ color: u.profit >= 0 ? C.green : C.red }}>{fmt(u.profit)}</b></> : null}</span>
                    {u.status === 'in_stock'
                      ? <button onClick={() => this.unit(u.id, 'remove', 'Remove this unit from stock records?')} style={{ border: 'none', background: '#fdecea', color: C.red, borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>Remove</button>
                      : <button onClick={() => this.unit(u.id, 'return', 'Customer returned this phone? It goes back into stock.')} style={{ border: 'none', background: '#f4f1e6', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>Returned</button>}
                  </div>
                ))}
                {this.state.addFor === p.id ? (
                  <div style={{ marginTop: 10 }}>
                    <textarea rows={5} value={this.state.paste} onChange={e => this.setState({ paste: e.target.value })} placeholder={'Scan or type one per line:\nIMEI1 IMEI2 cost\n356789104523917 356789104523925 36000'} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid ' + C.line, fontFamily: 'monospace' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <input placeholder="Default cost" value={this.state.cost} onChange={e => this.setState({ cost: e.target.value })} style={{ padding: 9, borderRadius: 10, border: '1px solid ' + C.line, width: 130 }} />
                      <button disabled={this.state.busy} onClick={this.add} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Add to stock</button>
                    </div>
                    {this.state.msg ? <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: C.ink, fontFamily: 'inherit' }}>{this.state.msg}</pre> : null}
                  </div>
                ) : <button onClick={() => this.setState({ addFor: p.id, msg: '' })} style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, border: '1px solid ' + C.line, background: '#fff', fontWeight: 700, cursor: 'pointer' }}>+ Add units</button>}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }
}

export default function StockPage() {
  return <AuthGate title="IMEI Stock">{api => <Stock api={api} />}</AuthGate>;
}
