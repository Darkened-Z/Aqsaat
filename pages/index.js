import React from 'react';
import Head from 'next/head';

export default class App extends React.Component {
  state = {
    route: 'dashboard',
    routeParams: {},
    paymentModalOpen: false,
    paymentContext: null,
    receiptOpen: false,
    receiptData: null,
    customers: null,
    products: null,
    plans: null,
    newPlan: { customerId: '', productId: '', totalPrice: '', downPayment: '', months: 6, interest: 12, startDate: '2026-07-25', graceDays: 3, lateFeeFlat: 200, lateFeePerDay: 50 },
    paymentAmount: '',
    addCustomerOpen: false,
    newCustomer: {
      name: '', nameUr: '', phone: '', altPhone: '', cnic: '', dob: '',
      fatherName: '', occupation: '', monthlyIncome: '',
      address: '', city: 'Lahore', area: '',
      guarantorName: '', guarantorPhone: '', guarantorCnic: '', guarantorRelation: '',
      notes: '', documents: [],
    },
    addCustomerStep: 1,
    planFilter: 'all',
    editingProduct: null,
    addProductOpen: false,
    newProduct: { name: '', nameUr: '', category: 'Mobile', price: '', stock: '', emoji: '📦' },
    settings: { graceDays: 3, lateFeeFlat: 200, lateFeePerDay: 50, maxLateFee: 5000 },
    searchQuery: '',
    darkMode: false,
    pinLocked: false,
    enteredPin: '',
    savedPin: '',
    paymentMethod: 'cash',
  };

  componentDidMount() {
    if (typeof window === 'undefined') return;
    // Wipe old demo seed data (demo customers had single-digit IDs like c1…c8)
    try {
      const old = localStorage.getItem('aqsat_data');
      if (old) {
        const d = JSON.parse(old);
        if (d.customers && d.customers.some(c => /^c\d$/.test(c.id))) {
          localStorage.removeItem('aqsat_data');
        }
      }
    } catch(e) {}
    const dm = localStorage.getItem('aqsat_dark') === '1';
    const pin = localStorage.getItem('aqsat_pin') || '';
    const raw = localStorage.getItem('aqsat_data');
    if (raw) {
      try {
        const d = JSON.parse(raw);
        this.setState({ customers: d.customers, products: d.products, plans: d.plans, settings: d.settings || this.state.settings, darkMode: dm, savedPin: pin, pinLocked: !!pin });
        return;
      } catch(e) {}
    }
    this.setState({ darkMode: dm, savedPin: pin, pinLocked: !!pin });
    this.seed();
  }

  componentDidUpdate(_, prev) {
    if (typeof window === 'undefined') return;
    const { customers, products, plans, settings } = this.state;
    if (!customers) return;
    if (customers !== prev.customers || products !== prev.products || plans !== prev.plans || settings !== prev.settings) {
      localStorage.setItem('aqsat_data', JSON.stringify({ customers, products, plans, settings }));
    }
  }

  seed() {
    this.setState({ customers: [], products: [], plans: [] });
  }

  resetAllData = () => {
    if (!confirm('This will permanently delete ALL customers, products, and plans. Are you sure?')) return;
    localStorage.removeItem('aqsat_data');
    this.setState({ customers: [], products: [], plans: [], route: 'dashboard' });
  };

  computeLateFee(installment, plan) {
    if (installment.paid) return 0;
    const rules = plan.lateFee || this.state.settings;
    const daysLate = this.daysBetween(new Date(installment.dueDate), this.today()) - (rules.graceDays || 0);
    if (daysLate <= 0) return 0;
    const fee = (rules.lateFeeFlat || 0) + daysLate * (rules.lateFeePerDay || 0);
    return Math.min(fee, rules.maxLateFee || Infinity);
  }

