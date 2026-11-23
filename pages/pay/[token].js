import Head from 'next/head';
import { useState } from 'react';

export async function getServerSideProps({ params, query }) {
  // Imported here so the service-key client is never built at build time.
  const { config } = await import('../../lib/payments/jazzcash');
  const { deviceFromToken, dueNow, planOf, loadShop } = await import('../../lib/payments/online');
  const device = await deviceFromToken(params.token);
  if (!device) return { props: { invalid: true } };
  const shop = await loadShop();
  const plan = planOf(shop, device.plan_id);
  const due = dueNow(plan);
  const cust = (shop.customers || []).find(c => c.id === device.customer_id);
  return {
    props: {
      token: params.token,
      enabled: !!config(),
      name: (cust && cust.name) || '',
      voucher: (plan && (plan.voucherNo || '')) || '',
      amount: due.amount,
      count: due.installments.length,
      shopName: (shop.settings && shop.settings.businessName) || 'Warraich Corporation',
      result: ['paid', 'pending', 'failed'].includes(query.r) ? query.r : '',
    },
  };
}

const fmt = n => 'Rs ' + Number(n || 0).toLocaleString('en-PK');

export default function Pay(p) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function start() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/pay/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: p.token }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not start payment');
      const form = document.createElement('form');
      form.method = 'POST'; form.action = j.action;
      Object.entries(j.fields).forEach(([k, v]) => {
        const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  const box = { maxWidth: 420, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif', color: '#1a2b1f' };
  const card = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.08)', textAlign: 'center' };
  const btn = { width: '100%', padding: '16px', borderRadius: 12, border: 0, background: '#c8102e', color: '#fff', fontSize: 18, fontWeight: 700, marginTop: 20 };
  const ur = { fontFamily: "'Noto Nastaliq Urdu', serif", direction: 'rtl', fontSize: 15, color: '#4a5a4f', marginTop: 6 };

  let body;
  if (p.invalid) body = <div>This payment link is not valid. Please contact the shop.<div style={ur}>یہ لنک درست نہیں۔ دکان سے رابطہ کریں۔</div></div>;
  else if (p.result === 'paid') body = <>
    <div style={{ fontSize: 48 }}>✅</div>
    <h2>Payment received</h2>
    <p>Your phone will unlock within a minute. Keep it connected to the internet.</p>
    <div style={ur}>ادائیگی موصول ہو گئی۔ آپ کا فون ایک منٹ میں کھل جائے گا۔ انٹرنیٹ آن رکھیں۔</div>
  </>;
  else if (p.result === 'pending') body = <>
    <div style={{ fontSize: 48 }}>⏳</div>
    <h2>Payment being confirmed</h2>
    <p>JazzCash has not confirmed it yet. Your phone unlocks automatically once it does. Don't pay again.</p>
    <div style={ur}>تصدیق ہو رہی ہے۔ دوبارہ ادائیگی نہ کریں، فون خود کھل جائے گا۔</div>
  </>;
  else if (!p.amount) body = <>
    <div style={{ fontSize: 48 }}>👍</div>
    <h2>Nothing due right now</h2>
    <div style={ur}>اس وقت کوئی قسط باقی نہیں۔</div>
  </>;
  else body = <>
    {p.result === 'failed' && <div style={{ color: '#a4362b', fontWeight: 600 }}>Last payment did not go through. You can try again.<div style={ur}>پچھلی ادائیگی نہیں ہوئی۔ دوبارہ کوشش کریں۔</div></div>}
    <div style={{ fontSize: 14, color: '#6b7a70' }}>{p.name}{p.voucher ? ' · ' + p.voucher : ''}</div>
    <div style={{ fontSize: 13, color: '#6b7a70', marginTop: 16 }}>Amount due ({p.count} installment{p.count > 1 ? 's' : ''})</div>
    <div style={{ fontSize: 36, fontWeight: 800, color: '#0b4f37', margin: '4px 0' }}>{fmt(p.amount)}</div>
    <div style={ur}>واجب الادا رقم</div>
    {p.enabled
      ? <button style={{ ...btn, opacity: busy ? .6 : 1 }} disabled={busy} onClick={start}>{busy ? 'Opening JazzCash…' : 'Pay with JazzCash'}</button>
      : <div style={{ marginTop: 20 }}>Online payment is not available yet. Please pay at the shop.<div style={ur}>آن لائن ادائیگی ابھی دستیاب نہیں۔ دکان پر ادا کریں۔</div></div>}
    {err && <p style={{ color: '#a4362b' }}>{err}</p>}
    <p style={{ fontSize: 12, color: '#6b7a70', marginTop: 16 }}>Your phone unlocks automatically after payment.</p>
  </>;

  return <div style={{ minHeight: '100vh', background: '#eef4f0' }}>
    <Head><title>Pay installment</title><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /></Head>
    <div style={box}>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 20, color: '#0b4f37', marginBottom: 16 }}>{p.shopName}</div>
      <div style={card}>{body}</div>
    </div>
  </div>;
}
