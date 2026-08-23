import React from 'react';
import Head from 'next/head';
import { supabase, SHOP_ID } from '../lib/supabase';

function fmtPKR(n) {
  if (n == null || isNaN(n)) return 'Rs 0';
  return 'Rs ' + Math.round(n).toLocaleString('en-PK');
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });
}
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default class Portal extends React.Component {
  state = {
    phone: '',
    loading: false,
    error: '',
    customer: null,
    plans: [],
    products: [],
    settings: {},
    expandedPlan: null,
    found: false,
  };

  componentDidMount() {
    const params = new URLSearchParams(window.location.search);
    const ph = params.get('phone') || params.get('p') || '';
    if (ph) {
      this.setState({ phone: ph }, () => this.lookup());
    }
  }

  normalizePhone(raw) {
    return raw.replace(/[^0-9]/g, '');
  }

  lookup = async () => {
    const phone = this.normalizePhone(this.state.phone);
    if (phone.length < 4) {
      this.setState({ error: 'Please enter a valid phone number / درست فون نمبر درج کریں' });
      return;
    }
    this.setState({ loading: true, error: '', found: false });
    try {
      const { data, error } = await supabase.from('shops').select('data').eq('id', SHOP_ID).single();
      if (error) throw error;
      const d = data.data;
      const customers = (d.customers || []).filter(c => !c._deleted);
      const plans = (d.plans || []).filter(p => !p._deleted);
      const products = (d.products || []).filter(p => !p._deleted);
      const settings = d.settings || {};

      const customer = customers.find(c => {
        const cp = this.normalizePhone(c.phone || '');
        const ca = this.normalizePhone(c.altPhone || '');
        return cp.includes(phone) || phone.includes(cp) || (ca && (ca.includes(phone) || phone.includes(ca)));
      });

      if (!customer) {
        this.setState({ loading: false, error: 'No account found with this number / اس نمبر سے کوئی اکاؤنٹ نہیں ملا', found: false });
        return;
      }

      const myPlans = plans.filter(p => p.customerId === customer.id);
      this.setState({ loading: false, customer, plans: myPlans, products, settings, found: true, error: '' });
    } catch (e) {
      this.setState({ loading: false, error: 'Connection error. Please try again. / دوبارہ کوشش کریں' });
    }
  };

  getPlanProduct(plan) {
    return this.state.products.find(p => p.id === plan.productId) || { name: 'Product', emoji: '📦' };
  }

  render() {
    const { phone, loading, error, customer, plans, settings, found, expandedPlan } = this.state;
    const shopName = settings.businessName || settings.shopName || 'Aqsat';
    const today = todayStr();

    return React.createElement('div', { style: { minHeight: '100vh', background: 'linear-gradient(180deg, #f0fdf4 0%, #fdfcf8 30%)', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" } },
      React.createElement(Head, {},
        React.createElement('title', {}, 'My Account — ' + shopName),
        React.createElement('meta', { name: 'viewport', content: 'width=device-width,initial-scale=1' }),
        React.createElement('meta', { name: 'theme-color', content: '#0f6b4b' }),
      ),

      React.createElement('div', { style: { maxWidth: 480, margin: '0 auto', padding: '0 16px 40px' } },

        React.createElement('div', { style: { textAlign: 'center', padding: '32px 0 24px' } },
          React.createElement('div', { style: { width: 56, height: 56, borderRadius: 16, background: '#0f6b4b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24, fontWeight: 800 } }, shopName[0] || 'A'),
          React.createElement('div', { style: { fontSize: 22, fontWeight: 800, color: '#1a2b1f', letterSpacing: '-0.02em' } }, shopName),
          React.createElement('div', { style: { fontSize: 13, color: '#7a7663', marginTop: 4 } }, 'Customer Portal / کسٹمر پورٹل'),
        ),

        !found ? this.renderLookup(phone, loading, error) : this.renderAccount(customer, plans, settings, today, expandedPlan),
      ),
    );
  }

  renderLookup(phone, loading, error) {
    const h = React.createElement;
    return h('div', {},
      h('div', { style: { background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid #ece8dc' } },
        h('div', { style: { fontSize: 16, fontWeight: 700, color: '#1a2b1f', marginBottom: 4 } }, 'Check your account'),
        h('div', { style: { fontSize: 13, color: '#7a7663', marginBottom: 16 } }, 'Enter your phone number to view your installment plans'),
        h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Phone Number / فون نمبر'),
        h('input', {
          type: 'tel',
          value: phone,
          onChange: e => this.setState({ phone: e.target.value, error: '' }),
          onKeyDown: e => e.key === 'Enter' && this.lookup(),
          placeholder: '03XX XXXXXXX',
          style: { width: '100%', border: '2px solid #ece8dc', borderRadius: 14, padding: '14px 16px', fontSize: 18, fontWeight: 600, background: '#fdfcf8', outline: 'none', letterSpacing: '0.05em', textAlign: 'center', boxSizing: 'border-box' },
        }),
        error ? h('div', { style: { color: '#b91c1c', fontSize: 13, marginTop: 10, textAlign: 'center', fontWeight: 600 } }, error) : null,
        h('button', {
          onClick: this.lookup,
          disabled: loading,
          style: { width: '100%', marginTop: 16, padding: '14px', borderRadius: 14, background: loading ? '#7a7663' : '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'wait' : 'pointer' },
        }, loading ? 'Checking... / چیک ہو رہا ہے' : '🔍 View My Account'),
      ),
      h('div', { style: { textAlign: 'center', marginTop: 20, fontSize: 12, color: '#7a7663' } },
        'Powered by Aqsat Installment Manager',
      ),
    );
  }

  renderAccount(customer, plans, settings, today, expandedPlan) {
    const h = React.createElement;
    const shopName = settings.businessName || settings.shopName || 'Aqsat';

    const activePlans = plans.filter(p => {
      const unpaid = (p.schedule || []).filter(s => !s.paid);
      return unpaid.length > 0;
    });
    const completedPlans = plans.filter(p => {
      const unpaid = (p.schedule || []).filter(s => !s.paid);
      return unpaid.length === 0;
    });

    const totalRemaining = plans.reduce((s, p) => s + (p.schedule || []).filter(si => !si.paid).reduce((a, si) => a + si.amount, 0), 0);
    const totalPaid = plans.reduce((s, p) => s + (p.schedule || []).filter(si => si.paid).reduce((a, si) => a + (si.amountPaid || si.amount), 0), 0);

    const nextDue = activePlans
      .flatMap(p => (p.schedule || []).filter(s => !s.paid).map(s => ({ ...s, plan: p })))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

    const overduePlans = activePlans.filter(p => (p.schedule || []).some(s => !s.paid && s.dueDate < today));
    const overdueAmount = plans.reduce((s, p) => s + (p.schedule || []).filter(si => !si.paid && si.dueDate < today).reduce((a, si) => a + si.amount, 0), 0);

    return h('div', {},
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 } },
        h('div', { style: { width: 48, height: 48, borderRadius: 14, background: customer.color || '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 } }, customer.avatar || customer.name[0]),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontWeight: 800, fontSize: 18, color: '#1a2b1f' } }, customer.name),
          h('div', { style: { fontSize: 12, color: '#7a7663' } }, '📞 ' + customer.phone),
        ),
        h('button', { onClick: () => this.setState({ found: false, phone: '', customer: null, plans: [] }), style: { padding: '8px 12px', borderRadius: 10, background: '#f4f1e6', fontSize: 12, fontWeight: 600, color: '#7a7663', border: 'none' } }, 'Logout'),
      ),

      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 } },
        h('div', { style: { background: 'white', borderRadius: 16, padding: '16px', border: '1px solid #ece8dc', borderLeft: '4px solid #0f6b4b' } },
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#0f6b4b', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Total Paid / ادا شدہ'),
          h('div', { style: { fontSize: 20, fontWeight: 800, color: '#0f6b4b', fontFamily: 'monospace', marginTop: 4 } }, fmtPKR(totalPaid)),
        ),
        h('div', { style: { background: 'white', borderRadius: 16, padding: '16px', border: '1px solid #ece8dc', borderLeft: '4px solid #b91c1c' } },
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Remaining / باقی'),
          h('div', { style: { fontSize: 20, fontWeight: 800, color: '#b91c1c', fontFamily: 'monospace', marginTop: 4 } }, fmtPKR(totalRemaining)),
        ),
      ),

      nextDue ? h('div', { style: { background: nextDue.dueDate < today ? '#fef2f2' : '#eff6ff', borderRadius: 16, padding: '16px', marginBottom: 14, border: '1px solid ' + (nextDue.dueDate < today ? '#f5cac2' : '#bfdbfe'), display: 'flex', alignItems: 'center', gap: 12 } },
        h('div', { style: { width: 40, height: 40, borderRadius: 10, background: nextDue.dueDate < today ? '#b91c1c' : '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 } }, nextDue.dueDate < today ? '!' : '📅'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: nextDue.dueDate < today ? '#b91c1c' : '#3b82f6' } }, nextDue.dueDate < today ? 'OVERDUE / بقایا' : 'Next Due / اگلی قسط'),
          h('div', { style: { fontSize: 16, fontWeight: 800, color: '#1a2b1f', marginTop: 2 } }, fmtPKR(nextDue.amount)),
          h('div', { style: { fontSize: 12, color: '#7a7663', marginTop: 1 } }, fmtDate(nextDue.dueDate)),
        ),
      ) : null,

      overdueAmount > 0 ? h('div', { style: { background: '#fef2f2', borderRadius: 14, padding: '12px 16px', marginBottom: 14, textAlign: 'center', border: '1px solid #f5cac2' } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' } }, '⚠ Total Overdue / کل بقایا'),
        h('div', { style: { fontSize: 22, fontWeight: 800, color: '#b91c1c', fontFamily: 'monospace', marginTop: 2 } }, fmtPKR(overdueAmount)),
        h('div', { style: { fontSize: 12, color: '#7a7663', marginTop: 4 } }, 'براہ کرم جلد ادائیگی کریں / Please pay as soon as possible'),
      ) : null,

      h('div', { style: { fontSize: 14, fontWeight: 700, color: '#1a2b1f', marginBottom: 8, marginTop: 6 } },
        'Active Plans / فعال پلانز',
        h('span', { style: { fontSize: 11, color: '#7a7663', fontWeight: 500, marginLeft: 6 } }, '(' + activePlans.length + ')'),
      ),

      activePlans.length === 0
        ? h('div', { style: { textAlign: 'center', padding: '20px', color: '#7a7663', fontSize: 13, background: 'white', borderRadius: 14, border: '1px solid #ece8dc' } }, '✓ No active plans / کوئی فعال پلان نہیں')
        : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          activePlans.map(p => this.renderPlanCard(p, today, expandedPlan)),
        ),

      completedPlans.length > 0 ? h('div', { style: { marginTop: 20 } },
        h('div', { style: { fontSize: 14, fontWeight: 700, color: '#1a2b1f', marginBottom: 8 } },
          'Completed / مکمل',
          h('span', { style: { fontSize: 11, color: '#7a7663', fontWeight: 500, marginLeft: 6 } }, '(' + completedPlans.length + ')'),
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          completedPlans.map(p => this.renderPlanCard(p, today, expandedPlan)),
        ),
      ) : null,

      h('div', { style: { textAlign: 'center', marginTop: 24, padding: '16px', fontSize: 12, color: '#7a7663' } },
        h('div', {}, shopName),
        settings.shopPhone ? h('div', { style: { marginTop: 4 } }, '📞 ' + settings.shopPhone) : null,
        h('div', { style: { marginTop: 8, fontSize: 11 } }, 'Powered by Aqsat'),
      ),
    );
  }

  renderPlanCard(plan, today, expandedPlan) {
    const h = React.createElement;
    const product = this.getPlanProduct(plan);
    const schedule = plan.schedule || [];
    const paid = schedule.filter(s => s.paid);
    const unpaid = schedule.filter(s => !s.paid);
    const overdue = unpaid.filter(s => s.dueDate < today);
    const totalAmt = schedule.reduce((s, si) => s + si.amount, 0);
    const paidAmt = paid.reduce((s, si) => s + (si.amountPaid || si.amount), 0);
    const remainAmt = totalAmt - paidAmt;
    const progress = totalAmt > 0 ? (paidAmt / totalAmt) * 100 : 0;
    const isExpanded = expandedPlan === plan.id;
    const isComplete = unpaid.length === 0;
    const nextDue = unpaid.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

    return h('div', { key: plan.id, style: { background: 'white', borderRadius: 16, border: '1px solid #ece8dc', overflow: 'hidden' } },
      h('div', { onClick: () => this.setState({ expandedPlan: isExpanded ? null : plan.id }), style: { padding: '14px 16px', cursor: 'pointer' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
          h('div', { style: { fontSize: 20 } }, product.emoji || '📦'),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontWeight: 700, fontSize: 14, color: '#1a2b1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, product.name || 'Product'),
            h('div', { style: { fontSize: 11, color: '#7a7663', marginTop: 1 } }, plan.voucherNo || ''),
          ),
          isComplete
            ? h('div', { style: { padding: '4px 10px', borderRadius: 8, background: '#eaf5ee', color: '#0f6b4b', fontSize: 11, fontWeight: 700 } }, '✓ Complete')
            : overdue.length > 0
              ? h('div', { style: { padding: '4px 10px', borderRadius: 8, background: '#fdecea', color: '#b91c1c', fontSize: 11, fontWeight: 700 } }, overdue.length + ' overdue')
              : h('div', { style: { padding: '4px 10px', borderRadius: 8, background: '#eff6ff', color: '#3b82f6', fontSize: 11, fontWeight: 700 } }, paid.length + '/' + schedule.length + ' paid'),
        ),
        h('div', { style: { background: '#f4f1e6', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 8 } },
          h('div', { style: { height: '100%', borderRadius: 6, width: progress + '%', background: isComplete ? '#0f6b4b' : overdue.length > 0 ? '#b91c1c' : '#3b82f6', transition: 'width .3s' } }),
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
          h('span', { style: { color: '#0f6b4b', fontWeight: 600 } }, 'Paid: ' + fmtPKR(paidAmt)),
          h('span', { style: { color: '#b91c1c', fontWeight: 600 } }, 'Left: ' + fmtPKR(remainAmt)),
        ),
        !isComplete && nextDue ? h('div', { style: { fontSize: 11, color: nextDue.dueDate < today ? '#b91c1c' : '#7a7663', marginTop: 6, fontWeight: 600 } },
          (nextDue.dueDate < today ? '⚠ Overdue: ' : 'Next: ') + fmtPKR(nextDue.amount) + ' on ' + fmtDate(nextDue.dueDate),
        ) : null,
        h('div', { style: { textAlign: 'center', marginTop: 6, fontSize: 11, color: '#7a7663' } }, isExpanded ? '▲ Hide details' : '▼ View all installments'),
      ),

      isExpanded ? h('div', { style: { borderTop: '1px solid #ece8dc', padding: '12px 16px', background: '#fdfcf8' } },
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12, fontSize: 11 } },
          h('div', {}, h('div', { style: { color: '#7a7663', fontWeight: 600 } }, 'Total'), h('div', { style: { fontWeight: 700, fontFamily: 'monospace' } }, fmtPKR(plan.total || totalAmt))),
          h('div', {}, h('div', { style: { color: '#7a7663', fontWeight: 600 } }, 'Down Payment'), h('div', { style: { fontWeight: 700, fontFamily: 'monospace' } }, fmtPKR(plan.down || 0))),
          h('div', {}, h('div', { style: { color: '#7a7663', fontWeight: 600 } }, 'Start Date'), h('div', { style: { fontWeight: 700 } }, fmtDate(plan.startDate))),
        ),
        h('div', { style: { fontSize: 12, fontWeight: 700, color: '#1a2b1f', marginBottom: 8 } }, 'Installments / اقساط'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          schedule.map((s, i) => {
            const isOverdue = !s.paid && s.dueDate < today;
            const isPaid = s.paid;
            return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: isPaid ? '#eaf5ee' : isOverdue ? '#fef2f2' : '#fff', border: '1px solid ' + (isPaid ? '#bbf7d0' : isOverdue ? '#f5cac2' : '#ece8dc') } },
              h('div', { style: { width: 24, height: 24, borderRadius: 6, background: isPaid ? '#0f6b4b' : isOverdue ? '#b91c1c' : '#e5e2d6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 } }, isPaid ? '✓' : (i + 1)),
              h('div', { style: { flex: 1, fontSize: 12 } },
                h('span', { style: { fontWeight: 600 } }, fmtDate(s.dueDate)),
                isPaid && s.paidDate ? h('span', { style: { color: '#0f6b4b', marginLeft: 6, fontSize: 10 } }, '(paid ' + fmtDate(s.paidDate) + ')') : null,
                isOverdue ? h('span', { style: { color: '#b91c1c', marginLeft: 6, fontSize: 10, fontWeight: 700 } }, 'OVERDUE') : null,
              ),
              h('div', { style: { fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: isPaid ? '#0f6b4b' : isOverdue ? '#b91c1c' : '#1a2b1f' } }, fmtPKR(isPaid ? (s.amountPaid || s.amount) : s.amount)),
            );
          }),
        ),
      ) : null,
    );
  }
}