  fmtPKR(n) {
    if (n == null || isNaN(n)) return 'Rs 0';
    return 'Rs ' + Math.round(n).toLocaleString('en-PK');
  }
  fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }
  today() { return new Date(); }

  planStats(pl) {
    const paid = pl.schedule.filter(s => s.paid);
    const paidAmount = paid.reduce((a, s) => a + s.amount, 0) + pl.down;
    const total = pl.schedule.reduce((a, s) => a + s.amount, 0) + pl.down;
    const remaining = total - paidAmount;
    const next = pl.schedule.find(s => !s.paid);
    const overdue = pl.schedule.filter(s => !s.paid && new Date(s.dueDate) < this.today());
    const lateFees = overdue.reduce((a, s) => a + this.computeLateFee(s, pl), 0);
    return { paid, paidAmount, total, remaining, next, overdue, lateFees, progress: total ? paidAmount / total : 0 };
  }

  customerStats(cId) {
    const cPlans = this.state.plans.filter(p => p.customerId === cId);
    let total = 0, paid = 0, overdue = 0;
    cPlans.forEach(pl => {
      const st = this.planStats(pl);
      total += st.total; paid += st.paidAmount;
      overdue += st.overdue.reduce((a, s) => a + s.amount, 0);
    });
    return { plans: cPlans, total, paid, remaining: total - paid, overdue };
  }

  go = (route, params = {}) => {
    this.setState({ route, routeParams: params });
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }

  openPayment = (planId, installmentN) => {
    const pl = this.state.plans.find(p => p.id === planId);
    if (!pl) return;
    const s = pl.schedule.find(x => x.n === installmentN) || pl.schedule.find(x => !x.paid);
    this.setState({ paymentModalOpen: true, paymentContext: { planId, installmentN: s ? s.n : null }, paymentAmount: s ? String(s.amount) : '' });
  }
  closePayment = () => this.setState({ paymentModalOpen: false, paymentContext: null });
  confirmPayment = () => {
    const ctx = this.state.paymentContext;
    const today = new Date().toISOString().slice(0, 10);
    const amountCollected = parseFloat(this.state.paymentAmount) || 0;
    const plans = this.state.plans.map(pl => {
      if (pl.id !== ctx.planId) return pl;
      const schedule = pl.schedule.map(s => s.n === ctx.installmentN
        ? { ...s, paid: true, paidDate: today, amountPaid: amountCollected || s.amount, lateFeeCharged: this.computeLateFee(s, pl) }
        : s);
      const allPaid = schedule.every(s => s.paid);
      return { ...pl, schedule, status: allPaid ? 'completed' : pl.status };
    });
    const pl = plans.find(p => p.id === ctx.planId);
    const customer = this.state.customers.find(c => c.id === pl.customerId);
    const product = this.state.products.find(p => p.id === pl.productId);
    const s = pl.schedule.find(x => x.n === ctx.installmentN);
    this.setState({ plans, paymentModalOpen: false, receiptOpen: true, receiptData: { receiptNo: 'RCP-' + Date.now().toString().slice(-6), customer, product, plan: pl, installment: s, date: today, amountCollected: amountCollected || s.amount } });
  }
  closeReceipt = () => this.setState({ receiptOpen: false, receiptData: null });

  createPlan = () => {
    const np = this.state.newPlan;
    if (!np.customerId) { alert('Please select a customer'); return; }
    if (!np.productId) { alert('Please select a product'); return; }
    const product = this.state.products.find(p => p.id === np.productId);
    const total = parseFloat(np.totalPrice) || product.price;
    const down = parseFloat(np.downPayment) || 0;
    const months = parseInt(np.months) || 6;
    const interest = parseFloat(np.interest) || 0;
    const financed = Math.max(0, total - down);
    const withInterest = financed * (1 + interest / 100);
    const monthly = Math.round(withInterest / months);
    const start = new Date(np.startDate || '2026-07-25');
    const schedule = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      schedule.push({ n: i + 1, dueDate: d.toISOString().slice(0, 10), amount: monthly, paid: false, paidDate: null });
    }
    const plan = { id: 'pl_' + Date.now().toString(36), customerId: np.customerId, productId: np.productId, total, down, months, interest, monthly, startDate: start.toISOString().slice(0, 10), status: 'active', schedule, lateFee: { graceDays: parseInt(np.graceDays) || 0, lateFeeFlat: parseFloat(np.lateFeeFlat) || 0, lateFeePerDay: parseFloat(np.lateFeePerDay) || 0, maxLateFee: this.state.settings.maxLateFee } };
    this.setState({ plans: [plan, ...this.state.plans], newPlan: { customerId: '', productId: '', totalPrice: '', downPayment: '', months: 6, interest: 12, startDate: '2026-07-25', graceDays: 3, lateFeeFlat: 200, lateFeePerDay: 50 } });
    this.go('customer', { id: np.customerId });
  };

  openAddCustomer = () => this.setState({ addCustomerOpen: true, addCustomerStep: 1 });
  closeAddCustomer = () => this.setState({ addCustomerOpen: false });
  setNc = (k, v) => this.setState({ newCustomer: { ...this.state.newCustomer, [k]: v } });
  addNcDoc = (kind, files) => {
    const fs = Array.from(files || []).map(f => ({ name: f.name, kind, size: f.size, type: f.type }));
    this.setState({ newCustomer: { ...this.state.newCustomer, documents: [...this.state.newCustomer.documents, ...fs] } });
  };
  removeNcDoc = (i) => {
    const docs = this.state.newCustomer.documents.filter((_, idx) => idx !== i);
    this.setState({ newCustomer: { ...this.state.newCustomer, documents: docs } });
  };
  saveNewCustomer = () => {
    const nc = this.state.newCustomer;
    if (!nc.name || !nc.phone) { alert('Please enter name and phone'); return; }
    const initials = nc.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'NC';
    const colors = ['#e7dcc4','#f5d4c0','#cfe4d3','#e0d4f0','#f3dfb8','#d4e6ec','#e7c9c3','#d1dfe7'];
    const c = { id: 'c' + (this.state.customers.length + 1) + '_' + Date.now().toString(36).slice(-4), name: nc.name, nameUr: nc.nameUr || nc.name, phone: nc.phone, altPhone: nc.altPhone, cnic: nc.cnic, dob: nc.dob, fatherName: nc.fatherName, occupation: nc.occupation, monthlyIncome: nc.monthlyIncome, address: nc.address, city: nc.city, area: nc.area || nc.city, guarantor: { name: nc.guarantorName, phone: nc.guarantorPhone, cnic: nc.guarantorCnic, relation: nc.guarantorRelation }, notes: nc.notes, documents: nc.documents, joined: '2026-07-19', avatar: initials, color: colors[this.state.customers.length % colors.length] };
    this.setState({ customers: [c, ...this.state.customers], addCustomerOpen: false, newCustomer: { name: '', nameUr: '', phone: '', altPhone: '', cnic: '', dob: '', fatherName: '', occupation: '', monthlyIncome: '', address: '', city: 'Lahore', area: '', guarantorName: '', guarantorPhone: '', guarantorCnic: '', guarantorRelation: '', notes: '', documents: [] }, addCustomerStep: 1 });
    this.go('customer', { id: c.id });
  };
  updateProduct = (id, patch) => this.setState({ products: this.state.products.map(p => p.id === id ? { ...p, ...patch } : p) });

  waLink = (phone, name, amount, dueDate) => {
    const num = '92' + phone.replace(/\D/g, '').replace(/^0/, '');
    const msg = `Assalam-o-Alaikum ${name}! Aapki qist ${this.fmtPKR(amount)} ki due date ${this.fmtDate(dueDate)} hai. Meherbani farma kar waqt par ada kar dain. Shukriya — Sadar Electronics`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  exportCSV = () => {
    const rows = [['Customer', 'Product', 'Total', 'Down', 'Monthly', 'Paid', 'Remaining', 'Status', 'Start Date']];
    this.state.plans.forEach(pl => {
      const c = this.state.customers.find(x => x.id === pl.customerId);
      const p = this.state.products.find(x => x.id === pl.productId);
      const st = this.planStats(pl);
      rows.push([c.name, p.name, pl.total, pl.down, pl.monthly, st.paidAmount, st.remaining, pl.status, pl.startDate]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'aqsat-plans.csv'; a.click();
  };

  toggleDark = () => {
    const dm = !this.state.darkMode;
    this.setState({ darkMode: dm });
    localStorage.setItem('aqsat_dark', dm ? '1' : '0');
  };

  setPin = (pin) => {
    if (pin) localStorage.setItem('aqsat_pin', pin);
    else localStorage.removeItem('aqsat_pin');
    this.setState({ savedPin: pin });
  };

  submitPin = () => {
    if (this.state.enteredPin === this.state.savedPin) {
      this.setState({ pinLocked: false, enteredPin: '' });
    } else {
      this.setState({ enteredPin: '' });
      alert('Wrong PIN');
    }
  };

  openAddProduct  = () => this.setState({ addProductOpen: true, newProduct: { name: '', nameUr: '', category: 'Mobile', price: '', stock: '', emoji: '📱' } });
  closeAddProduct = () => this.setState({ addProductOpen: false });
  saveNewProduct  = () => {
    const np = this.state.newProduct;
    if (!np.name || !np.price) { alert('Please enter product name and price'); return; }
    const p = { id: 'p_' + Date.now().toString(36), name: np.name, nameUr: np.nameUr || np.name, category: np.category, price: parseFloat(np.price) || 0, stock: parseInt(np.stock) || 0, emoji: np.emoji || '📦' };
    this.setState({ products: [p, ...this.state.products], addProductOpen: false });
  };

  // ─── helpers ───
  h = React.createElement;

  card(children, extra = {}) {
    return this.h('div', { style: { background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 12, padding: 16, ...extra } }, children);
  }

  sectionHeader(title, ur, action) {
    return this.h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
      this.h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8 } },
        this.h('div', { style: { fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' } }, title),
        ur ? this.h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, ur) : null,
      ),
      action,
    );
  }

  // ─── screens ───
  renderDashboard() {
    const h = this.h;
    const { plans, customers, products } = this.state;
    const today = this.today();
    let cashToday = 0, upcomingWeek = 0, overdueTotal = 0, overdueCount = 0;
    let dueTodayList = [], upcomingList = [], overdueList = [], recentPayments = [];
    const totalOutstanding = plans.reduce((a, pl) => a + this.planStats(pl).remaining, 0);

    plans.forEach(pl => {
      const c = customers.find(x => x.id === pl.customerId);
      const p = products.find(x => x.id === pl.productId);
      pl.schedule.forEach(s => {
        const due = new Date(s.dueDate);
        const diff = this.daysBetween(today, due);
        if (!s.paid && diff === 0) { cashToday += s.amount; dueTodayList.push({ pl, s, c, p, diff }); }
        if (!s.paid && diff > 0 && diff <= 7) { upcomingWeek += s.amount; upcomingList.push({ pl, s, c, p, diff }); }
        if (!s.paid && diff < 0) { overdueTotal += s.amount; overdueCount++; overdueList.push({ pl, s, c, p, diff }); }
        if (s.paid && s.paidDate) {
          const pDiff = this.daysBetween(new Date(s.paidDate), today);
          if (pDiff >= 0 && pDiff <= 14) recentPayments.push({ pl, s, c, p, pDiff });
        }
      });
    });
    overdueList.sort((a, b) => a.diff - b.diff);
    upcomingList.sort((a, b) => a.diff - b.diff);
    recentPayments.sort((a, b) => a.pDiff - b.pDiff);

    const kpiCard = (label, ur, value, sub, tone) => {
      const tones = { green: { bg: 'linear-gradient(140deg,#eaf5ee,#d3e9dd)', ac: '#0f6b4b' }, amber: { bg: 'linear-gradient(140deg,#fdf2d9,#f6e2af)', ac: '#a26a10' }, red: { bg: 'linear-gradient(140deg,#fbe5e2,#f5cac2)', ac: '#a4362b' }, neutral: { bg: '#ffffff', ac: '#3a4a3f' } }[tone];
      return h('div', { style: { background: tones.bg, border: '1px solid #ece8dc', borderRadius: 12, padding: '12px 14px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 } },
          h('div', { style: { fontSize: 10, fontWeight: 700, color: tones.ac, textTransform: 'uppercase', letterSpacing: '0.05em' } }, label),
          h('div', { className: 'ur', style: { fontSize: 11, color: tones.ac, opacity: 0.75 } }, ur),
        ),
        h('div', { className: 'mono', style: { fontSize: 22, fontWeight: 700, marginTop: 6, color: '#1a2b1f', letterSpacing: '-0.02em' } }, value),
        sub ? h('div', { style: { fontSize: 11, color: '#5a6a5f', marginTop: 2 } }, sub) : null,
      );
    };

    const rowStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #f2eee2' };

    return h('div', { className: 'screen' },
      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, flexWrap: 'wrap' } },
        h('div', { style: { fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' } }, 'Sunday, 19 July 2026'),
        h('div', { style: { fontSize: 12, color: '#7a7663' } }, '· Assalam-o-Alaikum, Rehan'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 16 } },
        kpiCard('Cash Today',    'آج کی وصولی', this.fmtPKR(cashToday),       dueTodayList.length + ' installments due', 'green'),
        kpiCard('Upcoming (7d)', 'اگلے ۷ دن',   this.fmtPKR(upcomingWeek),    upcomingList.length + ' installments', 'amber'),
        kpiCard('Overdue',       'بقایا',        this.fmtPKR(overdueTotal),    overdueCount + ' late · +' + this.fmtPKR(plans.reduce((a, p) => a + this.planStats(p).lateFees, 0)) + ' fees', 'red'),
        kpiCard('Outstanding',   'باقی رقم',     this.fmtPKR(totalOutstanding), plans.filter(p => p.status === 'active').length + ' active plans', 'neutral'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12 } },
        this.card([
          this.sectionHeader('Due Today', 'آج کی اقساط', h('button', { onClick: () => this.go('plans'), style: { color: '#0f6b4b', fontWeight: 600, fontSize: 12 } }, 'View all →')),
          dueTodayList.length === 0
            ? h('div', { style: { padding: '14px 0', color: '#7a7663', fontSize: 13 } }, '🎉 No collections due today.')
            : dueTodayList.slice(0, 6).map((row, i) =>
              h('div', { key: i, style: { ...rowStyle, borderTopColor: i === 0 ? 'transparent' : '#f2eee2' } },
                h('div', { style: { width: 32, height: 32, borderRadius: 8, background: row.c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#3a2f1a', flexShrink: 0 } }, row.c.avatar),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, row.c.name),
                  h('div', { style: { fontSize: 11, color: '#7a7663', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, row.p.name + ' · #' + row.s.n + '/' + row.pl.months),
                ),
                h('div', { style: { textAlign: 'right', flexShrink: 0 } },
                  h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13 } }, this.fmtPKR(row.s.amount)),
                  h('button', { onClick: () => this.openPayment(row.pl.id, row.s.n), style: { marginTop: 2, background: '#0f6b4b', color: 'white', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600 } }, 'Collect →'),
                ),
              )),
        ]),
        this.card([
          this.sectionHeader('Overdue', 'بقایا اقساط', h('button', { onClick: () => this.go('reminders'), style: { color: '#a4362b', fontWeight: 600, fontSize: 12 } }, 'Remind →')),
          overdueList.length === 0
            ? h('div', { style: { padding: '14px 0', color: '#7a7663', fontSize: 13 } }, '✨ All caught up.')
            : overdueList.slice(0, 6).map((row, i) =>
              h('div', { key: i, style: { ...rowStyle, borderTopColor: i === 0 ? 'transparent' : '#f2eee2' } },
                h('div', { style: { width: 32, height: 32, borderRadius: 8, background: row.c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#3a2f1a', flexShrink: 0 } }, row.c.avatar),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, row.c.name),
                  h('div', { style: { fontSize: 11, color: '#a4362b', fontWeight: 500 } }, Math.abs(row.diff) + ' days late'),
                ),
                h('div', { style: { textAlign: 'right', flexShrink: 0 } },
                  h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13, color: '#a4362b' } }, this.fmtPKR(row.s.amount)),
                  h('button', { onClick: () => this.openPayment(row.pl.id, row.s.n), style: { marginTop: 2, background: '#fdecea', color: '#a4362b', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600 } }, 'Follow up →'),
                ),
              )),
        ]),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12, marginTop: 12 } },
        this.card([
          this.sectionHeader('Upcoming this week', 'اس ہفتے', null),
          upcomingList.length === 0
            ? h('div', { style: { padding: '14px 0', color: '#7a7663', fontSize: 13 } }, 'Nothing upcoming.')
            : upcomingList.slice(0, 6).map((row, i) =>
              h('div', { key: i, style: rowStyle },
                h('div', { style: { width: 36, height: 36, borderRadius: 8, background: '#fdf2d9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a26a10', lineHeight: 1 } }, new Date(row.s.dueDate).getDate()),
                  h('div', { style: { fontSize: 8, color: '#a26a10', textTransform: 'uppercase', fontWeight: 700 } }, new Date(row.s.dueDate).toLocaleDateString('en', { month: 'short' })),
                ),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, row.c.name),
                  h('div', { style: { fontSize: 11, color: '#7a7663' } }, 'in ' + row.diff + 'd · ' + row.p.name),
                ),
                h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13, flexShrink: 0 } }, this.fmtPKR(row.s.amount)),
              )),
        ]),
        this.card([
          this.sectionHeader('Recent payments', 'حالیہ ادائیگیاں', null),
          recentPayments.length === 0
            ? h('div', { style: { padding: '14px 0', color: '#7a7663', fontSize: 13 } }, 'No recent payments.')
            : recentPayments.slice(0, 6).map((row, i) =>
              h('div', { key: i, style: rowStyle },
                h('div', { style: { width: 28, height: 28, borderRadius: '50%', background: '#eaf5ee', color: '#0f6b4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 } }, '✓'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, row.c.name),
                  h('div', { style: { fontSize: 11, color: '#7a7663' } }, row.pDiff === 0 ? 'Today' : row.pDiff + 'd ago · ' + row.p.name),
                ),
                h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13, color: '#0f6b4b', flexShrink: 0 } }, '+ ' + this.fmtPKR(row.s.amount)),
              )),
        ]),
      ),
    );
  }

  renderCustomers() {
    const h = this.h;
    const q = this.state.searchQuery.toLowerCase();
    const rows = this.state.customers
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.nameUr.includes(q) || c.phone.includes(q) || (c.area || '').toLowerCase().includes(q))
      .map(c => ({ c, st: this.customerStats(c.id) }));
    return h('div', { className: 'screen' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 } },
        h('div', {}, h('div', { style: { fontSize: 14, color: '#7a7663' } }, this.state.customers.length + ' customers')),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('button', { onClick: () => this.go('newplan'), style: { background: '#f4f1e6', color: '#3a4a3f', padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13 } }, '＋ New Plan'),
          h('button', { onClick: this.openAddCustomer, style: { background: '#0f6b4b', color: 'white', padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13 } }, '＋ Add Customer'),
        ),
      ),
      this.card([
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 } },
          rows.map(({ c, st }) =>
            h('button', { key: c.id, onClick: () => this.go('customer', { id: c.id }), style: { textAlign: 'left', background: '#fdfcf8', border: '1px solid #ece8dc', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' } },
              h('div', { style: { display: 'flex', gap: 12, alignItems: 'center' } },
                h('div', { style: { width: 44, height: 44, borderRadius: 12, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#3a2f1a' } }, c.avatar),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 700, fontSize: 15 } }, c.name),
                  h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663', marginTop: -2 } }, c.nameUr),
                ),
                st.overdue > 0 ? h('div', { style: { background: '#fdecea', color: '#a4362b', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 } }, 'OVERDUE') : null,
              ),
              h('div', { style: { fontSize: 12, color: '#7a7663' } }, '📞 ' + c.phone),
              h('div', { style: { fontSize: 12, color: '#7a7663' } }, '📍 ' + c.area),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #ece8dc' } },
                h('div', {},
                  h('div', { style: { fontSize: 10, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 } }, 'Outstanding'),
                  h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 15, color: st.overdue > 0 ? '#a4362b' : '#1a2b1f' } }, this.fmtPKR(st.remaining)),
                ),
                h('div', { style: { fontSize: 11, color: '#7a7663' } }, st.plans.length + ' plan' + (st.plans.length === 1 ? '' : 's')),
              ),
            )),
        ),
      ]),
    );
  }

  renderCustomerDetail() {
    const h = this.h;
    const id = this.state.routeParams.id;
    const c = this.state.customers.find(x => x.id === id);
    if (!c) return h('div', {}, 'Customer not found.');
    const st = this.customerStats(id);
    const nextInst = st.plans.flatMap(pl => pl.schedule.filter(s => !s.paid)).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
    return h('div', { className: 'screen' },
      h('button', { onClick: () => this.go('customers'), style: { fontSize: 13, color: '#7a7663', marginBottom: 16, fontWeight: 500 } }, '← Back to customers'),
      this.card([
        h('div', { style: { display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' } },
          h('div', { style: { width: 72, height: 72, borderRadius: 20, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26, color: '#3a2f1a' } }, c.avatar),
          h('div', { style: { flex: 1, minWidth: 200 } },
            h('div', { style: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em' } }, c.name),
            h('div', { className: 'ur', style: { fontSize: 16, color: '#7a7663' } }, c.nameUr),
            h('div', { style: { display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', fontSize: 13, color: '#5a6a5f' } },
              h('span', {}, '📞 ' + c.phone),
              h('span', {}, '🆔 ' + c.cnic),
              h('span', {}, '📍 ' + c.area),
              h('span', {}, '📅 Joined ' + this.fmtDate(c.joined)),
            ),
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            nextInst ? h('a', { href: this.waLink(c.phone, c.name, nextInst.amount, nextInst.dueDate), target: '_blank', rel: 'noopener', style: { background: '#f4f1e6', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' } }, '💬 WhatsApp') : null,
            h('button', { onClick: () => this.go('newplan'), style: { background: '#0f6b4b', color: 'white', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 } }, '＋ New Plan'),
          ),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginTop: 24 } },
          [['Total sold', this.fmtPKR(st.total), '#1a2b1f'], ['Received', this.fmtPKR(st.paid), '#0f6b4b'], ['Outstanding', this.fmtPKR(st.remaining), st.overdue > 0 ? '#a4362b' : '#1a2b1f'], ['Overdue', this.fmtPKR(st.overdue), '#a4362b']].map(([lbl, val, col], i) =>
            h('div', { key: i, style: { background: '#fdfcf8', border: '1px solid #ece8dc', borderRadius: 12, padding: 14 } },
              h('div', { style: { fontSize: 11, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 } }, lbl),
              h('div', { className: 'mono', style: { fontSize: 18, fontWeight: 700, color: col, marginTop: 4 } }, val),
            )),
        ),
      ]),
      h('div', { style: { marginTop: 24 } },
        this.sectionHeader('Installment Plans', 'اقساط پلانز'),
        st.plans.length === 0
          ? this.card(h('div', { style: { padding: 20, color: '#7a7663', textAlign: 'center' } }, 'No plans yet.'))
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, st.plans.map(pl => this.renderPlanCard(pl))),
      ),
    );
  }

  renderPlanCard(pl) {
    const h = this.h;
    const p = this.state.products.find(x => x.id === pl.productId);
    const c = this.state.customers.find(x => x.id === pl.customerId);
    const st = this.planStats(pl);
    const isOverdue = st.overdue.length > 0;
    return h('div', { key: pl.id, style: { background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 16, padding: 20 } },
      h('div', { style: { display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' } },
        h('div', { style: { width: 56, height: 56, borderRadius: 14, background: '#f4f1e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 } }, p.emoji),
        h('div', { style: { flex: 1, minWidth: 180 } },
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
            h('div', { style: { fontSize: 16, fontWeight: 700 } }, p.name),
            pl.status === 'completed'
              ? h('span', { style: { fontSize: 10, fontWeight: 700, color: '#0f6b4b', background: '#eaf5ee', padding: '3px 8px', borderRadius: 20 } }, '✓ COMPLETED')
              : isOverdue
                ? h('span', { style: { fontSize: 10, fontWeight: 700, color: '#a4362b', background: '#fdecea', padding: '3px 8px', borderRadius: 20 } }, 'OVERDUE')
                : h('span', { style: { fontSize: 10, fontWeight: 700, color: '#a26a10', background: '#fdf2d9', padding: '3px 8px', borderRadius: 20 } }, 'ACTIVE'),
          ),
          h('div', { style: { fontSize: 12, color: '#7a7663', marginTop: 2 } }, c.name + ' · Started ' + this.fmtDate(pl.startDate) + ' · ' + pl.months + ' months @ ' + pl.interest + '% markup'),
        ),
        h('div', { style: { textAlign: 'right' } },
          h('div', { style: { fontSize: 11, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 } }, 'Remaining'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 700, color: isOverdue ? '#a4362b' : '#1a2b1f' } }, this.fmtPKR(st.remaining)),
          st.lateFees > 0 ? h('div', { style: { marginTop: 4, fontSize: 11, color: '#a4362b', fontWeight: 600 } }, '+ ', h('span', { className: 'mono' }, this.fmtPKR(st.lateFees)), ' late fees') : null,
        ),
      ),
      h('div', { style: { marginTop: 16 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#5a6a5f' } },
          h('span', {}, this.fmtPKR(st.paidAmount) + ' paid of ' + this.fmtPKR(st.total)),
          h('span', { style: { fontWeight: 700, color: '#0f6b4b' } }, Math.round(st.progress * 100) + '%'),
        ),
        h('div', { style: { height: 8, background: '#f2eee2', borderRadius: 4, overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: (st.progress * 100) + '%', background: 'linear-gradient(90deg,#0f6b4b,#14a374)', borderRadius: 4, transition: 'width .4s' } }),
        ),
      ),
      h('div', { style: { marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(76px,1fr))', gap: 6 } },
        pl.schedule.map(s => {
          const due = new Date(s.dueDate);
          const isOverdueS = !s.paid && due < this.today();
          const isNext = st.next && st.next.n === s.n;
          const bg = s.paid ? '#eaf5ee' : isOverdueS ? '#fdecea' : isNext ? '#fdf2d9' : '#fdfcf8';
          const col = s.paid ? '#0f6b4b' : isOverdueS ? '#a4362b' : isNext ? '#a26a10' : '#7a7663';
          return h('button', { key: s.n, onClick: () => !s.paid && this.openPayment(pl.id, s.n), style: { background: bg, border: '1px solid ' + (isNext ? '#f0c977' : '#ece8dc'), borderRadius: 10, padding: '8px 6px', textAlign: 'center', cursor: s.paid ? 'default' : 'pointer' } },
            h('div', { style: { fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase' } }, s.paid ? '✓ Paid' : isOverdueS ? 'Late' : '#' + s.n),
            h('div', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: '#1a2b1f', marginTop: 2 } }, Math.round(s.amount / 1000) + 'k'),
            h('div', { style: { fontSize: 9, color: col, marginTop: 1 } }, due.toLocaleDateString('en', { day: '2-digit', month: 'short' })),
          );
        }),
      ),
      pl.status !== 'completed' && st.next
        ? h('div', { style: { marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
          h('div', { style: { fontSize: 13, color: '#5a6a5f' } }, 'Next: ' + this.fmtDate(st.next.dueDate) + ' · ', h('span', { className: 'mono', style: { fontWeight: 700 } }, this.fmtPKR(st.next.amount))),
          h('button', { onClick: () => this.openPayment(pl.id, st.next.n), style: { background: '#0f6b4b', color: 'white', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 } }, 'Record Payment →'),
        )
        : null,
    );
  }

  renderProducts() {
    const h = this.h;
    const editing = this.state.editingProduct;
    return h('div', { className: 'screen' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 } },
        h('div', { style: { fontSize: 13, color: '#7a7663' } }, this.state.products.length + ' products · click a price to edit'),
        h('button', { onClick: this.openAddProduct, style: { background: '#0f6b4b', color: 'white', padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13 } }, '＋ Add Product'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 } },
        this.state.products.map(p => {
          const sold = this.state.plans.filter(pl => pl.productId === p.id).length;
          const isEditing = editing === p.id;
          return h('div', { key: p.id, style: { background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 12, padding: 16 } },
            h('div', { style: { fontSize: 34, marginBottom: 8 } }, p.emoji),
            h('div', { style: { fontSize: 10, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 } }, p.category),
            h('div', { style: { fontSize: 15, fontWeight: 700, marginTop: 2 } }, p.name),
            h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, p.nameUr),
            isEditing
              ? h('div', { style: { marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' } },
                h('span', { className: 'mono', style: { fontSize: 14, fontWeight: 600, color: '#0f6b4b' } }, 'Rs'),
                h('input', { type: 'number', autoFocus: true, defaultValue: p.price,
                  onKeyDown: e => { if (e.key === 'Enter') { this.updateProduct(p.id, { price: parseFloat(e.target.value) || 0 }); this.setState({ editingProduct: null }); } },
                  onBlur: e => { this.updateProduct(p.id, { price: parseFloat(e.target.value) || 0 }); this.setState({ editingProduct: null }); },
                  className: 'mono', style: { flex: 1, minWidth: 0, border: '1px solid #0f6b4b', borderRadius: 8, padding: '6px 8px', fontSize: 16, fontWeight: 700, background: '#fdfcf8', outline: 'none' } }),
              )
              : h('button', { onClick: () => this.setState({ editingProduct: p.id }), style: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', margin: '10px 0 0 -8px', borderRadius: 8, cursor: 'pointer' } },
                h('span', { className: 'mono', style: { fontSize: 18, fontWeight: 700, color: '#0f6b4b' } }, this.fmtPKR(p.price)),
                h('span', { style: { fontSize: 11, color: '#7a7663' } }, '✎'),
              ),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f2eee2', fontSize: 11 } },
              h('span', { style: { color: '#7a7663' } }, 'Stock: ',
                h('input', { type: 'number', value: p.stock, onChange: e => this.updateProduct(p.id, { stock: parseInt(e.target.value) || 0 }), className: 'mono', style: { width: 40, border: '1px solid transparent', borderRadius: 4, padding: '1px 4px', fontSize: 12, fontWeight: 700, background: 'transparent', color: p.stock < 5 ? '#a4362b' : '#1a2b1f', outline: 'none' } })),
              h('span', { style: { color: '#7a7663' } }, sold + ' sold'),
            ),
          );
        }),
      ),
    );
  }

  renderPlans() {
    const h = this.h;
    const filter = this.state.planFilter || 'all';
    let plans = this.state.plans;
    if (filter === 'active') plans = plans.filter(p => p.status === 'active');
    if (filter === 'completed') plans = plans.filter(p => p.status === 'completed');
    if (filter === 'overdue') plans = plans.filter(p => this.planStats(p).overdue.length > 0);
    const filters = [['all', 'All', this.state.plans.length], ['active', 'Active', this.state.plans.filter(p => p.status === 'active').length], ['overdue', 'Overdue', this.state.plans.filter(p => this.planStats(p).overdue.length > 0).length], ['completed', 'Completed', this.state.plans.filter(p => p.status === 'completed').length]];
    return h('div', { className: 'screen' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 } },
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          filters.map(([k, l, n]) => h('button', { key: k, onClick: () => this.setState({ planFilter: k }), style: { padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: filter === k ? '#1a2b1f' : '#ffffff', color: filter === k ? '#ffffff' : '#3a4a3f', border: '1px solid ' + (filter === k ? '#1a2b1f' : '#ece8dc') } }, l + ' · ' + n)),
        ),
        h('button', { onClick: () => this.go('newplan'), style: { background: '#0f6b4b', color: 'white', padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13 } }, '＋ New Plan'),
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, plans.map(pl => this.renderPlanCard(pl))),
    );
  }

  renderNewPlan() {
    const h = this.h;
    const np = this.state.newPlan;
    const set = (k, v) => this.setState({ newPlan: { ...np, [k]: v } });
    const product = this.state.products.find(p => p.id === np.productId);
    const total = parseFloat(np.totalPrice) || (product ? product.price : 0);
    const down = parseFloat(np.downPayment) || 0;
    const financed = Math.max(0, total - down);
    const withInterest = financed * (1 + (parseFloat(np.interest) || 0) / 100);
    const monthly = np.months > 0 ? Math.round(withInterest / np.months) : 0;
    const inpStyle = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    const field = (label, ur, node) => h('div', {},
      h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, label, ' ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, ur)),
      node,
    );
    return h('div', { className: 'screen', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 } },
      this.card([
        h('div', { style: { fontSize: 18, fontWeight: 700, marginBottom: 4 } }, 'Create Installment Plan'),
        h('div', { style: { fontSize: 13, color: '#7a7663', marginBottom: 20 } }, 'Enter the deal terms. Preview updates live on the right.'),
        h('div', { style: { display: 'grid', gap: 16 } },
          field('Customer', 'گاہک', h('select', { value: np.customerId, onChange: e => set('customerId', e.target.value), style: inpStyle }, h('option', { value: '' }, 'Select customer…'), this.state.customers.map(c => h('option', { key: c.id, value: c.id }, c.name + ' · ' + c.phone)))),
          field('Product', 'مصنوعات', h('select', { value: np.productId, onChange: e => { const p = this.state.products.find(x => x.id === e.target.value); this.setState({ newPlan: { ...np, productId: e.target.value, totalPrice: p ? String(p.price) : '' } }); }, style: inpStyle }, h('option', { value: '' }, 'Select product…'), this.state.products.map(p => h('option', { key: p.id, value: p.id }, p.name + ' — ' + this.fmtPKR(p.price))))),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            field('Sale Price (Rs)', 'فروخت قیمت', h('input', { type: 'number', value: np.totalPrice, onChange: e => set('totalPrice', e.target.value), placeholder: 'e.g. 165000', style: inpStyle })),
            field('Down Payment (Rs)', 'ایڈوانس', h('input', { type: 'number', value: np.downPayment, onChange: e => set('downPayment', e.target.value), placeholder: '0', style: inpStyle })),
          ),
          field('Interest / Markup %', 'منافع', h('input', { type: 'number', value: np.interest, onChange: e => set('interest', e.target.value), style: inpStyle })),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            field('Number of Months', 'اقساط', h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } }, [3,6,9,12,18,24].map(m => h('button', { key: m, onClick: () => set('months', m), style: { padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: np.months === m ? '#0f6b4b' : '#fdfcf8', color: np.months === m ? 'white' : '#3a4a3f', border: '1px solid ' + (np.months === m ? '#0f6b4b' : '#ece8dc') } }, m + 'm')))),
            field('Start Date', 'آغاز', h('input', { type: 'date', value: np.startDate, onChange: e => set('startDate', e.target.value), style: inpStyle })),
          ),
        ),
      ]),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', { style: { background: 'linear-gradient(160deg,#0f6b4b,#14a374)', color: 'white', borderRadius: 16, padding: 20 } },
          h('div', { style: { fontSize: 12, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 } }, 'Monthly Installment'),
          h('div', { className: 'ur', style: { fontSize: 13, opacity: 0.85 } }, 'ماہانہ قسط'),
          h('div', { className: 'mono', style: { fontSize: 34, fontWeight: 800, marginTop: 12, letterSpacing: '-0.02em' } }, this.fmtPKR(monthly)),
          h('div', { style: { fontSize: 12, opacity: 0.85, marginTop: 4 } }, np.months + ' months · ' + np.interest + '% markup'),
        ),
        h('div', { style: { background: '#fdfcf8', border: '1px solid #ece8dc', borderRadius: 16, padding: 20 } },
          [['Cash price', total], ['Down payment', down, '#0f6b4b'], ['Financed', financed], ['Total with markup', withInterest + down]].map(([lbl, val, col], i) =>
            h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid #f2eee2' : 'none', fontSize: 13 } },
              h('span', { style: { color: '#5a6a5f' } }, lbl),
              h('span', { className: 'mono', style: { fontWeight: 700, color: col || '#1a2b1f' } }, this.fmtPKR(val)),
            )),
        ),
        h('button', { onClick: () => this.createPlan(), style: { background: '#0f6b4b', color: 'white', padding: 14, borderRadius: 12, fontSize: 14, fontWeight: 700 } }, 'Create Plan →'),
        h('button', { onClick: () => this.go('dashboard'), style: { background: 'transparent', color: '#7a7663', padding: 10, fontSize: 13, fontWeight: 500 } }, 'Cancel'),
      ),
    );
  }

  renderRecordPayment() { return this.h('div', { style: { padding: 40, color: '#7a7663', fontSize: 14 } }, 'Use the Collect / Record buttons on the dashboard or plan.'); }

  renderReports() {
    const h = this.h;
    const months = ['Feb','Mar','Apr','May','Jun','Jul'];
    const monthAgg = { Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0 };
    this.state.plans.forEach(pl => pl.schedule.forEach(s => { if (s.paid && s.paidDate) { const m = new Date(s.paidDate).toLocaleDateString('en', { month: 'short' }); if (monthAgg[m] != null) monthAgg[m] += s.amount; } }));
    const max = Math.max(...Object.values(monthAgg), 1);
    const totalReceived = this.state.plans.reduce((a, p) => a + this.planStats(p).paidAmount, 0);
    const totalOut = this.state.plans.reduce((a, p) => a + this.planStats(p).remaining, 0);
    const byCat = {};
    this.state.plans.forEach(pl => { const p = this.state.products.find(x => x.id === pl.productId); byCat[p.category] = (byCat[p.category] || 0) + this.planStats(pl).total; });
    const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const catTotal = catEntries.reduce((a, [, v]) => a + v, 0);
    const catColors = ['#0f6b4b','#14a374','#3ba777','#a26a10','#d4a94a','#a4362b','#6b4a1a','#0a5138'];
    return h('div', { className: 'screen' },
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 } },
        h('button', { onClick: this.exportCSV, style: { background: '#f4f1e6', color: '#3a4a3f', padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 } }, '⬇ Export CSV'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 24 } },
        [['Received (all time)', this.fmtPKR(totalReceived), '#0f6b4b'], ['Outstanding', this.fmtPKR(totalOut), '#1a2b1f'], ['Active plans', this.state.plans.filter(p => p.status === 'active').length, '#1a2b1f'], ['Customers', this.state.customers.length, '#1a2b1f']].map(([l, v, c], i) =>
          h('div', { key: i, style: { background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 16, padding: 20 } },
            h('div', { style: { fontSize: 11, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 } }, l),
            h('div', { className: 'mono', style: { fontSize: 28, fontWeight: 700, color: c, marginTop: 8, letterSpacing: '-0.02em' } }, v),
          )),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20 } },
        this.card([
          this.sectionHeader('Monthly cash-in', 'ماہانہ آمدنی'),
          h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-end', height: 220, paddingTop: 20 } },
            months.map(m => h('div', { key: m, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } },
              h('div', { className: 'mono', style: { fontSize: 11, color: '#5a6a5f', fontWeight: 600 } }, Math.round(monthAgg[m] / 1000) + 'k'),
              h('div', { style: { width: '100%', maxWidth: 40, background: 'linear-gradient(180deg,#14a374,#0f6b4b)', borderRadius: '8px 8px 0 0', height: (monthAgg[m] / max * 160) + 'px', minHeight: 4, transition: 'height .4s' } }),
              h('div', { style: { fontSize: 12, color: '#7a7663', fontWeight: 600 } }, m),
            )),
          ),
        ]),
        this.card([
          this.sectionHeader('Sales by category', 'زمرہ جات'),
          h('div', { style: { display: 'flex', gap: 20, alignItems: 'center' } },
            h('svg', { width: 140, height: 140, viewBox: '0 0 42 42', style: { transform: 'rotate(-90deg)', flexShrink: 0 } },
              (() => { let offset = 0; return catEntries.map(([k, v], i) => { const pct = v / catTotal * 100; const el = h('circle', { key: k, cx: 21, cy: 21, r: 15.915, fill: 'transparent', stroke: catColors[i % catColors.length], strokeWidth: 6, strokeDasharray: pct + ' ' + (100 - pct), strokeDashoffset: -offset }); offset += pct; return el; }); })(),
            ),
            h('div', { style: { flex: 1 } },
              catEntries.map(([k, v], i) => h('div', { key: k, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 } },
                h('div', { style: { width: 12, height: 12, borderRadius: 3, background: catColors[i % catColors.length] } }),
                h('div', { style: { flex: 1 } }, k),
                h('div', { className: 'mono', style: { fontWeight: 700 } }, this.fmtPKR(v)),
              )),
            ),
          ),
        ]),
      ),
    );
  }

  renderReminders() {
    const h = this.h;
    let overdueList = [];
    this.state.plans.forEach(pl => {
      const c = this.state.customers.find(x => x.id === pl.customerId);
      const p = this.state.products.find(x => x.id === pl.productId);
      pl.schedule.forEach(s => { const due = new Date(s.dueDate); if (!s.paid && due < this.today()) overdueList.push({ pl, s, c, p, diff: this.daysBetween(this.today(), due) }); });
    });
    overdueList.sort((a, b) => a.diff - b.diff);
    return h('div', { className: 'screen' },
      h('div', { style: { fontSize: 14, color: '#7a7663', marginBottom: 16 } }, overdueList.length + ' overdue installments need attention.'),
      this.card([
        overdueList.map((r, i) => h('div', { key: i, style: { display: 'flex', gap: 12, padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid #f2eee2', alignItems: 'center', flexWrap: 'wrap' } },
          h('div', { style: { width: 44, height: 44, borderRadius: 12, background: r.c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#3a2f1a' } }, r.c.avatar),
          h('div', { style: { flex: 1, minWidth: 200 } },
            h('div', { style: { fontWeight: 700, fontSize: 15 } }, r.c.name + ' — ', h('span', { className: 'ur', style: { fontWeight: 400, fontSize: 13, color: '#7a7663' } }, r.c.nameUr)),
            h('div', { style: { fontSize: 12, color: '#a4362b', fontWeight: 500 } }, Math.abs(r.diff) + ' days late · ' + r.p.name + ' · ' + this.fmtPKR(r.s.amount)),
          ),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('a', { href: this.waLink(r.c.phone, r.c.name, r.s.amount, r.s.dueDate), target: '_blank', rel: 'noopener', style: { background: '#25D366', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' } }, '💬 WhatsApp'),
            h('button', { style: { background: '#f4f1e6', color: '#3a4a3f', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 } }, '📞 Call'),
            h('button', { onClick: () => this.openPayment(r.pl.id, r.s.n), style: { background: '#0f6b4b', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 } }, 'Collect'),
          ),
        )),
      ]),
    );
  }

  renderSettings() {
    const h = this.h;
    const st = this.state.settings;
    const setS = (k, v) => this.setState({ settings: { ...st, [k]: v } });
    const inp = { border: '1px solid #ece8dc', borderRadius: 8, padding: '6px 10px', fontSize: 13, background: '#fdfcf8', outline: 'none', width: 100, textAlign: 'right' };
    const row = (l, ur, v) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid #f2eee2', alignItems: 'center', gap: 12 } },
      h('div', { style: { minWidth: 0 } }, h('div', { style: { fontWeight: 600, fontSize: 14 } }, l), h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, ur)),
      h('div', { style: { color: '#3a4a3f', fontSize: 14 } }, v),
    );
    return h('div', { className: 'screen', style: { maxWidth: 720 } },
      this.card([
        h('div', { style: { fontSize: 16, fontWeight: 700, marginBottom: 8 } }, 'Business'),
        row('Business name', 'کاروبار کا نام', 'Sadar Electronics'),
        row('Owner', 'مالک', 'Rehan Malik'),
        row('Currency', 'کرنسی', 'Pakistani Rupee (Rs)'),
        row('Default markup', 'منافع', '12%'),
        row('Default plan length', 'دورانیہ', '6 months'),
      ]),
      h('div', { style: { height: 16 } }),
      this.card([
        h('div', { style: { fontSize: 16, fontWeight: 700, marginBottom: 4 } }, 'Late Fee Rules'),
        h('div', { style: { fontSize: 12, color: '#7a7663', marginBottom: 8 } }, 'Defaults for new plans.'),
        row('Grace period (days)', 'مہلت کے دن', h('input', { type: 'number', value: st.graceDays, onChange: e => setS('graceDays', parseInt(e.target.value) || 0), style: inp })),
        row('Flat late fee (Rs)', 'مقررہ جرمانہ', h('input', { type: 'number', value: st.lateFeeFlat, onChange: e => setS('lateFeeFlat', parseFloat(e.target.value) || 0), style: inp })),
        row('Per-day late fee (Rs)', 'یومیہ جرمانہ', h('input', { type: 'number', value: st.lateFeePerDay, onChange: e => setS('lateFeePerDay', parseFloat(e.target.value) || 0), style: inp })),
        row('Maximum late fee (Rs)', 'زیادہ سے زیادہ', h('input', { type: 'number', value: st.maxLateFee, onChange: e => setS('maxLateFee', parseFloat(e.target.value) || 0), style: inp })),
      ]),
      h('div', { style: { height: 16 } }),
      this.card([
        h('div', { style: { fontSize: 16, fontWeight: 700, marginBottom: 8 } }, 'Notifications'),
        row('WhatsApp reminders', 'واٹس ایپ', 'Enabled · 2 days before'),
        row('Overdue alerts', 'یاد دہانی', 'Daily'),
        row('Receipt printing', 'رسید', 'Thermal 58mm'),
      ]),
      h('div', { style: { height: 16 } }),
      this.card([
        h('div', { style: { fontSize: 16, fontWeight: 700, marginBottom: 8 } }, 'Appearance & Security'),
        row('Dark mode', 'ڈارک موڈ', h('button', { onClick: this.toggleDark, style: { padding: '8px 16px', borderRadius: 8, background: this.state.darkMode ? '#1a2b1f' : '#f4f1e6', color: this.state.darkMode ? '#eaf5ee' : '#3a4a3f', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' } }, this.state.darkMode ? '🌙 Dark On' : '☀️ Dark Off')),
        row('PIN lock', 'پن لاک', h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
          this.state.savedPin
            ? h('button', { onClick: () => this.setPin(''), style: { padding: '6px 12px', borderRadius: 8, background: '#fdecea', color: '#a4362b', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' } }, '🔓 Remove PIN')
            : h('input', { type: 'number', maxLength: 4, placeholder: '4-digit PIN', onBlur: e => { if (e.target.value.length === 4) this.setPin(e.target.value); }, style: { width: 100, border: '1px solid #ece8dc', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontFamily: 'monospace', outline: 'none' } }),
        )),
      ]),
      h('div', { style: { height: 16 } }),
      this.card([
        h('div', { style: { fontSize: 16, fontWeight: 700, color: '#a4362b', marginBottom: 8 } }, 'Danger Zone'),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 } },
          h('div', {},
            h('div', { style: { fontWeight: 600, fontSize: 14 } }, 'Reset all data'),
            h('div', { style: { fontSize: 12, color: '#7a7663', marginTop: 2 } }, 'Permanently deletes all customers, products, and plans.'),
          ),
          h('button', { onClick: this.resetAllData, style: { padding: '10px 16px', borderRadius: 10, background: '#fdecea', color: '#a4362b', fontWeight: 700, fontSize: 13, border: '1px solid #f5cac2', cursor: 'pointer', flexShrink: 0 } }, '🗑 Reset all data'),
        ),
      ], { border: '1px solid #f5cac2' }),
    );
  }

  renderAddCustomer() {
    const h = this.h;
    const nc = this.state.newCustomer;
    const step = this.state.addCustomerStep;
    const set = this.setNc;
    const inp = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    const field = (label, ur, node, req) => h('div', {},
      h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6, display: 'flex', gap: 6 } },
        h('span', {}, label, req ? h('span', { style: { color: '#a4362b' } }, ' *') : null),
        h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, ur),
      ),
      node,
    );
    const stepper = h('div', { style: { display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' } },
      ['Personal', 'Address', 'Guarantor', 'Documents'].map((label, i) => {
        const n = i + 1; const active = step === n; const done = step > n;
        return h(React.Fragment, { key: n },
          h('button', { onClick: () => this.setState({ addCustomerStep: n }), style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 20, background: active ? '#eaf5ee' : 'transparent', color: active || done ? '#0f6b4b' : '#7a7663', fontWeight: 600, fontSize: 12 } },
            h('div', { style: { width: 22, height: 22, borderRadius: '50%', background: active || done ? '#0f6b4b' : '#e7e2d2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 } }, done ? '✓' : n),
            label,
          ),
          i < 3 ? h('div', { style: { flex: 1, height: 1, background: '#ece8dc', maxWidth: 40 } }) : null,
        );
      }),
    );
    let content = null;
    if (step === 1) {
      content = h('div', { style: { display: 'grid', gap: 16 } },
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('Full Name', 'پورا نام', h('input', { value: nc.name, onChange: e => set('name', e.target.value), placeholder: 'Muhammad Ali', style: inp }), true),
          field('Name (Urdu)', 'اردو نام', h('input', { className: 'ur', value: nc.nameUr, onChange: e => set('nameUr', e.target.value), placeholder: 'محمد علی', style: { ...inp, textAlign: 'right' } })),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field("Father's Name", 'والد کا نام', h('input', { value: nc.fatherName, onChange: e => set('fatherName', e.target.value), style: inp })),
          field('Date of Birth', 'تاریخ پیدائش', h('input', { type: 'date', value: nc.dob, onChange: e => set('dob', e.target.value), style: inp })),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('CNIC', 'شناختی کارڈ', h('input', { value: nc.cnic, onChange: e => set('cnic', e.target.value), placeholder: '35202-1234567-8', style: { ...inp, fontFamily: 'JetBrains Mono, monospace' } }), true),
          field('Mobile', 'موبائل نمبر', h('input', { value: nc.phone, onChange: e => set('phone', e.target.value), placeholder: '0300-1234567', style: inp }), true),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('Alternate Phone', 'متبادل نمبر', h('input', { value: nc.altPhone, onChange: e => set('altPhone', e.target.value), placeholder: '042-1234567', style: inp })),
          field('Occupation', 'پیشہ', h('input', { value: nc.occupation, onChange: e => set('occupation', e.target.value), placeholder: 'Shopkeeper…', style: inp })),
        ),
        field('Monthly Income (Rs)', 'ماہانہ آمدنی', h('input', { type: 'number', value: nc.monthlyIncome, onChange: e => set('monthlyIncome', e.target.value), placeholder: '50000', style: inp })),
      );
    } else if (step === 2) {
      content = h('div', { style: { display: 'grid', gap: 16 } },
        field('Full Address', 'مکمل پتہ', h('textarea', { value: nc.address, onChange: e => set('address', e.target.value), rows: 3, placeholder: 'House 12, Street 5…', style: { ...inp, resize: 'vertical' } }), true),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('Area / Locality', 'علاقہ', h('input', { value: nc.area, onChange: e => set('area', e.target.value), placeholder: 'Model Town', style: inp })),
          field('City', 'شہر', h('select', { value: nc.city, onChange: e => set('city', e.target.value), style: inp }, ['Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Multan','Peshawar','Sialkot','Gujranwala','Other'].map(c => h('option', { key: c, value: c }, c)))),
        ),
        field('Notes', 'اضافی معلومات', h('textarea', { value: nc.notes, onChange: e => set('notes', e.target.value), rows: 3, placeholder: 'Preferred collection day, landmarks…', style: { ...inp, resize: 'vertical' } })),
      );
    } else if (step === 3) {
      content = h('div', { style: { display: 'grid', gap: 16 } },
        h('div', { style: { background: '#fdf2d9', border: '1px solid #f0d894', borderRadius: 10, padding: 12, fontSize: 13, color: '#7a5100' } }, '⚠️ A guarantor is strongly recommended for plans above Rs 50,000.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('Guarantor Name', 'ضامن کا نام', h('input', { value: nc.guarantorName, onChange: e => set('guarantorName', e.target.value), style: inp })),
          field('Relation', 'رشتہ', h('select', { value: nc.guarantorRelation, onChange: e => set('guarantorRelation', e.target.value), style: inp }, ['','Father','Brother','Uncle','Cousin','Friend','Colleague','Other'].map(r => h('option', { key: r, value: r }, r || 'Select…')))),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('Guarantor Phone', 'ضامن کا فون', h('input', { value: nc.guarantorPhone, onChange: e => set('guarantorPhone', e.target.value), placeholder: '0300-0000000', style: inp })),
          field('Guarantor CNIC', 'ضامن کا شناختی کارڈ', h('input', { value: nc.guarantorCnic, onChange: e => set('guarantorCnic', e.target.value), placeholder: '35202-0000000-0', style: { ...inp, fontFamily: 'JetBrains Mono, monospace' } })),
        ),
      );
    } else {
      content = h('div', { style: { display: 'grid', gap: 16 } },
        h('div', { style: { fontSize: 13, color: '#5a6a5f' } }, "Upload copies of the customer's documents. You can add more later from their profile."),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 } },
          [{ key: 'cnic_front', label: 'CNIC – Front', icon: '🪪' }, { key: 'cnic_back', label: 'CNIC – Back', icon: '🪪' }, { key: 'guarantor_cnic', label: 'Guarantor CNIC', icon: '🪪' }, { key: 'utility_bill', label: 'Utility Bill', icon: '⚡' }, { key: 'salary_slip', label: 'Salary Slip', icon: '💵' }, { key: 'photo', label: 'Customer Photo', icon: '📷' }, { key: 'signed_agreement', label: 'Signed Agreement', icon: '📄' }, { key: 'other', label: 'Other Document', icon: '📎' }].map(d =>
            h('label', { key: d.key, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16, border: '1.5px dashed #d9d5c7', borderRadius: 12, background: '#fdfcf8', cursor: 'pointer', textAlign: 'center' } },
              h('div', { style: { fontSize: 24 } }, d.icon),
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f' } }, d.label),
              h('div', { style: { fontSize: 10, color: '#0f6b4b', fontWeight: 600, marginTop: 2 } }, '＋ Upload'),
              h('input', { type: 'file', accept: 'image/*,.pdf', multiple: true, onChange: e => this.addNcDoc(d.key, e.target.files), style: { display: 'none' } }),
            )),
        ),
        nc.documents.length > 0 ? h('div', {},
          h('div', { style: { fontSize: 12, fontWeight: 700, color: '#3a4a3f', marginBottom: 8, marginTop: 8 } }, 'Uploaded (' + nc.documents.length + ')'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            nc.documents.map((d, i) => h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#eaf5ee', border: '1px solid #cfe0d5', borderRadius: 8 } },
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 13, fontWeight: 600 } }, d.name),
                h('div', { style: { fontSize: 11, color: '#5a6a5f' } }, d.kind.replace(/_/g, ' ') + ' · ' + Math.round(d.size / 1024) + ' KB'),
              ),
              h('button', { onClick: () => this.removeNcDoc(i), style: { color: '#a4362b', fontSize: 12, fontWeight: 600 } }, 'Remove'),
            )),
          ),
        ) : null,
      );
    }
    return h('div', { onClick: this.closeAddCustomer, style: { position: 'fixed', inset: 0, background: 'rgba(26,43,31,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20, backdropFilter: 'blur(4px)', overflow: 'auto' } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'slideIn .2s ease' } },
        h('div', { style: { padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 } },
          h('div', {}, h('div', { style: { fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' } }, 'Add New Customer'), h('div', { className: 'ur', style: { fontSize: 14, color: '#7a7663' } }, 'نیا گاہک شامل کریں')),
          h('button', { onClick: this.closeAddCustomer, style: { width: 36, height: 36, borderRadius: 10, background: '#f4f1e6', fontSize: 18 } }, '✕'),
        ),
        h('div', { style: { padding: '20px 28px 0' } }, stepper),
        h('div', { style: { padding: '4px 28px 20px', overflowY: 'auto', flex: 1 } }, content),
        h('div', { style: { padding: '16px 28px', borderTop: '1px solid #ece8dc', display: 'flex', justifyContent: 'space-between', gap: 10, background: '#fdfcf8', borderRadius: '0 0 20px 20px' } },
          h('button', { onClick: () => step > 1 ? this.setState({ addCustomerStep: step - 1 }) : this.closeAddCustomer(), style: { padding: '10px 16px', borderRadius: 10, background: '#f4f1e6', fontWeight: 600, fontSize: 13, color: '#3a4a3f' } }, step > 1 ? '← Back' : 'Cancel'),
          h('div', { style: { fontSize: 12, color: '#7a7663', alignSelf: 'center' } }, 'Step ' + step + ' of 4'),
          step < 4
            ? h('button', { onClick: () => this.setState({ addCustomerStep: step + 1 }), style: { padding: '10px 20px', borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 13 } }, 'Continue →')
            : h('button', { onClick: this.saveNewCustomer, style: { padding: '10px 20px', borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 13 } }, '✓ Save Customer'),
        ),
      ),
    );
  }

  renderAddProductModal() {
    const h = this.h;
    const np = this.state.newProduct;
    const set = (k, v) => this.setState({ newProduct: { ...np, [k]: v } });
    const inp = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    const field = (label, node) => h('div', {},
      h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, label),
      node,
    );
    const categories = ['Mobile', 'Motorcycle', 'Television', 'Refrigerator', 'Appliance', 'Air Conditioner', 'Laptop', 'Other'];
    const emojis = ['📱','🏍️','📺','❄️','🧺','💻','📦','⚡','🔌','🎮','📷','🖨️'];
    return h('div', { onClick: this.closeAddProduct, style: { position: 'fixed', inset: 0, background: 'rgba(26,43,31,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20, backdropFilter: 'blur(4px)' } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, animation: 'slideIn .2s ease' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } },
          h('div', {},
            h('div', { style: { fontSize: 18, fontWeight: 800 } }, '＋ Add Product'),
            h('div', { style: { fontSize: 12, color: '#7a7663', marginTop: 2 } }, 'New item for your catalog'),
          ),
          h('button', { onClick: this.closeAddProduct, style: { width: 34, height: 34, borderRadius: 9, background: '#f4f1e6', fontSize: 16 } }, '✕'),
        ),
        h('div', { style: { display: 'grid', gap: 14 } },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            field('Product Name *', h('input', { value: np.name, onChange: e => set('name', e.target.value), placeholder: 'e.g. Samsung A35', style: inp })),
            field('Urdu Name', h('input', { className: 'ur', value: np.nameUr, onChange: e => set('nameUr', e.target.value), placeholder: 'سامسنگ', style: { ...inp, textAlign: 'right' } })),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            field('Category', h('select', { value: np.category, onChange: e => set('category', e.target.value), style: inp },
              categories.map(c => h('option', { key: c, value: c }, c)))),
            field('Price (Rs) *', h('input', { type: 'number', value: np.price, onChange: e => set('price', e.target.value), placeholder: '0', style: inp })),
          ),
          field('Opening Stock', h('input', { type: 'number', value: np.stock, onChange: e => set('stock', e.target.value), placeholder: '0', style: inp })),
          field('Icon', h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            emojis.map(em => h('button', { key: em, onClick: () => set('emoji', em), style: { width: 40, height: 40, borderRadius: 10, fontSize: 20, border: '2px solid ' + (np.emoji === em ? '#0f6b4b' : '#ece8dc'), background: np.emoji === em ? '#eaf5ee' : '#fdfcf8' } }, em))
          )),
        ),
        h('div', { style: { display: 'flex', gap: 10, marginTop: 24 } },
          h('button', { onClick: this.closeAddProduct, style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600 } }, 'Cancel'),
          h('button', { onClick: this.saveNewProduct, style: { flex: 2, padding: 12, borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700 } }, '＋ Add to Catalog'),
        ),
      ),
    );
  }

  renderPaymentModal() {
    const h = this.h;
    const ctx = this.state.paymentContext;
    if (!ctx) return null;
    const pl = this.state.plans.find(p => p.id === ctx.planId);
    const c = this.state.customers.find(x => x.id === pl.customerId);
    const p = this.state.products.find(x => x.id === pl.productId);
    const s = pl.schedule.find(x => x.n === ctx.installmentN);
    const lateFee = this.computeLateFee(s, pl);
    const totalDue = s.amount + lateFee;
    return h('div', { onClick: this.closePayment, style: { position: 'fixed', inset: 0, background: 'rgba(26,43,31,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20, backdropFilter: 'blur(4px)' } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, animation: 'slideIn .2s ease' } },
        h('div', { style: { display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 } },
          h('div', { style: { width: 52, height: 52, borderRadius: 14, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#3a2f1a' } }, c.avatar),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 17, fontWeight: 700 } }, c.name),
            h('div', { style: { fontSize: 12, color: '#7a7663' } }, p.emoji + ' ' + p.name + ' · Installment ' + s.n + '/' + pl.months),
          ),
        ),
        h('div', { style: { background: '#fdfcf8', border: '1px solid #ece8dc', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 20 } },
          h('div', { style: { fontSize: 11, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 } }, 'Amount Collected'),
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 } },
            h('span', { className: 'mono', style: { fontSize: 20, fontWeight: 700, color: '#7a7663' } }, 'Rs'),
            h('input', { type: 'number', value: this.state.paymentAmount, onChange: e => this.setState({ paymentAmount: e.target.value }), className: 'mono', style: { fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', border: 'none', borderBottom: '2px solid #0f6b4b', background: 'transparent', outline: 'none', width: 160, textAlign: 'center', color: '#1a2b1f' } }),
          ),
          h('div', { style: { fontSize: 12, color: '#7a7663', marginTop: 4 } }, 'Due ' + this.fmtDate(s.dueDate) + ' · Full: ' + this.fmtPKR(totalDue)),
          lateFee > 0 ? h('div', { style: { marginTop: 10, padding: '6px 10px', background: '#fdecea', color: '#a4362b', borderRadius: 8, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 } },
            h('span', { className: 'mono', style: { fontWeight: 700 } }, this.fmtPKR(s.amount)), ' installment + ', h('span', { className: 'mono', style: { fontWeight: 700 } }, this.fmtPKR(lateFee)), ' late fee') : null,
        ),
        h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Payment method'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 } },
          ['💵 Cash', '📱 EasyPaisa', '🏦 Bank'].map((m, i) => { const k = ['cash','easypaisa','bank'][i]; const active = this.state.paymentMethod === k; return h('button', { key: i, onClick: () => this.setState({ paymentMethod: k }), style: { padding: 12, borderRadius: 10, border: '1px solid ' + (active ? '#0f6b4b' : '#ece8dc'), background: active ? '#eaf5ee' : '#fdfcf8', fontSize: 12, fontWeight: 600, color: active ? '#0f6b4b' : '#3a4a3f' } }, m); }),
        ),
        h('div', { style: { display: 'flex', gap: 10 } },
          h('button', { onClick: this.closePayment, style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600, color: '#3a4a3f' } }, 'Cancel'),
          h('button', { onClick: this.confirmPayment, style: { flex: 2, padding: 12, borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700 } }, '✓ Confirm Payment'),
        ),
      ),
    );
  }

  renderReceipt() {
    const h = this.h;
    const r = this.state.receiptData;
    if (!r) return null;
    return h('div', { onClick: this.closeReceipt, style: { position: 'fixed', inset: 0, background: 'rgba(26,43,31,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20, backdropFilter: 'blur(4px)' } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, textAlign: 'center', animation: 'slideIn .2s ease' } },
        h('div', { style: { width: 64, height: 64, borderRadius: '50%', background: '#eaf5ee', color: '#0f6b4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' } }, '✓'),
        h('div', { style: { fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' } }, 'Payment Received'),
        h('div', { className: 'ur', style: { fontSize: 14, color: '#7a7663', marginTop: 2 } }, 'ادائیگی وصول ہوگئی'),
        h('div', { className: 'mono', style: { fontSize: 32, fontWeight: 800, color: '#0f6b4b', margin: '20px 0 4px' } }, this.fmtPKR(r.installment.amount)),
        h('div', { style: { fontSize: 12, color: '#7a7663' } }, 'Receipt #' + r.receiptNo),
        h('div', { style: { textAlign: 'left', background: '#fdfcf8', border: '1px dashed #d9d5c7', borderRadius: 12, padding: 16, marginTop: 20, fontSize: 13 } },
          [['Customer', r.customer.name], ['Product', r.product.name], ['Installment', r.installment.n + ' / ' + r.plan.months], ['Date', this.fmtDate(r.date)]].map(([l, v], i) =>
            h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' } },
              h('span', { style: { color: '#7a7663' } }, l), h('span', { style: { fontWeight: 600 } }, v))),
        ),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 20 } },
          h('button', { onClick: () => window.print(), style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600 } }, '🖨️ Print'),
          h('button', { style: { flex: 1, padding: 12, borderRadius: 10, background: '#25D366', color: 'white', fontWeight: 600 } }, '💬 Share'),
          h('button', { onClick: this.closeReceipt, style: { flex: 1, padding: 12, borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700 } }, 'Done'),
        ),
      ),
    );
  }

  renderPinLock() {
    const h = this.h;
    return h('div', { style: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f7f5ef' } },
      h('div', { style: { background: '#ffffff', borderRadius: 20, padding: 40, textAlign: 'center', width: '100%', maxWidth: 360, border: '1px solid #ece8dc', margin: '0 16px' } },
        h('div', { style: { fontSize: 40, marginBottom: 16 } }, '🔐'),
        h('div', { style: { fontSize: 20, fontWeight: 800, marginBottom: 4 } }, 'Aqsat'),
        h('div', { style: { fontSize: 13, color: '#7a7663', marginBottom: 28 } }, 'Enter PIN to continue'),
        h('input', { type: 'password', inputMode: 'numeric', maxLength: 4, placeholder: '••••', value: this.state.enteredPin, onChange: e => this.setState({ enteredPin: e.target.value }), onKeyDown: e => e.key === 'Enter' && this.submitPin(), autoFocus: true, style: { width: '100%', textAlign: 'center', fontSize: 32, letterSpacing: 16, border: '2px solid #ece8dc', borderRadius: 12, padding: '14px 10px', outline: 'none', background: '#fdfcf8', fontFamily: 'monospace', marginBottom: 16, boxSizing: 'border-box' } }),
        h('button', { onClick: this.submitPin, style: { width: '100%', background: '#0f6b4b', color: 'white', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' } }, 'Unlock →'),
      ),
    );
  }

  // ─── main layout ───
  render() {
    if (!this.state.customers) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f5ef' }}>
          <Head><title>Aqsat — Installment Manager</title></Head>
          <div style={{ color: '#7a7663', fontSize: 16 }}>Loading…</div>
        </div>
      );
    }

    if (this.state.pinLocked) return this.renderPinLock();
    const { route, plans } = this.state;
    const titles = {
      dashboard: ['Dashboard', 'ڈیش بورڈ', 'Overview of your business'],
      customers:  ['Customers', 'گاہک',      'All buyers on installments'],
      customer:   ['Customer',  'گاہک',      'Profile & plans'],
      products:   ['Products',  'اشیاء',     'Catalog & stock'],
      plans:      ['Installment Plans', 'اقساط', 'Active and completed plans'],
      newplan:    ['New Plan',  'نیا پلان',  'Create an installment plan'],
      record:     ['Record Payment', 'رقم وصول', 'Fast collection'],
      reports:    ['Reports',   'رپورٹس',    'Cashflow & analytics'],
      reminders:  ['Reminders', 'یاد دہانی', 'Follow-ups & notifications'],
      settings:   ['Settings',  'ترتیبات',   'Business preferences'],
    };
    const t = titles[route] || titles.dashboard;
    const overdueCount = plans.reduce((a, pl) => a + this.planStats(pl).overdue.length, 0);

    const navBase = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#3a4a3f', width: '100%' };
    const navActive = { ...navBase, background: '#eaf5ee', color: '#0f6b4b', fontWeight: 700 };
    const isOnCustomer = route === 'customer' || route === 'customers';

    const navItems = [
      { key: 'dashboard', label: 'Dashboard', icon: '◆', go: () => this.go('dashboard') },
      { key: 'customers', label: 'Customers',  icon: '👥', go: () => this.go('customers') },
      { key: 'plans',     label: 'Plans',      icon: '📋', go: () => this.go('plans') },
      { key: 'products',  label: 'Products',   icon: '📦', go: () => this.go('products') },
      { key: 'reports',   label: 'Reports',    icon: '📊', go: () => this.go('reports') },
      { key: 'reminders', label: 'Reminders',  icon: '🔔', go: () => this.go('reminders'), badge: overdueCount > 0 ? String(overdueCount) : null },
      { key: 'settings',  label: 'Settings',   icon: '⚙️', go: () => this.go('settings') },
    ].map(x => ({ ...x, active: route === x.key || (x.key === 'customers' && isOnCustomer) }));

    const mobileNavBase = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', borderRadius: 10, color: '#7a7663' };
    const mobileNavActive = { ...mobileNavBase, color: '#0f6b4b', background: '#eaf5ee' };
    const mobileNav = [
      { key: 'dashboard', label: 'Home',      icon: '◆', go: () => this.go('dashboard') },
      { key: 'customers', label: 'Customers', icon: '👥', go: () => this.go('customers') },
      { key: 'newplan',   label: 'New',       icon: '＋', go: () => this.go('newplan') },
      { key: 'plans',     label: 'Plans',     icon: '📋', go: () => this.go('plans') },
      { key: 'reports',   label: 'More',      icon: '☰',  go: () => this.go('reports') },
    ].map(x => ({ ...x, active: route === x.key || (x.key === 'customers' && isOnCustomer) }));

    return (
      <div className={this.state.darkMode ? 'app dark' : 'app'} style={{ minHeight: '100vh', display: 'flex', background: '#f7f5ef' }}>
        <Head>
          <title>Aqsat — Installment Manager</title>
          <meta name="description" content="Installment management for electronics & appliance shops" />
        </Head>

        {/* Sidebar desktop */}
        <aside className="desktop-only" style={{ width: 244, flexShrink: 0, background: '#ffffff', borderRight: '1px solid #ece8dc', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 24px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0f6b4b,#14a374)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18 }}>A</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>Aqsat</div>
              <div style={{ fontSize: 11, color: '#7a7663', marginTop: -2 }}>Installment Manager</div>
            </div>
          </div>
          {navItems.map(item => (
            <button key={item.key} onClick={item.go} style={item.active ? navActive : navBase}>
              <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {item.badge && <span style={{ background: '#fce8b7', color: '#7a5100', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>{item.badge}</span>}
            </button>
          ))}
          <div style={{ marginTop: 'auto', padding: '12px 10px', borderTop: '1px solid #ece8dc', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e7dcc4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6b4a1a' }}>RM</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Rehan Malik</div>
              <div style={{ fontSize: 11, color: '#7a7663' }}>Sadar Electronics</div>
            </div>
          </div>
        </aside>

        {/* Mobile topbar */}
        <div className="mobile-only" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, background: '#ffffff', borderBottom: '1px solid #ece8dc', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#0f6b4b,#14a374)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Aqsat</div>
            <div style={{ fontSize: 10, color: '#7a7663' }}>{t[0]}</div>
          </div>
          <button onClick={() => this.go('newplan')} style={{ width: 36, height: 36, borderRadius: 10, background: '#f4f1e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>＋</button>
        </div>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
          {/* Desktop topbar */}
          <div className="desktop-only" style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #ece8dc', background: '#fdfcf8', position: 'sticky', top: 0, zIndex: 20 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
                {t[0]} <span className="ur" style={{ fontSize: 13, color: '#7a7663', fontWeight: 400 }}>{t[1]}</span>
              </div>
              <div style={{ fontSize: 11, color: '#7a7663', marginTop: 1 }}>{t[2]}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 'min(420px,100%)', background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#a09a86' }}>🔍</span>
                <input placeholder="Search customer, plan, product…" value={this.state.searchQuery} onChange={e => this.setState({ searchQuery: e.target.value })} style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14, background: 'transparent' }} />
                <span style={{ fontSize: 11, color: '#a09a86', background: '#f4f1e6', padding: '2px 6px', borderRadius: 5 }}>⌘K</span>
              </div>
            </div>
            <button onClick={() => this.go('newplan')} style={{ background: '#0f6b4b', color: 'white', padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>＋ New Plan</button>
            <button style={{ width: 40, height: 40, borderRadius: 10, background: '#f4f1e6', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              🔔
              {overdueCount > 0 && <span style={{ position: 'absolute', top: 6, right: 8, width: 8, height: 8, background: '#d93b3b', borderRadius: '50%' }} />}
            </button>
          </div>

          {/* Screen area — extra top padding on mobile for fixed header */}
          <div style={{ padding: '18px 22px', flex: 1 }} className="screen-container">
            <div className="mobile-only" style={{ height: 56 }} />
            {route === 'dashboard'  && this.renderDashboard()}
            {route === 'customers'  && this.renderCustomers()}
            {route === 'customer'   && this.renderCustomerDetail()}
            {route === 'products'   && this.renderProducts()}
            {route === 'plans'      && this.renderPlans()}
            {route === 'newplan'    && this.renderNewPlan()}
            {route === 'record'     && this.renderRecordPayment()}
            {route === 'reports'    && this.renderReports()}
            {route === 'reminders'  && this.renderReminders()}
            {route === 'settings'   && this.renderSettings()}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="mobile-only" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #ece8dc', padding: '8px 4px', display: 'flex', zIndex: 30 }}>
          {mobileNav.map(item => (
            <button key={item.key} onClick={item.go} style={item.active ? mobileNavActive : mobileNavBase}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Modals */}
        {this.state.addProductOpen   && this.renderAddProductModal()}
        {this.state.addCustomerOpen  && this.renderAddCustomer()}
        {this.state.paymentModalOpen && this.renderPaymentModal()}
        {this.state.receiptOpen      && this.renderReceipt()}
      </div>
    );
  }
}
