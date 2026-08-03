import React from 'react';
import Head from 'next/head';
import { supabase, SHOP_ID } from '../lib/supabase';

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
    newPlan: { customerId: '', productId: '', totalPrice: '', downPayment: '', months: 6, customMonths: '', installmentAmount: '', interestType: 'percent', interest: 12, interestAmount: '', startDate: new Date().toISOString().slice(0, 10), graceDays: 0, lateFeeFlat: 0, lateFeePerDay: 0, imei: '', chassisNo: '', frequency: 'monthly', frequencyDays: 30 },
    paymentAmount: '',
    menuOpen: false,
    deletePlanModal: { open: false, planId: null, pinInput: '' },
    editPlanModal: { open: false, planId: null, pinInput: '', pinConfirmed: false, draftSchedule: [], draftImei: '', draftChassisNo: '', draftNotes: '' },
    editCustomerModal: { open: false },
    pinModal: { open: false, callback: null, error: '' },
    pinModalInput: '',
    addCustomerOpen: false,
    newCustomer: {
      name: '', nameUr: '', phone: '', altPhone: '', cnic: '', dob: '',
      fatherName: '', occupation: '', monthlyIncome: '',
      address: '', city: '', area: '',
      guarantorName: '', guarantorPhone: '', guarantorCnic: '', guarantorRelation: '',
      notes: '', documents: [],
    },
    addCustomerStep: 1,
    planFilter: 'all',
    lateFeePanel: null,
    editProductModal: { open: false, id: null, name: '', nameUr: '', category: 'Mobile', price: '', stock: '', emoji: '📦' },
    addProductOpen: false,
    newProduct: { name: '', nameUr: '', category: 'Mobile', price: '', stock: '', emoji: '📦' },
    settings: { graceDays: 0, lateFeeFlat: 0, lateFeePerDay: 0, maxLateFee: 0, businessName: 'Sadar Electronics', ownerName: 'Rehan Malik', city: 'Lahore', accounts: [{ id: 'acc_cash', name: 'Cash in Hand', nameUr: 'نقد', emoji: '💵', balance: 0 }, { id: 'acc_ep', name: 'EasyPaisa', nameUr: 'ایزی پیسہ', emoji: '📱', balance: 0 }, { id: 'acc_bank', name: 'Bank', nameUr: 'بینک', emoji: '🏦', balance: 0 }] },
    searchQuery: '',
    darkMode: false,
    pinLocked: false,
    enteredPin: '',
    savedPin: '',
    paymentAccountId: '',
    addAccountOpen: false,
    newAccount: { name: '', nameUr: '', emoji: '💰', balance: '' },
    syncStatus: 'loading', // 'loading' | 'synced' | 'syncing' | 'offline' | 'error'
    syncError: '',
  };

  componentDidMount() {
    if (typeof window === 'undefined') return;
    // Wipe old demo seed data
    try {
      const old = localStorage.getItem('aqsat_data');
      if (old) {
        const d = JSON.parse(old);
        if (d.customers && d.customers.some(c => /^c\d$/.test(c.id))) localStorage.removeItem('aqsat_data');
      }
    } catch(e) {}

    const dm  = localStorage.getItem('aqsat_dark') === '1';
    const pin = localStorage.getItem('aqsat_pin') || '';
    this.setState({ darkMode: dm, savedPin: pin, pinLocked: !!pin }, () => {
      this.initSupabaseSync();
    });
    this._onVisibility = () => {
      if (document.visibilityState === 'visible') this._refetchCloud();
    };
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  componentDidUpdate(_, prev) {
    if (typeof window === 'undefined') return;
    const { customers, products, plans, settings } = this.state;
    if (!customers) return;
    // Skip push if this state change came FROM a cloud sync (prevents write loops)
    if (this._fromCloud) { this._fromCloud = false; return; }
    if (customers !== prev.customers || products !== prev.products || plans !== prev.plans || settings !== prev.settings) {
      clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(this.pushToSupabase, 1200);
    }
  }

  componentWillUnmount() {
    if (this._syncChannel) supabase.removeChannel(this._syncChannel);
    clearTimeout(this._syncTimer);
    if (this._onVisibility) document.removeEventListener('visibilitychange', this._onVisibility);
  }

  _applyCloudData = (d) => {
    this._fromCloud = true;
    const local = this.state.customers ? { customers: this.state.customers, products: this.state.products, plans: this.state.plans, settings: this.state.settings } : null;
    const merged = local ? this._mergeData(local, d) : { customers: d.customers || [], products: d.products || [], plans: d.plans || [], settings: d.settings || this.state.settings };
    const settings = merged.settings || this.state.settings;
    if (!settings.accounts || !settings.accounts.length) {
      settings.accounts = [{ id: 'acc_cash', name: 'Cash in Hand', nameUr: 'نقد', emoji: '💵', balance: 0 }, { id: 'acc_ep', name: 'EasyPaisa', nameUr: 'ایزی پیسہ', emoji: '📱', balance: 0 }, { id: 'acc_bank', name: 'Bank', nameUr: 'بینک', emoji: '🏦', balance: 0 }];
    }
    const cloudPin = settings.pin || '';
    if (cloudPin) { localStorage.setItem('aqsat_pin', cloudPin); }
    const payload = { customers: merged.customers, products: merged.products, plans: merged.plans, settings, syncStatus: 'synced' };
    if (cloudPin) payload.savedPin = cloudPin;
    localStorage.setItem('aqsat_data', JSON.stringify(merged));
    this.setState(payload);
  };

  initSupabaseSync = async () => {
    this.setState({ syncStatus: 'loading' });
    try {
      const { data, error } = await supabase.from('shops').select('data').eq('id', SHOP_ID).single();
      if (error && error.code !== 'PGRST116') throw error;

      const cloudCount = (data?.data?.plans?.length || 0) + (data?.data?.customers?.length || 0);

      if (cloudCount > 0) {
        // Cloud has real data — always use it, no questions asked
        this._applyCloudData(data.data);
      } else {
        // Cloud is empty — check localStorage once to recover any existing data
        let localData = null;
        try { const raw = localStorage.getItem('aqsat_data'); if (raw) localData = JSON.parse(raw); } catch(e) {}
        const localCount = (localData?.plans?.length || 0) + (localData?.customers?.length || 0);
        if (localCount > 0) {
          // Push local data up to cloud and use it
          this.setState({ customers: localData.customers || [], products: localData.products || [], plans: localData.plans || [], settings: localData.settings || this.state.settings, syncStatus: 'synced' }, this.pushToSupabase);
        } else {
          this.seed();
          this.setState({ syncStatus: 'synced' });
        }
      }
    } catch(err) {
      // Network error — load localStorage silently, retry sync on next interaction
      let localData = null;
      try { const raw = localStorage.getItem('aqsat_data'); if (raw) localData = JSON.parse(raw); } catch(e) {}
      if (localData?.customers) this.setState({ customers: localData.customers || [], products: localData.products || [], plans: localData.plans || [], settings: localData.settings || this.state.settings });
      else this.seed();
      this.setState({ syncStatus: 'offline', syncError: err.message || '' });
      return;
    }
    // Real-time: any change on any device arrives here instantly
    this._syncChannel = supabase
      .channel('shop-' + SHOP_ID)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops', filter: `id=eq.${SHOP_ID}` }, (payload) => {
        const d = payload.new?.data;
        if (d) this._applyCloudData(d);
      })
      .subscribe();
  };

  _refetchCloud = async () => {
    if (this._refetching) return;
    this._refetching = true;
    try {
      const { data } = await supabase.from('shops').select('data').eq('id', SHOP_ID).single();
      if (data?.data) {
        const merged = this._mergeData(this.state, data.data);
        this._fromCloud = true;
        localStorage.setItem('aqsat_data', JSON.stringify(merged));
        const cloudPin = (merged.settings || {}).pin || '';
        if (cloudPin) localStorage.setItem('aqsat_pin', cloudPin);
        this.setState({ ...merged, syncStatus: 'synced', ...(cloudPin ? { savedPin: cloudPin } : {}) });
      }
    } catch(e) {}
    this._refetching = false;
  };

  _mergeData = (local, cloud) => {
    const mergeArr = (localArr, cloudArr) => {
      const map = new Map();
      (cloudArr || []).forEach(item => map.set(item.id, item));
      (localArr || []).forEach(item => map.set(item.id, item));
      return Array.from(map.values());
    };
    return {
      customers: mergeArr(local.customers, cloud.customers),
      products: mergeArr(local.products, cloud.products),
      plans: mergeArr(local.plans, cloud.plans),
      settings: { ...(cloud.settings || {}), ...(local.settings || {}) },
    };
  };

  pushToSupabase = async () => {
    const { customers, products, plans, settings } = this.state;
    if (!customers) return;
    this.setState({ syncStatus: 'syncing' });
    try {
      const { data: cloud } = await supabase.from('shops').select('data').eq('id', SHOP_ID).single();
      const localData = { customers, products, plans, settings };
      const merged = cloud?.data ? this._mergeData(localData, cloud.data) : localData;
      localStorage.setItem('aqsat_data', JSON.stringify(merged));
      const { error } = await supabase.from('shops').upsert({ id: SHOP_ID, data: merged, updated_at: new Date().toISOString() });
      if (!error && merged !== localData) {
        this._fromCloud = true;
        this.setState({ customers: merged.customers, products: merged.products, plans: merged.plans, settings: merged.settings, syncStatus: 'synced' });
      } else {
        this.setState({ syncStatus: error ? 'error' : 'synced', syncError: error?.message || '' });
      }
    } catch(e) {
      localStorage.setItem('aqsat_data', JSON.stringify({ customers, products, plans, settings }));
      const { error } = await supabase.from('shops').upsert({ id: SHOP_ID, data: { customers, products, plans, settings }, updated_at: new Date().toISOString() });
      this.setState({ syncStatus: error ? 'error' : 'synced', syncError: error?.message || '' });
    }
  };

  seed() {
    this.setState({ customers: [], products: [], plans: [] });
  }

  resetAllData = () => {
    const rp = this.state.settings.resetPin || '';
    if (!rp) { alert('Set a 6-digit Reset PIN in Settings first.\nپہلے سیٹنگز میں 6 ہندسوں کا ری سیٹ PIN مقرر کریں۔'); return; }
    this.requireResetPin(() => {
      if (!confirm('⚠️ FINAL WARNING\nThis will permanently delete ALL customers, products, and plans.\n\nیہ تمام گاہکوں، پروڈکٹس اور پلانز کو مستقل طور پر ڈیلیٹ کر دے گا۔')) return;
      localStorage.removeItem('aqsat_data');
      this.setState({ customers: [], products: [], plans: [], route: 'dashboard' });
    });
  };
  requireResetPin = (action) => {
    const rp = this.state.settings.resetPin || '';
    if (!rp) { action(); return; }
    this.setState({ pinModal: { open: true, callback: action, error: '', isResetPin: true }, pinModalInput: '' });
  };

  computeLateFee(installment, plan) {
    if (installment.paid) return 0;
    const rules = plan.lateFee || this.state.settings;
    const daysLate = -this.dayDiff(installment.dueDate) - (rules.graceDays || 0);
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
  // Local calendar date as 'YYYY-MM-DD' (matches how schedule dueDates are stored).
  todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // Whole-day difference from today to a 'YYYY-MM-DD' date (negative = overdue, 0 = due today).
  dayDiff(dueStr) {
    if (!dueStr) return 0;
    const t = new Date(this.todayStr() + 'T00:00:00');
    const d = new Date(String(dueStr).slice(0, 10) + 'T00:00:00');
    return Math.round((d - t) / 86400000);
  }
  activeCustomers() { return (this.state.customers || []).filter(c => !c._deleted); }
  activeProducts() { return (this.state.products || []).filter(p => !p._deleted); }
  getAccounts() { return (this.state.settings.accounts || []).filter(a => !a._deleted); }
  accountBalance(accId) {
    const acc = this.getAccounts().find(a => a.id === accId);
    const base = acc ? (parseFloat(acc.balance) || 0) : 0;
    const payments = (this.state.plans || []).reduce((sum, pl) => {
      return sum + (pl.schedule || []).filter(s => s.paid && s.accountId === accId)
        .reduce((a, s) => a + (s.amountPaid || s.amount || 0), 0);
    }, 0);
    return base + payments;
  }

  planStats(pl) {
    const paid = pl.schedule.filter(s => s.paid);
    const paidAmount = paid.reduce((a, s) => a + s.amount, 0) + pl.down;
    const total = pl.schedule.reduce((a, s) => a + s.amount, 0) + pl.down;
    const remaining = total - paidAmount;
    const next = pl.schedule.find(s => !s.paid);
    const overdue = pl.schedule.filter(s => !s.paid && this.dayDiff(s.dueDate) < 0);
    const lateFees = overdue.reduce((a, s) => a + this.computeLateFee(s, pl), 0);
    return { paid, paidAmount, total, remaining, next, overdue, lateFees, progress: total ? paidAmount / total : 0 };
  }

  customerStats(cId) {
    const cPlans = this.state.plans.filter(p => p.customerId === cId).sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    let total = 0, paid = 0, overdue = 0;
    cPlans.forEach(pl => {
      const st = this.planStats(pl);
      total += st.total; paid += st.paidAmount;
      overdue += st.overdue.reduce((a, s) => a + s.amount, 0);
    });
    return { plans: cPlans, total, paid, remaining: total - paid, overdue };
  }

  requirePin = (action) => {
    if (!this.state.savedPin) { action(); return; }
    this.setState({ pinModal: { open: true, callback: action, error: '' }, pinModalInput: '' });
  };
  submitPinModal = () => {
    const pm = this.state.pinModal;
    const expected = pm.isResetPin ? (this.state.settings.resetPin || '') : this.state.savedPin;
    if (this.state.pinModalInput === expected) {
      const cb = pm.callback;
      this.setState({ pinModal: { open: false, callback: null, error: '' }, pinModalInput: '' }, () => { if (cb) cb(); });
    } else {
      this.setState({ pinModal: { ...pm, error: 'Wrong PIN / غلط PIN' }, pinModalInput: '' });
    }
  };
  closePinModal = () => this.setState({ pinModal: { open: false, callback: null, error: '' }, pinModalInput: '' });
  pinModalKey = (k) => {
    if (k === 'del') {
      this.setState(s => ({ pinModalInput: s.pinModalInput.slice(0, -1) }));
    } else if (this.state.pinModalInput.length < 6) {
      this.setState(s => {
        const pm = s.pinModal;
        const expectedLen = pm.isResetPin ? (s.settings.resetPin || '').length : s.savedPin.length;
        const next = s.pinModalInput + k;
        if (next.length === expectedLen) {
          setTimeout(() => this.submitPinModal(), 150);
        }
        return { pinModalInput: next, pinModal: { ...pm, error: '' } };
      });
    }
  };

  go = (route, params = {}) => {
    const guarded = ['settings', 'newplan'];
    if (guarded.includes(route) && this.state.savedPin) {
      this.requirePin(() => { this.setState({ route, routeParams: params }); if (typeof window !== 'undefined') window.scrollTo(0, 0); });
      return;
    }
    this.setState({ route, routeParams: params });
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }

  openPayment = (planId, installmentN) => {
    const pl = this.state.plans.find(p => p.id === planId);
    if (!pl) return;
    const s = pl.schedule.find(x => x.n === installmentN) || pl.schedule.find(x => !x.paid);
    const accs = this.getAccounts();
    this.setState({ paymentModalOpen: true, paymentContext: { planId, installmentN: s ? s.n : null }, paymentAmount: s ? String(s.amount) : '', paymentAccountId: accs.length > 0 ? accs[0].id : '' });
  }
  closePayment = () => this.setState({ paymentModalOpen: false, paymentContext: null });
  confirmPayment = () => {
    const ctx = this.state.paymentContext;
    const today = new Date().toISOString().slice(0, 10);
    const amountCollected = parseFloat(this.state.paymentAmount) || 0;
    const accId = this.state.paymentAccountId;
    const plans = this.state.plans.map(pl => {
      if (pl.id !== ctx.planId) return pl;
      const schedule = pl.schedule.map(s => s.n === ctx.installmentN
        ? { ...s, paid: true, paidDate: today, amountPaid: amountCollected || s.amount, lateFeeCharged: this.computeLateFee(s, pl), accountId: accId || undefined }
        : s);
      const allPaid = schedule.every(s => s.paid);
      return { ...pl, schedule, status: allPaid ? 'completed' : pl.status };
    });
    const pl = plans.find(p => p.id === ctx.planId);
    const customer = this.state.customers.find(c => c.id === pl.customerId);
    const product = this.state.products.find(p => p.id === pl.productId);
    const s = pl.schedule.find(x => x.n === ctx.installmentN);
    const acc = this.getAccounts().find(a => a.id === accId);
    this.setState({ plans, paymentModalOpen: false, receiptOpen: true, receiptData: { receiptNo: 'RCP-' + Date.now().toString().slice(-6), customer, product, plan: pl, installment: s, date: today, amountCollected: amountCollected || s.amount, accountName: acc ? acc.emoji + ' ' + acc.name : '' } });
  }
  closeReceipt = () => this.setState({ receiptOpen: false, receiptData: null });

  createPlan = () => {
    const np = this.state.newPlan;
    if (!np.customerId) { alert('Please select a customer'); return; }
    if (!np.productId) { alert('Please select a product'); return; }
    const product = this.state.products.find(p => p.id === np.productId);
    const total = parseFloat(np.totalPrice) || product.price;
    const down = parseFloat(np.downPayment) || 0;
    const financed = Math.max(0, total - down);
    const directAmt = parseFloat(np.interestAmount);
    const hasDirect = np.interestAmount !== '' && np.interestAmount != null && !isNaN(directAmt);
    const rawPct = Math.min(parseFloat(np.interest) || 0, 100);
    // Direct profit amount is the source of truth when entered; else derive from markup %.
    const profit = Math.max(0, hasDirect ? directAmt : financed * rawPct / 100);
    // Store full-precision percentage so profitOf reproduces the exact profit amount.
    const profitPct = financed > 0 ? (profit / financed) * 100 : 0;
    const total2Pay = Math.max(0, financed + profit);
    const installAmt = parseFloat(np.installmentAmount) || 0;
    const fixedMonths = parseInt(np.customMonths || np.months) || 6;
    const start = new Date(np.startDate || new Date());
    const schedule = [];
    const freqDays = parseInt(np.frequencyDays) || 30;
    if (installAmt > 0) {
      if (total2Pay === 0) { alert('Total payable is 0 — check sale price and down payment'); return; }
      let remaining = total2Pay;
      let i = 0;
      while (remaining > 0.5 && i < 999) {
        const d = new Date(start);
        if (np.frequency === 'days') d.setDate(d.getDate() + i * freqDays);
        else d.setMonth(d.getMonth() + i);
        const amt = Math.min(Math.round(remaining), installAmt);
        schedule.push({ n: i + 1, dueDate: d.toISOString().slice(0, 10), amount: amt, paid: false, paidDate: null });
        remaining -= amt;
        i++;
      }
    } else {
      const equalAmt = fixedMonths > 0 ? Math.round(total2Pay / fixedMonths) : 0;
      for (let i = 0; i < fixedMonths; i++) {
        const d = new Date(start);
        if (np.frequency === 'days') d.setDate(d.getDate() + i * freqDays);
        else d.setMonth(d.getMonth() + i);
        // Last installment absorbs the rounding remainder so the schedule sums to total2Pay exactly.
        const amount = i === fixedMonths - 1 ? Math.round(total2Pay - equalAmt * (fixedMonths - 1)) : equalAmt;
        schedule.push({ n: i + 1, dueDate: d.toISOString().slice(0, 10), amount, paid: false, paidDate: null });
      }
    }
    const months = schedule.length;
    const monthly = installAmt > 0 ? installAmt : (months > 0 ? Math.round(total2Pay / months) : 0);
    const voucherSeq = (this.state.plans.length + 1).toString().padStart(3, '0');
    const voucherNo = 'VCH-' + new Date().getFullYear() + '-' + voucherSeq;
    const plan = { id: 'pl_' + Date.now().toString(36), voucherNo, customerId: np.customerId, productId: np.productId, total, down, months, interest: profitPct, monthly, installmentAmount: installAmt, startDate: start.toISOString().slice(0, 10), status: 'active', schedule, imei: np.imei, chassisNo: np.chassisNo, frequency: np.frequency, frequencyDays: freqDays, lateFee: { graceDays: parseInt(np.graceDays) || 0, lateFeeFlat: parseFloat(np.lateFeeFlat) || 0, lateFeePerDay: parseFloat(np.lateFeePerDay) || 0, maxLateFee: this.state.settings.maxLateFee } };
    this.setState({ plans: [plan, ...this.state.plans], newPlan: { customerId: '', productId: '', totalPrice: '', downPayment: '', months: 6, customMonths: '', installmentAmount: '', interestType: 'percent', interest: 12, interestAmount: '', startDate: new Date().toISOString().slice(0, 10), graceDays: 0, lateFeeFlat: 0, lateFeePerDay: 0, imei: '', chassisNo: '', frequency: 'monthly', frequencyDays: 30 } });
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
    const c = { id: 'c' + (this.state.customers.length + 1) + '_' + Date.now().toString(36).slice(-4), name: nc.name, nameUr: nc.nameUr || nc.name, phone: nc.phone, altPhone: nc.altPhone, cnic: nc.cnic, dob: nc.dob, fatherName: nc.fatherName, occupation: nc.occupation, monthlyIncome: nc.monthlyIncome, address: nc.address, city: nc.city, area: nc.area || nc.city, guarantor: { name: nc.guarantorName, phone: nc.guarantorPhone, cnic: nc.guarantorCnic, relation: nc.guarantorRelation }, notes: nc.notes, documents: nc.documents, joined: new Date().toISOString().slice(0, 10), avatar: initials, color: colors[this.state.customers.length % colors.length] };
    this.setState({ customers: [c, ...this.state.customers], addCustomerOpen: false, newCustomer: { name: '', nameUr: '', phone: '', altPhone: '', cnic: '', dob: '', fatherName: '', occupation: '', monthlyIncome: '', address: '', city: '', area: '', guarantorName: '', guarantorPhone: '', guarantorCnic: '', guarantorRelation: '', notes: '', documents: [] }, addCustomerStep: 1 });
    this.go('customer', { id: c.id });
  };
  updateProduct = (id, patch) => this.setState({ products: this.state.products.map(p => p.id === id ? { ...p, ...patch } : p) });
  updateCustomer = (id, patch) => this.setState({ customers: this.state.customers.map(c => c.id === id ? { ...c, ...patch } : c) });
  openEditCustomer = (id) => {
    const c = this.state.customers.find(x => x.id === id);
    if (!c) return;
    const g = c.guarantor || {};
    this.requirePin(() => this.setState({ editCustomerModal: { open: true, id, step: 1, name: c.name, nameUr: c.nameUr || '', fatherName: c.fatherName || '', dob: c.dob || '', cnic: c.cnic || '', phone: c.phone || '', altPhone: c.altPhone || '', occupation: c.occupation || '', monthlyIncome: c.monthlyIncome || '', address: c.address || '', area: c.area || '', city: c.city || '', notes: c.notes || '', guarantorName: g.name || '', guarantorPhone: g.phone || '', guarantorCnic: g.cnic || '', guarantorRelation: g.relation || '', documents: c.documents || [] } }));
  };
  closeEditCustomer = () => this.setState({ editCustomerModal: { open: false } });
  saveEditCustomer = () => {
    const ec = this.state.editCustomerModal;
    if (!ec.name || !ec.phone) { alert('Please enter name and phone'); return; }
    this.updateCustomer(ec.id, { name: ec.name, nameUr: ec.nameUr || ec.name, fatherName: ec.fatherName, dob: ec.dob, cnic: ec.cnic, phone: ec.phone, altPhone: ec.altPhone, occupation: ec.occupation, monthlyIncome: ec.monthlyIncome, address: ec.address, area: ec.area || ec.city, city: ec.city, notes: ec.notes, guarantor: { name: ec.guarantorName, phone: ec.guarantorPhone, cnic: ec.guarantorCnic, relation: ec.guarantorRelation }, documents: ec.documents || [] });
    this.closeEditCustomer();
  };
  deleteCustomer = (id) => {
    const used = this.state.plans.some(pl => pl.customerId === id && pl.status === 'active');
    if (used) { alert('This customer has active plans and cannot be deleted.\nاس گاہک کے فعال پلانز ہیں اور اسے ڈیلیٹ نہیں کیا جا سکتا۔'); return; }
    if (!confirm('Delete this customer?\nکیا آپ یہ گاہک ڈیلیٹ کرنا چاہتے ہیں؟')) return;
    this.setState({ customers: this.state.customers.map(c => c.id === id ? { ...c, _deleted: true } : c) });
    this.closeEditCustomer();
    this.go('customers');
  };

  waLink = (phone, name, amount, dueDate) => {
    const num = '92' + phone.replace(/\D/g, '').replace(/^0/, '');
    const msg = `Assalam-o-Alaikum ${name}! Aapki qist ${this.fmtPKR(amount)} ki due date ${this.fmtDate(dueDate)} hai. Meherbani farma kar waqt par ada kar dain. Shukriya — ${this.state.settings.businessName || 'Aqsat'}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  waPlanLink = (c, p, pl, next) => {
    const biz = this.state.settings.businessName || 'Aqsat';
    const num = '92' + (c.phone || '').replace(/\D/g, '').replace(/^0/, '');
    const today = new Date();
    const due = new Date(next.dueDate);
    const daysLeft = Math.round((due - today) / 86400000);
    const urgency = daysLeft < 0 ? `(${Math.abs(daysLeft)} دن تاخیر ہو چکی ہے)` : daysLeft === 0 ? '(آج آخری دن ہے)' : `(${daysLeft} دن باقی ہیں)`;
    const msg = `السلام وعلیکم ${c.name}! 🙏\n\n${biz} کی طرف سے یاد دہانی:\n\n📦 ${p ? p.name : 'پروڈکٹ'}\n💳 قسط نمبر: ${next.n} / ${pl.months}\n💰 رقم: ${this.fmtPKR(next.amount)}\n📅 تاریخ: ${this.fmtDate(next.dueDate)} ${urgency}\n🔖 وچر: ${pl.voucherNo || '—'}\n\nبراہ کرم بروقت ادائیگی کریں۔\nشکریہ 🙏`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  exportBackup = () => {
    const data = { customers: this.state.customers, products: this.state.products, plans: this.state.plans, settings: this.state.settings, exportedAt: new Date().toISOString(), version: 1 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aqsat-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  importBackup = (file) => {
    if (!file) return;
    const doImport = () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const d = JSON.parse(e.target.result);
          if (!d.customers || !d.products || !d.plans) { alert('Invalid backup file'); return; }
          if (!window.confirm(`Import backup?\n\nThis will replace:\n• ${d.customers.length} customers\n• ${d.products.length} products\n• ${d.plans.length} plans\n\nCurrent data will be overwritten.`)) return;
          this.setState({ customers: d.customers, products: d.products, plans: d.plans, settings: d.settings || this.state.settings });
          alert('✓ Backup imported successfully!');
        } catch(e) { alert('Could not read file — make sure it is a valid Aqsat backup.'); }
      };
      reader.readAsText(file);
    };
    this.requirePin(doImport);
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
    this.setState({ savedPin: pin, settings: { ...this.state.settings, pin } });
  };

  submitPin = () => {
    if (this.state.enteredPin === this.state.savedPin) {
      this.setState({ pinLocked: false, enteredPin: '', pinLockError: false });
    } else {
      this.setState({ enteredPin: '', pinLockError: true });
    }
  };
  pinLockKey = (k) => {
    if (k === 'del') {
      this.setState(s => ({ enteredPin: s.enteredPin.slice(0, -1), pinLockError: false }));
    } else if (this.state.enteredPin.length < 6) {
      this.setState(s => {
        const next = s.enteredPin + k;
        if (next.length === s.savedPin.length) setTimeout(() => this.submitPin(), 150);
        return { enteredPin: next, pinLockError: false };
      });
    }
  };

  openDeletePlan  = (planId) => this.requirePin(() => this.setState({ deletePlanModal: { open: true, planId, pinInput: '' } }));
  closeDeletePlan = () => this.setState({ deletePlanModal: { open: false, planId: null, pinInput: '' } });
  confirmDeletePlan = () => {
    const { planId } = this.state.deletePlanModal;
    this.setState({ plans: this.state.plans.filter(p => p.id !== planId), deletePlanModal: { open: false, planId: null, pinInput: '' } });
  };

  updatePlanLateFee = (planId, key, value) => {
    this.setState({ plans: this.state.plans.map(pl =>
      pl.id !== planId ? pl : { ...pl, lateFee: { ...(pl.lateFee || {}), [key]: value } }
    )});
  };

  toggleLateFeePanel = (planId) => {
    if (this.state.lateFeePanel === planId) { this.setState({ lateFeePanel: null }); return; }
    this.requirePin(() => this.setState({ lateFeePanel: planId }));
  };

  openEditPlan = (planId) => {
    const pl = this.state.plans.find(p => p.id === planId);
    if (!pl) return;
    const financed0 = Math.max(0, (pl.total || 0) - (pl.down || 0));
    const initAmt = String(Math.round(financed0 * (pl.interest || 0) / 100));
    const firstUnpaid = pl.schedule.find(s => !s.paid);
    const initInst = String(firstUnpaid ? firstUnpaid.amount : (pl.installmentAmount || pl.monthly || 0));
    const doOpen = () => this.setState({ editPlanModal: { open: true, planId, pinInput: '', pinConfirmed: true, draftCustomerId: pl.customerId, draftProductId: pl.productId, draftTotal: String(pl.total), draftDown: String(pl.down), draftInterest: String(pl.interest || 0), draftInterestAmount: initAmt, draftInstallmentAmount: initInst, draftStartDate: pl.startDate || '', draftSchedule: pl.schedule.map(s => ({ ...s })), draftImei: pl.imei || '', draftChassisNo: pl.chassisNo || '', draftNotes: pl.notes || '' } });
    this.requirePin(doOpen);
  };
  closeEditPlan = () => this.setState({ editPlanModal: { open: false, planId: null, pinInput: '', pinConfirmed: true, draftCustomerId: '', draftProductId: '', draftTotal: '', draftDown: '', draftInterest: '', draftInterestAmount: '', draftInstallmentAmount: '', draftStartDate: '', draftSchedule: [], draftImei: '', draftChassisNo: '', draftNotes: '' } });
  // Rebuilds the unpaid part of a schedule so it sums to total2Pay, keeping paid
  // installments untouched. With a fixed installment amount it produces clean
  // "amt × N + remainder" installments; otherwise it splits equally.
  _rebuildSchedule(draftSchedule, total2Pay, installAmt, freq, freqDays, startBase) {
    const paidList = draftSchedule.filter(s => s.paid);
    const oldUnpaid = draftSchedule.filter(s => !s.paid);
    const paidSum = paidList.reduce((a, s) => a + s.amount, 0);
    const remain = Math.max(0, Math.round(total2Pay - paidSum));
    const stepDate = (idx) => {
      const d = new Date(startBase);
      if (freq === 'days') d.setDate(d.getDate() + idx * freqDays);
      else d.setMonth(d.getMonth() + idx);
      return d.toISOString().slice(0, 10);
    };
    let unpaidAmounts = [];
    if (installAmt > 0 && remain > 0) {
      let r = remain, guard = 0;
      while (r > 0.5 && guard < 600) { const amt = Math.min(installAmt, Math.round(r)); unpaidAmounts.push(amt); r -= amt; guard++; }
    } else if (oldUnpaid.length > 0 && remain > 0) {
      const per = Math.round(remain / oldUnpaid.length);
      unpaidAmounts = oldUnpaid.map((_, i) => i === oldUnpaid.length - 1 ? Math.round(remain - per * (oldUnpaid.length - 1)) : per);
    }
    const schedule = paidList.map((s, i) => ({ ...s, n: i + 1 }));
    unpaidAmounts.forEach((amt, j) => {
      const globalIdx = paidList.length + j;
      const dueDate = j < oldUnpaid.length ? oldUnpaid[j].dueDate : stepDate(globalIdx);
      schedule.push({ n: globalIdx + 1, dueDate, amount: amt, paid: false, paidDate: null });
    });
    return schedule;
  }
  _doSaveEditPlan = () => {
    const em = this.state.editPlanModal;
    const plans = this.state.plans.map(pl => {
      if (pl.id !== em.planId) return pl;
      const total = parseFloat(em.draftTotal) || pl.total;
      const down = parseFloat(em.draftDown) || 0;
      const financed = Math.max(0, total - down);
      // Direct profit amount is the source of truth; interest % is derived at full precision.
      const directAmt = parseFloat(em.draftInterestAmount);
      const hasDirect = em.draftInterestAmount !== '' && em.draftInterestAmount != null && !isNaN(directAmt);
      const profit = Math.max(0, hasDirect ? directAmt : financed * Math.min(parseFloat(em.draftInterest) || 0, 100) / 100);
      const interest = financed > 0 ? (profit / financed) * 100 : 0;
      const total2Pay = financed + profit;
      const installAmt = parseFloat(em.draftInstallmentAmount) || 0;
      const freq = pl.frequency || 'monthly';
      const freqDays = parseInt(pl.frequencyDays) || 30;
      const startBase = em.draftStartDate || pl.startDate || new Date().toISOString().slice(0, 10);
      const schedule = this._rebuildSchedule(em.draftSchedule, total2Pay, installAmt, freq, freqDays, startBase);
      const allPaid = schedule.length > 0 && schedule.every(s => s.paid);
      const months = schedule.length;
      const firstUnpaid = schedule.find(s => !s.paid);
      const monthly = installAmt > 0 ? installAmt : (firstUnpaid ? firstUnpaid.amount : (months > 0 ? Math.round(total2Pay / months) : 0));
      return { ...pl, customerId: em.draftCustomerId || pl.customerId, productId: em.draftProductId || pl.productId, total, down, interest, monthly, installmentAmount: installAmt, startDate: em.draftStartDate || pl.startDate, months, schedule, imei: em.draftImei, chassisNo: em.draftChassisNo, notes: em.draftNotes, status: allPaid ? 'completed' : 'active' };
    });
    this.setState({ plans, editPlanModal: { open: false, planId: null, pinInput: '', pinConfirmed: true, draftCustomerId: '', draftProductId: '', draftTotal: '', draftDown: '', draftInterest: '', draftInterestAmount: '', draftStartDate: '', draftSchedule: [], draftImei: '', draftChassisNo: '', draftNotes: '' } });
  };
  submitEditPlanPin = () => {
    const { pinInput } = this.state.editPlanModal;
    if (pinInput === this.state.savedPin) {
      this._doSaveEditPlan();
    } else {
      this.setState({ editPlanModal: { ...this.state.editPlanModal, pinInput: '' } });
      alert('غلط PIN — Wrong PIN');
    }
  };
  confirmEditPlan = () => {
    if (this.state.savedPin) {
      this.setState({ editPlanModal: { ...this.state.editPlanModal, pinConfirmed: false, pinInput: '' } });
    } else {
      this._doSaveEditPlan();
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
  openEditProduct = (id) => {
    const p = this.state.products.find(x => x.id === id);
    if (!p) return;
    this.requirePin(() => this.setState({ editProductModal: { open: true, id, name: p.name, nameUr: p.nameUr || '', category: p.category, price: String(p.price), stock: String(p.stock || 0), emoji: p.emoji || '📦' } }));
  };
  closeEditProduct = () => this.setState({ editProductModal: { open: false, id: null, name: '', nameUr: '', category: 'Mobile', price: '', stock: '', emoji: '📦' } });
  saveEditProduct = () => {
    const ep = this.state.editProductModal;
    if (!ep.name || !ep.price) { alert('Please enter product name and price'); return; }
    this.updateProduct(ep.id, { name: ep.name, nameUr: ep.nameUr || ep.name, category: ep.category, price: parseFloat(ep.price) || 0, stock: parseInt(ep.stock) || 0, emoji: ep.emoji || '📦' });
    this.closeEditProduct();
  };
  deleteProduct = (id) => {
    const used = this.state.plans.some(pl => pl.productId === id && pl.status === 'active');
    if (used) { alert('This product is used in active plans and cannot be deleted.\nیہ پروڈکٹ فعال پلانز میں استعمال ہو رہی ہے۔'); return; }
    if (!confirm('Delete this product?\nکیا آپ یہ پروڈکٹ ڈیلیٹ کرنا چاہتے ہیں؟')) return;
    this.setState({ products: this.state.products.map(p => p.id === id ? { ...p, _deleted: true } : p) });
    this.closeEditProduct();
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
        const diff = this.dayDiff(s.dueDate);
        if (!s.paid && diff === 0) { cashToday += s.amount; dueTodayList.push({ pl, s, c, p, diff }); }
        if (!s.paid && diff > 0 && diff <= 7) { upcomingWeek += s.amount; upcomingList.push({ pl, s, c, p, diff }); }
        if (!s.paid && diff < 0) { overdueTotal += s.amount; overdueCount++; overdueList.push({ pl, s, c, p, diff }); }
        if (s.paid && s.paidDate) {
          const pDiff = -this.dayDiff(s.paidDate);
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
        h('div', { style: { fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' } }, new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
        h('div', { style: { fontSize: 12, color: '#7a7663' } }, '· Assalam-o-Alaikum' + (this.state.settings.ownerName ? ', ' + this.state.settings.ownerName.split(' ')[0] : '')),
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
    const customers = this.activeCustomers();
    const rows = customers
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.nameUr.includes(q) || c.phone.includes(q) || (c.area || '').toLowerCase().includes(q))
      .map(c => ({ c, st: this.customerStats(c.id) }));
    return h('div', { className: 'screen' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 } },
        h('div', {}, h('div', { style: { fontSize: 14, color: '#7a7663' } }, customers.length + ' customers')),
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
            h('button', { onClick: () => this.openEditCustomer(c.id), style: { background: '#f4f1e6', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 } }, '✎ Edit'),
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
          pl.voucherNo ? h('div', { className: 'mono', style: { fontSize: 11, color: '#7a7663', marginTop: 3, fontWeight: 600 } }, pl.voucherNo) : null,
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
          const isOverdueS = !s.paid && this.dayDiff(s.dueDate) < 0;
          const isNext = st.next && st.next.n === s.n;
          const bg = s.paid ? '#eaf5ee' : isOverdueS ? '#fdecea' : isNext ? '#fdf2d9' : '#fdfcf8';
          const col = s.paid ? '#0f6b4b' : isOverdueS ? '#a4362b' : isNext ? '#a26a10' : '#7a7663';
          return h('button', { key: s.n, onClick: () => !s.paid && this.openPayment(pl.id, s.n), style: { background: bg, border: '1px solid ' + (isNext ? '#f0c977' : '#ece8dc'), borderRadius: 10, padding: '8px 6px', textAlign: 'center', cursor: s.paid ? 'default' : 'pointer' } },
            h('div', { style: { fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase' } }, s.paid ? '✓ Paid' : isOverdueS ? 'Late' : '#' + s.n),
            h('div', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: '#1a2b1f', marginTop: 2 } }, Math.round(s.amount / 1000) + 'k'),
            h('div', { style: { fontSize: 9, color: col, marginTop: 1 } }, new Date(s.dueDate).toLocaleDateString('en', { day: '2-digit', month: 'short' })),
          );
        }),
      ),
      h('div', { style: { marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
        pl.status !== 'completed' && st.next
          ? h('div', { style: { fontSize: 13, color: '#5a6a5f' } }, 'Next: ' + this.fmtDate(st.next.dueDate) + ' · ', h('span', { className: 'mono', style: { fontWeight: 700 } }, this.fmtPKR(st.next.amount)))
          : h('div', {}),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          h('button', { onClick: () => this.openEditPlan(pl.id), style: { background: '#eaf5ee', color: '#0f6b4b', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600 } }, '✎'),
          h('button', { onClick: () => this.openDeletePlan(pl.id), style: { background: '#fdecea', color: '#a4362b', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600 } }, '🗑'),
          h('button', { onClick: () => this.toggleLateFeePanel(pl.id), title: 'Late fee settings', style: { background: this.state.lateFeePanel === pl.id ? '#fef3c7' : '#f4f1e6', color: '#a26a10', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600 } }, '⚙'),
          pl.status !== 'completed' && st.next && c.phone
            ? h('a', { href: this.waPlanLink(c, p, pl, st.next), target: '_blank', rel: 'noopener', style: { background: '#dcfce7', color: '#15803d', padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' } }, '💬')
            : null,
          pl.status !== 'completed' && st.next
            ? h('button', { onClick: () => this.openPayment(pl.id, st.next.n), style: { background: '#0f6b4b', color: 'white', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 } }, 'Record Payment →')
            : null,
        ),
      ),
      this.state.lateFeePanel === pl.id ? (() => {
        const lf = pl.lateFee || this.state.settings;
        const inp = { type: 'number', style: { width: '100%', border: '1px solid #f0e0b0', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: '#fffdf5', outline: 'none', boxSizing: 'border-box' } };
        const fld = (label, ur, key, val) => h('div', {},
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a5a10', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 } }, label, ' ', h('span', { className: 'ur', style: { fontWeight: 400, textTransform: 'none' } }, ur)),
          h('input', { ...inp, value: val, onChange: e => this.updatePlanLateFee(pl.id, key, parseFloat(e.target.value) || 0) }),
        );
        return h('div', { style: { marginTop: 14, padding: '14px 16px', background: '#fffdf0', border: '1px solid #f0e0b0', borderRadius: 12 } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: '#7a5a10', marginBottom: 10, display: 'flex', justifyContent: 'space-between' } },
            h('span', {}, 'Late Fee Settings ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#a26a10' } }, 'جرمانہ')),
            h('span', { style: { fontSize: 11, color: '#a26a10', fontWeight: 400 } }, 'Edits save instantly'),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 } },
            fld('Grace Days', 'مہلت', 'graceDays', lf.graceDays || 0),
            fld('Flat Fee (Rs)', 'مقررہ', 'lateFeeFlat', lf.lateFeeFlat || 0),
            fld('Per-Day Fee (Rs)', 'یومیہ', 'lateFeePerDay', lf.lateFeePerDay || 0),
            fld('Max Fee (Rs)', 'زیادہ سے زیادہ', 'maxLateFee', lf.maxLateFee || 0),
          ),
        );
      })() : null,
    );
  }

  renderProducts() {
    const h = this.h;
    return h('div', { className: 'screen' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 } },
        h('div', { style: { fontSize: 13, color: '#7a7663' } }, this.activeProducts().length + ' products'),
        h('button', { onClick: this.openAddProduct, style: { background: '#0f6b4b', color: 'white', padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13 } }, '＋ Add Product'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 } },
        this.activeProducts().map(p => {
          const sold = this.state.plans.filter(pl => pl.productId === p.id).length;
          return h('div', { key: p.id, style: { background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 12, padding: 16 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
              h('div', { style: { fontSize: 34, marginBottom: 8 } }, p.emoji),
              h('button', { onClick: () => this.openEditProduct(p.id), style: { width: 32, height: 32, borderRadius: 8, background: '#f4f1e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 } }, '✎'),
            ),
            h('div', { style: { fontSize: 10, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 } }, p.category),
            h('div', { style: { fontSize: 15, fontWeight: 700, marginTop: 2 } }, p.name),
            h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, p.nameUr),
            h('div', { className: 'mono', style: { fontSize: 18, fontWeight: 700, color: '#0f6b4b', marginTop: 10 } }, this.fmtPKR(p.price)),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f2eee2', fontSize: 11 } },
              h('span', { style: { color: '#7a7663' } }, 'Stock: ', h('span', { className: 'mono', style: { fontWeight: 700, color: p.stock < 5 ? '#a4362b' : '#1a2b1f' } }, p.stock)),
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
    let plans = this.state.plans.slice().sort((a, b) => (b.id || '').localeCompare(a.id || ''));
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
    const profit = financed * Math.min(parseFloat(np.interest) || 0, 100) / 100;
    const installAmt = parseFloat(np.installmentAmount) || 0;
    const total2Pay = Math.max(0, financed + profit);
    let fullInst = 0, remainder = 0, months, monthly;
    if (installAmt > 0 && total2Pay > 0) {
      fullInst = Math.floor(total2Pay / installAmt);
      remainder = Math.round(total2Pay % installAmt);
      months = remainder > 0 ? fullInst + 1 : fullInst;
      monthly = installAmt;
    } else {
      months = parseInt(np.customMonths || np.months) || 6;
      monthly = months > 0 ? Math.round(total2Pay / months) : 0;
    }
    const inpStyle = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    const field = (label, ur, node) => h('div', {},
      h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, label, ' ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, ur)),
      node,
    );
    const isMobile = product && ['Mobile', 'Laptop'].includes(product.category);
    const isBike = product && product.category === 'Motorcycle';
    const freqLabel = np.frequency === 'days' ? (np.frequencyDays + '-day') : 'Monthly';
    return h('div', { className: 'screen', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 } },
      this.card([
        h('div', { style: { fontSize: 18, fontWeight: 700, marginBottom: 4 } }, 'Create Installment Plan'),
        h('div', { style: { fontSize: 13, color: '#7a7663', marginBottom: 20 } }, 'Enter the deal terms. Preview updates live on the right.'),
        h('div', { style: { display: 'grid', gap: 16 } },
          field('Customer', 'گاہک', h('select', { value: np.customerId, onChange: e => set('customerId', e.target.value), style: inpStyle }, h('option', { value: '' }, 'Select customer…'), this.activeCustomers().map(c => h('option', { key: c.id, value: c.id }, c.name + ' · ' + c.phone)))),
          field('Product', 'مصنوعات', h('select', { value: np.productId, onChange: e => { const p = this.state.products.find(x => x.id === e.target.value); this.setState({ newPlan: { ...np, productId: e.target.value, totalPrice: p ? String(p.price) : '' } }); }, style: inpStyle }, h('option', { value: '' }, 'Select product…'), this.activeProducts().map(p => h('option', { key: p.id, value: p.id }, p.name + ' — ' + this.fmtPKR(p.price))))),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            field('Sale Price (Rs)', 'فروخت قیمت', h('input', { type: 'number', value: np.totalPrice, onChange: e => set('totalPrice', e.target.value), placeholder: 'e.g. 165000', style: inpStyle })),
            field('Down Payment (Rs)', 'ایڈوانس', h('input', { type: 'number', value: np.downPayment, onChange: e => set('downPayment', e.target.value), placeholder: '0', style: inpStyle })),
          ),
          (() => {
            const t = parseFloat(np.totalPrice) || 0;
            const d = parseFloat(np.downPayment) || 0;
            const fin = Math.max(0, t - d);
            return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
              field('Profit Rs', 'منافع رقم', h('input', { type: 'number', min: 0, value: np.interestAmount, onChange: e => { const raw = e.target.value; const amt = parseFloat(raw) || 0; const pct = fin > 0 ? (amt / fin) * 100 : 0; this.setState({ newPlan: { ...np, interestAmount: raw, interest: fin > 0 ? String(Math.round(pct * 100) / 100) : np.interest } }); }, placeholder: 'e.g. 5000', style: inpStyle })),
              field('Markup %', 'منافع %', h('input', { type: 'number', max: 100, min: 0, value: np.interest, onChange: e => { const raw = e.target.value; const pct = Math.min(parseFloat(raw) || 0, 100); const amt = Math.round(fin * pct / 100); this.setState({ newPlan: { ...np, interest: (parseFloat(raw) > 100 ? '100' : raw), interestAmount: fin > 0 ? String(amt) : np.interestAmount } }); }, placeholder: '12', style: inpStyle })),
            );
          })(),
          field('Installments', 'اقساط کی تعداد',
            h('div', { style: { display: 'grid', gap: 8 } },
              h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
                [3,6,9,12,18,24].map(m => h('button', { key: m, type: 'button', onClick: () => { set('months', m); set('customMonths', ''); }, style: { padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: !np.customMonths && np.months === m ? '#0f6b4b' : '#fdfcf8', color: !np.customMonths && np.months === m ? 'white' : '#3a4a3f', border: '1px solid ' + (!np.customMonths && np.months === m ? '#0f6b4b' : '#ece8dc') } }, m)),
                h('input', { type: 'number', value: np.customMonths, onChange: e => set('customMonths', e.target.value), placeholder: 'Custom…', style: { ...inpStyle, width: 80, padding: '9px 10px' } }),
              ),
              h('div', { style: { display: 'flex', gap: 6 } },
                h('button', { type: 'button', onClick: () => set('frequency', 'monthly'), style: { flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: np.frequency === 'monthly' ? '#1a2b1f' : '#fdfcf8', color: np.frequency === 'monthly' ? 'white' : '#3a4a3f', border: '1px solid ' + (np.frequency === 'monthly' ? '#1a2b1f' : '#ece8dc') } }, 'Monthly'),
                h('button', { type: 'button', onClick: () => set('frequency', 'days'), style: { flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: np.frequency === 'days' ? '#1a2b1f' : '#fdfcf8', color: np.frequency === 'days' ? 'white' : '#3a4a3f', border: '1px solid ' + (np.frequency === 'days' ? '#1a2b1f' : '#ece8dc') } }, 'Every X days'),
                np.frequency === 'days' ? h('input', { type: 'number', value: np.frequencyDays, onChange: e => set('frequencyDays', e.target.value), placeholder: '30', style: { ...inpStyle, width: 70, padding: '7px 8px' } }) : null,
              ),
            ),
          ),
          field('Per-Installment Amount', 'قسط کی رقم',
            h('div', { style: { display: 'grid', gap: 8 } },
              h('input', { type: 'number', value: np.installmentAmount, onChange: e => set('installmentAmount', e.target.value), placeholder: 'e.g. 8000  (auto-calculates installments)', style: inpStyle }),
              installAmt > 0 && total2Pay > 0 ? h('div', { style: { background: '#eaf5ee', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0f6b4b', fontWeight: 600 } },
                remainder > 0
                  ? fullInst + ' × ' + this.fmtPKR(installAmt) + ' + 1 × ' + this.fmtPKR(remainder) + ' = ' + months + ' اقساط'
                  : fullInst + ' × ' + this.fmtPKR(installAmt) + ' = ' + months + ' اقساط'
              ) : h('div', { style: { fontSize: 11, color: '#7a7663' } }, 'Leave empty to use the installment count above'),
            ),
          ),
          field('Start Date', 'آغاز', h('input', { type: 'date', value: np.startDate, onChange: e => set('startDate', e.target.value), style: inpStyle })),
          isMobile ? field('IMEI Number', 'آئی ایم ای آئی', h('input', { value: np.imei, onChange: e => set('imei', e.target.value), placeholder: '15-digit IMEI', style: { ...inpStyle, fontFamily: 'JetBrains Mono, monospace' } })) : null,
          isBike ? field('Chassis Number', 'چیسس نمبر', h('input', { value: np.chassisNo, onChange: e => set('chassisNo', e.target.value), placeholder: 'e.g. ABC1234567890', style: { ...inpStyle, fontFamily: 'JetBrains Mono, monospace' } })) : null,
        ),
      ]),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', { style: { background: 'linear-gradient(160deg,#0f6b4b,#14a374)', color: 'white', borderRadius: 16, padding: 20 } },
          h('div', { style: { fontSize: 12, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 } }, freqLabel + ' Installment'),
          h('div', { className: 'ur', style: { fontSize: 13, opacity: 0.85 } }, 'قسط'),
          h('div', { className: 'mono', style: { fontSize: 34, fontWeight: 800, marginTop: 12, letterSpacing: '-0.02em' } }, this.fmtPKR(monthly)),
          h('div', { style: { fontSize: 12, opacity: 0.85, marginTop: 4 } }, months + ' installments · ' + freqLabel.toLowerCase()),
        ),
        h('div', { style: { background: '#fdfcf8', border: '1px solid #ece8dc', borderRadius: 16, padding: 20 } },
          [['Cash price', total], ['Down payment', down, '#0f6b4b'], ['Financed', financed], ['Profit', profit, '#a26a10'], ['Total payable', financed + profit + down]].map(([lbl, val, col], i) =>
            h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? '1px solid #f2eee2' : 'none', fontSize: 13 } },
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
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const totalReceived = this.state.plans.reduce((a, p) => a + this.planStats(p).paidAmount, 0);
    const totalOut = this.state.plans.reduce((a, p) => a + this.planStats(p).remaining, 0);

    const profitOf = (pl) => {
      const financed = Math.max(0, pl.total - pl.down);
      const pct = Math.min(Math.max(pl.interest || 0, 0), 100);
      return financed * pct / 100;
    };
    const totalProfit = this.state.plans.reduce((a, pl) => a + profitOf(pl), 0);
    const earnedProfit = this.state.plans.reduce((a, pl) => {
      const profit = profitOf(pl);
      const scheduleTotal = pl.schedule.reduce((s, x) => s + x.amount, 0) || 1;
      const paidTotal = pl.schedule.filter(s => s.paid).reduce((s, x) => s + x.amount, 0);
      return a + profit * (paidTotal / scheduleTotal);
    }, 0);

    const monthlyData = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(curYear, curMonth - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      monthlyData[key] = { label, collected: 0, profitEarned: 0, plans: 0, down: 0 };
    }
    this.state.plans.forEach(pl => {
      const idPart = (pl.id || '').replace(/^pl_/, '');
      const createdMs = parseInt(idPart, 36);
      const createdDate = isFinite(createdMs) && createdMs > 0 ? new Date(createdMs) : (pl.startDate ? new Date(pl.startDate) : null);
      const createdKey = createdDate ? createdDate.getFullYear() + '-' + String(createdDate.getMonth() + 1).padStart(2, '0') : '';
      if (monthlyData[createdKey]) {
        monthlyData[createdKey].plans++;
        monthlyData[createdKey].down += pl.down || 0;
      }
      const profit = profitOf(pl);
      const scheduleTotal = pl.schedule.reduce((s, x) => s + x.amount, 0) || 1;
      const profitPerRupee = profit / scheduleTotal;
      pl.schedule.forEach(s => {
        if (s.paid && s.paidDate) {
          const mKey = s.paidDate.slice(0, 7);
          if (monthlyData[mKey]) {
            monthlyData[mKey].collected += s.amount;
            monthlyData[mKey].profitEarned += s.amount * profitPerRupee;
          }
        }
      });
    });
    const monthKeys = Object.keys(monthlyData);
    const maxCollected = Math.max(...monthKeys.map(k => monthlyData[k].collected + monthlyData[k].down), 1);
    const curKey = curYear + '-' + String(curMonth + 1).padStart(2, '0');

    const byCat = {};
    this.state.plans.forEach(pl => { const p = this.state.products.find(x => x.id === pl.productId); if (p) byCat[p.category] = (byCat[p.category] || 0) + this.planStats(pl).total; });
    const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const catTotal = catEntries.reduce((a, [, v]) => a + v, 0) || 1;
    const catColors = ['#0f6b4b','#14a374','#3ba777','#a26a10','#d4a94a','#a4362b','#6b4a1a','#0a5138'];

    const tblHead = { fontSize: 11, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #ece8dc' };
    const tblCell = { fontSize: 13, fontWeight: 600, padding: '10px 8px', textAlign: 'right', borderBottom: '1px solid #f2eee2' };

    return h('div', { className: 'screen' },
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 } },
        h('button', { onClick: this.exportCSV, style: { background: '#f4f1e6', color: '#3a4a3f', padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 } }, '⬇ Export CSV'),
      ),

      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 24 } },
        [['Collected', this.fmtPKR(totalReceived), '#0f6b4b', 'کل وصولی'],
         ['Outstanding', this.fmtPKR(totalOut), '#1a2b1f', 'باقی رقم'],
         ['Profit (expected)', this.fmtPKR(totalProfit), '#a26a10', 'متوقع منافع'],
         ['Profit (earned)', this.fmtPKR(earnedProfit), '#0f6b4b', 'حاصل شدہ منافع']].map(([l, v, c, ur], i) =>
          h('div', { key: i, style: { background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 16, padding: 20 } },
            h('div', { style: { fontSize: 11, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 } }, l),
            h('div', { className: 'ur', style: { fontSize: 10, color: '#7a7663' } }, ur),
            h('div', { className: 'mono', style: { fontSize: 26, fontWeight: 700, color: c, marginTop: 6, letterSpacing: '-0.02em' } }, v),
          )),
      ),

      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20 } },
        this.card([
          this.sectionHeader('Monthly Income', 'ماہانہ آمدنی'),
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', height: 200, paddingTop: 16 } },
            monthKeys.map(k => {
              const md = monthlyData[k];
              const isCur = k === curKey;
              const total = md.collected + md.down;
              return h('div', { key: k, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
                h('div', { className: 'mono', style: { fontSize: 10, color: '#5a6a5f', fontWeight: 600 } }, total >= 1000 ? Math.round(total / 1000) + 'k' : total),
                h('div', { style: { width: '100%', maxWidth: 36, background: isCur ? 'linear-gradient(180deg,#14a374,#0f6b4b)' : '#d9d5c7', borderRadius: '6px 6px 0 0', height: (total / maxCollected * 140) + 'px', minHeight: 4, transition: 'height .4s' } }),
                h('div', { style: { fontSize: 11, color: isCur ? '#0f6b4b' : '#7a7663', fontWeight: isCur ? 700 : 500 } }, md.label),
              );
            }),
          ),
        ]),
        this.card([
          this.sectionHeader('Sales by category', 'زمرہ جات'),
          h('div', { style: { display: 'flex', gap: 20, alignItems: 'center' } },
            h('svg', { width: 130, height: 130, viewBox: '0 0 42 42', style: { transform: 'rotate(-90deg)', flexShrink: 0 } },
              (() => { let offset = 0; return catEntries.map(([k, v], i) => { const pct = v / catTotal * 100; const el = h('circle', { key: k, cx: 21, cy: 21, r: 15.915, fill: 'transparent', stroke: catColors[i % catColors.length], strokeWidth: 6, strokeDasharray: pct + ' ' + (100 - pct), strokeDashoffset: -offset }); offset += pct; return el; }); })(),
            ),
            h('div', { style: { flex: 1 } },
              catEntries.map(([k, v], i) => h('div', { key: k, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13 } },
                h('div', { style: { width: 12, height: 12, borderRadius: 3, background: catColors[i % catColors.length] } }),
                h('div', { style: { flex: 1 } }, k),
                h('div', { className: 'mono', style: { fontWeight: 700 } }, this.fmtPKR(v)),
              )),
            ),
          ),
        ]),
      ),

      h('div', { style: { height: 20 } }),
      this.card([
        this.sectionHeader('Monthly Breakdown', 'ماہانہ تفصیلات'),
        h('div', { style: { overflowX: 'auto' } },
          h('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 500 } },
            h('thead', {},
              h('tr', {},
                h('th', { style: { ...tblHead, textAlign: 'left' } }, 'Month'),
                h('th', { style: tblHead }, 'Installments'),
                h('th', { style: tblHead }, 'Down Pmts'),
                h('th', { style: tblHead }, 'Profit Earned'),
                h('th', { style: tblHead }, 'New Plans'),
              ),
            ),
            h('tbody', {},
              monthKeys.slice().reverse().map(k => {
                const md = monthlyData[k];
                const isCur = k === curKey;
                return h('tr', { key: k, style: isCur ? { background: '#fdfcf8' } : {} },
                  h('td', { style: { ...tblCell, textAlign: 'left', fontWeight: isCur ? 700 : 600, color: isCur ? '#0f6b4b' : '#1a2b1f' } }, md.label, isCur ? ' ●' : ''),
                  h('td', { className: 'mono', style: { ...tblCell, color: '#0f6b4b' } }, this.fmtPKR(md.collected)),
                  h('td', { className: 'mono', style: tblCell }, this.fmtPKR(md.down)),
                  h('td', { className: 'mono', style: { ...tblCell, color: '#a26a10' } }, this.fmtPKR(Math.round(md.profitEarned))),
                  h('td', { className: 'mono', style: tblCell }, md.plans),
                );
              }),
            ),
          ),
        ),
      ]),
    );
  }

  renderReminders() {
    const h = this.h;
    let overdueList = [];
    this.state.plans.forEach(pl => {
      const c = this.state.customers.find(x => x.id === pl.customerId);
      const p = this.state.products.find(x => x.id === pl.productId);
      pl.schedule.forEach(s => { const diff = this.dayDiff(s.dueDate); if (!s.paid && diff < 0) overdueList.push({ pl, s, c, p, diff }); });
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
        row('Business name', 'کاروبار کا نام', h('input', { value: st.businessName || '', onChange: e => setS('businessName', e.target.value), placeholder: 'e.g. Sadar Electronics', style: inp })),
        row('Owner name', 'مالک', h('input', { value: st.ownerName || '', onChange: e => setS('ownerName', e.target.value), placeholder: 'e.g. Rehan Malik', style: inp })),
        row('City', 'شہر', h('input', { value: st.city || '', onChange: e => setS('city', e.target.value), placeholder: 'e.g. Lahore', style: inp })),
        row('Currency', 'کرنسی', 'Pakistani Rupee (Rs)'),
      ]),
      h('div', { style: { height: 16 } }),
      this.card([
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
          h('div', {},
            h('div', { style: { fontSize: 16, fontWeight: 700 } }, 'Payment Accounts'),
            h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, 'ادائیگی اکاؤنٹس'),
          ),
          h('button', { type: 'button', onClick: () => this.setState({ addAccountOpen: !this.state.addAccountOpen, newAccount: { name: '', nameUr: '', emoji: '💰', balance: '' } }), style: { padding: '6px 12px', borderRadius: 8, background: '#eaf5ee', color: '#0f6b4b', fontWeight: 600, fontSize: 12 } }, '+ Add'),
        ),
        h('div', { style: { fontSize: 12, color: '#7a7663', marginBottom: 8 } }, 'Accounts where you receive payments. Base balance is your opening amount.'),
        ...this.getAccounts().map(acc =>
          h('div', { key: acc.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '1px solid #f2eee2' } },
            h('div', { style: { fontSize: 20, width: 36, textAlign: 'center', flexShrink: 0 } }, acc.emoji),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 600, fontSize: 14 } }, acc.name),
              acc.nameUr ? h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, acc.nameUr) : null,
              h('div', { className: 'mono', style: { fontSize: 12, color: '#0f6b4b', fontWeight: 600, marginTop: 2 } }, 'Balance: ' + this.fmtPKR(this.accountBalance(acc.id))),
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } },
              h('span', { style: { fontSize: 11, color: '#7a7663' } }, 'Base:'),
              h('input', { type: 'number', value: acc.balance || '', onChange: e => { const val = e.target.value; this.setState({ settings: { ...this.state.settings, accounts: (this.state.settings.accounts || []).map(a => a.id === acc.id ? { ...a, balance: val === '' ? 0 : parseFloat(val) || 0 } : a) } }); }, placeholder: '0', style: { ...inp, width: 80 } }),
              h('button', { type: 'button', onClick: () => { if (!confirm('Delete account "' + acc.name + '"?')) return; this.setState({ settings: { ...this.state.settings, accounts: (this.state.settings.accounts || []).map(a => a.id === acc.id ? { ...a, _deleted: true } : a) } }); }, style: { padding: '4px 8px', borderRadius: 6, background: '#fdecea', color: '#a4362b', fontSize: 12, fontWeight: 600 } }, '✕'),
            ),
          ),
        ),
        this.state.addAccountOpen ? h('div', { style: { borderTop: '1px solid #f2eee2', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { style: { display: 'flex', gap: 8 } },
            h('input', { value: this.state.newAccount.emoji, onChange: e => this.setState({ newAccount: { ...this.state.newAccount, emoji: e.target.value } }), placeholder: '💰', style: { ...inp, width: 44, textAlign: 'center', fontSize: 18 } }),
            h('input', { value: this.state.newAccount.name, onChange: e => this.setState({ newAccount: { ...this.state.newAccount, name: e.target.value } }), placeholder: 'Account name', style: { ...inp, flex: 1 } }),
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('input', { value: this.state.newAccount.nameUr, onChange: e => this.setState({ newAccount: { ...this.state.newAccount, nameUr: e.target.value } }), placeholder: 'اردو نام (optional)', className: 'ur', style: { ...inp, flex: 1 } }),
            h('input', { type: 'number', value: this.state.newAccount.balance, onChange: e => this.setState({ newAccount: { ...this.state.newAccount, balance: e.target.value } }), placeholder: 'Base balance', style: { ...inp, width: 100 } }),
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { type: 'button', onClick: () => this.setState({ addAccountOpen: false }), style: { flex: 1, padding: '8px 12px', borderRadius: 8, background: '#f4f1e6', fontWeight: 600, fontSize: 12 } }, 'Cancel'),
            h('button', { type: 'button', onClick: () => {
              const na = this.state.newAccount;
              if (!na.name.trim()) { alert('Account name is required'); return; }
              const id = 'acc_' + Date.now().toString(36);
              const acc = { id, name: na.name.trim(), nameUr: na.nameUr.trim(), emoji: na.emoji || '💰', balance: parseFloat(na.balance) || 0 };
              this.setState({ settings: { ...this.state.settings, accounts: [...(this.state.settings.accounts || []), acc] }, addAccountOpen: false, newAccount: { name: '', nameUr: '', emoji: '💰', balance: '' } });
            }, style: { flex: 2, padding: '8px 12px', borderRadius: 8, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 12 } }, '✓ Add Account'),
          ),
        ) : null,
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
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
          h('div', { style: { fontSize: 16, fontWeight: 700 } }, 'Appearance & Security'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
            h('div', { style: { width: 7, height: 7, borderRadius: '50%', background: this.state.syncStatus === 'synced' ? '#0f6b4b' : this.state.syncStatus === 'syncing' || this.state.syncStatus === 'loading' ? '#a26a10' : '#a4362b' } }),
            h('span', { style: { fontSize: 11, color: '#7a7663', fontWeight: 600 } }, this.state.syncStatus === 'synced' ? '☁ Synced' : this.state.syncStatus === 'syncing' ? '☁ Syncing…' : this.state.syncStatus === 'loading' ? '☁ Loading…' : '☁ Offline'),
          ),
        ),
        this.state.syncStatus === 'error' ? h('div', { style: { background: '#fdecea', border: '1px solid #f5cac2', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#a4362b', marginBottom: 12 } },
          h('div', { style: { fontWeight: 700, marginBottom: 6 } }, '⚠ Sync error — run this SQL in your Supabase SQL Editor:'),
          h('pre', { style: { fontFamily: 'monospace', fontSize: 10, margin: 0, whiteSpace: 'pre-wrap', userSelect: 'all', lineHeight: 1.6 } }, 'create table if not exists shops (\n  id text primary key,\n  data jsonb not null,\n  updated_at timestamptz default now()\n);\nalter table shops enable row level security;\ncreate policy "public access" on shops for all using (true);'),
        ) : null,
        row('Dark mode', 'ڈارک موڈ', h('button', { onClick: this.toggleDark, style: { padding: '8px 16px', borderRadius: 8, background: this.state.darkMode ? '#1a2b1f' : '#f4f1e6', color: this.state.darkMode ? '#eaf5ee' : '#3a4a3f', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' } }, this.state.darkMode ? '🌙 Dark On' : '☀️ Dark Off')),
        row('PIN lock', 'پن لاک', h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
          this.state.savedPin
            ? h('button', { onClick: () => this.setPin(''), style: { padding: '6px 12px', borderRadius: 8, background: '#fdecea', color: '#a4362b', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' } }, '🔓 Remove PIN')
            : h('input', { type: 'number', maxLength: 4, placeholder: '4-digit PIN', onBlur: e => { if (e.target.value.length === 4) this.setPin(e.target.value); }, style: { width: 100, border: '1px solid #ece8dc', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontFamily: 'monospace', outline: 'none' } }),
        )),
        row('Reset PIN (6-digit)', 'ری سیٹ PIN', h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
          st.resetPin
            ? h(React.Fragment, {},
              h('span', { className: 'mono', style: { fontSize: 13, color: '#0f6b4b', fontWeight: 700 } }, '••••••'),
              h('button', { onClick: () => setS('resetPin', ''), style: { padding: '6px 12px', borderRadius: 8, background: '#fdecea', color: '#a4362b', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' } }, '✕ Remove'),
            )
            : h('input', { type: 'number', maxLength: 6, placeholder: '6-digit PIN', onBlur: e => { if (e.target.value.length === 6) setS('resetPin', e.target.value); else if (e.target.value.length > 0) alert('Reset PIN must be exactly 6 digits\nری سیٹ PIN بالکل 6 ہندسے ہونا چاہیے'); }, style: { width: 120, border: '1px solid #ece8dc', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontFamily: 'monospace', outline: 'none' } }),
        )),
      ]),
      h('div', { style: { height: 16 } }),
      h('div', { style: { height: 16 } }),
      this.card([
        h('div', { style: { fontSize: 16, fontWeight: 700, marginBottom: 8 } }, 'Data & Backup'),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #f2eee2', gap: 12 } },
          h('div', {},
            h('div', { style: { fontWeight: 600, fontSize: 14 } }, 'Export backup'),
            h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663', marginTop: 2 } }, 'ڈیٹا محفوظ کریں'),
            h('div', { style: { fontSize: 12, color: '#7a7663', marginTop: 2 } }, 'Download all data as a JSON file.'),
          ),
          h('button', { onClick: this.exportBackup, style: { padding: '10px 16px', borderRadius: 10, background: '#eaf5ee', color: '#0f6b4b', fontWeight: 700, fontSize: 13, flexShrink: 0 } }, '⬇ Export'),
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #f2eee2', gap: 12 } },
          h('div', {},
            h('div', { style: { fontWeight: 600, fontSize: 14 } }, 'Import backup'),
            h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663', marginTop: 2 } }, 'ڈیٹا بحال کریں'),
            h('div', { style: { fontSize: 12, color: '#7a7663', marginTop: 2 } }, 'Restore from a previously exported file.'),
          ),
          h('label', { style: { padding: '10px 16px', borderRadius: 10, background: '#f4f1e6', color: '#3a4a3f', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 } },
            '⬆ Import',
            h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onChange: e => { this.importBackup(e.target.files[0]); e.target.value = ''; } }),
          ),
        ),
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
          field('City', 'شہر', h('select', { value: nc.city, onChange: e => set('city', e.target.value), style: inp }, h('option', { value: '' }, 'Select city…'), ['Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Multan','Peshawar','Quetta','Sialkot','Gujranwala','Gujrat','Bahawalpur','Sargodha','Rahim Yar Khan','Other'].map(c => h('option', { key: c, value: c }, c)))),
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

  renderEditCustomerModal() {
    const h = this.h;
    const ec = this.state.editCustomerModal;
    if (!ec.open) return null;
    const step = ec.step || 1;
    const set = (k, v) => this.setState({ editCustomerModal: { ...this.state.editCustomerModal, [k]: v } });
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
          h('button', { onClick: () => set('step', n), style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 20, background: active ? '#eaf5ee' : 'transparent', color: active || done ? '#0f6b4b' : '#7a7663', fontWeight: 600, fontSize: 12 } },
            h('div', { style: { width: 22, height: 22, borderRadius: '50%', background: active || done ? '#0f6b4b' : '#e7e2d2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 } }, done ? '✓' : n),
            label,
          ),
          i < 3 ? h('div', { style: { flex: 1, height: 1, background: '#ece8dc', maxWidth: 40 } }) : null,
        );
      }),
    );
    const docs = ec.documents || [];
    const addDoc = (kind, files) => {
      const fs = Array.from(files || []).map(f => ({ name: f.name, kind, size: f.size, type: f.type }));
      set('documents', [...docs, ...fs]);
    };
    const removeDoc = (i) => set('documents', docs.filter((_, idx) => idx !== i));
    let content = null;
    if (step === 1) {
      content = h('div', { style: { display: 'grid', gap: 16 } },
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('Full Name', 'پورا نام', h('input', { value: ec.name, onChange: e => set('name', e.target.value), placeholder: 'Muhammad Ali', style: inp }), true),
          field('Name (Urdu)', 'اردو نام', h('input', { className: 'ur', value: ec.nameUr, onChange: e => set('nameUr', e.target.value), placeholder: 'محمد علی', style: { ...inp, textAlign: 'right' } })),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field("Father's Name", 'والد کا نام', h('input', { value: ec.fatherName, onChange: e => set('fatherName', e.target.value), style: inp })),
          field('Date of Birth', 'تاریخ پیدائش', h('input', { type: 'date', value: ec.dob, onChange: e => set('dob', e.target.value), style: inp })),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('CNIC', 'شناختی کارڈ', h('input', { value: ec.cnic, onChange: e => set('cnic', e.target.value), placeholder: '35202-1234567-8', style: { ...inp, fontFamily: 'JetBrains Mono, monospace' } }), true),
          field('Mobile', 'موبائل نمبر', h('input', { value: ec.phone, onChange: e => set('phone', e.target.value), placeholder: '0300-1234567', style: inp }), true),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('Alternate Phone', 'متبادل نمبر', h('input', { value: ec.altPhone, onChange: e => set('altPhone', e.target.value), placeholder: '042-1234567', style: inp })),
          field('Occupation', 'پیشہ', h('input', { value: ec.occupation, onChange: e => set('occupation', e.target.value), placeholder: 'Shopkeeper…', style: inp })),
        ),
        field('Monthly Income (Rs)', 'ماہانہ آمدنی', h('input', { type: 'number', value: ec.monthlyIncome, onChange: e => set('monthlyIncome', e.target.value), placeholder: '50000', style: inp })),
      );
    } else if (step === 2) {
      content = h('div', { style: { display: 'grid', gap: 16 } },
        field('Full Address', 'مکمل پتہ', h('textarea', { value: ec.address, onChange: e => set('address', e.target.value), rows: 3, placeholder: 'House 12, Street 5…', style: { ...inp, resize: 'vertical' } }), true),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('Area / Locality', 'علاقہ', h('input', { value: ec.area, onChange: e => set('area', e.target.value), placeholder: 'Model Town', style: inp })),
          field('City', 'شہر', h('select', { value: ec.city, onChange: e => set('city', e.target.value), style: inp }, h('option', { value: '' }, 'Select city…'), ['Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Multan','Peshawar','Quetta','Sialkot','Gujranwala','Gujrat','Bahawalpur','Sargodha','Rahim Yar Khan','Other'].map(ci => h('option', { key: ci, value: ci }, ci)))),
        ),
        field('Notes', 'اضافی معلومات', h('textarea', { value: ec.notes, onChange: e => set('notes', e.target.value), rows: 3, placeholder: 'Preferred collection day, landmarks…', style: { ...inp, resize: 'vertical' } })),
      );
    } else if (step === 3) {
      content = h('div', { style: { display: 'grid', gap: 16 } },
        h('div', { style: { background: '#fdf2d9', border: '1px solid #f0d894', borderRadius: 10, padding: 12, fontSize: 13, color: '#7a5100' } }, '⚠️ A guarantor is strongly recommended for plans above Rs 50,000.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('Guarantor Name', 'ضامن کا نام', h('input', { value: ec.guarantorName, onChange: e => set('guarantorName', e.target.value), style: inp })),
          field('Relation', 'رشتہ', h('select', { value: ec.guarantorRelation, onChange: e => set('guarantorRelation', e.target.value), style: inp }, ['','Father','Brother','Uncle','Cousin','Friend','Colleague','Other'].map(r => h('option', { key: r, value: r }, r || 'Select…')))),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 } },
          field('Guarantor Phone', 'ضامن کا فون', h('input', { value: ec.guarantorPhone, onChange: e => set('guarantorPhone', e.target.value), placeholder: '0300-0000000', style: inp })),
          field('Guarantor CNIC', 'ضامن کا شناختی کارڈ', h('input', { value: ec.guarantorCnic, onChange: e => set('guarantorCnic', e.target.value), placeholder: '35202-0000000-0', style: { ...inp, fontFamily: 'JetBrains Mono, monospace' } })),
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
                h('input', { type: 'file', accept: 'image/*,.pdf', multiple: true, onChange: e => addDoc(d.key, e.target.files), style: { display: 'none' } }),
              )),
        ),
        docs.length > 0 ? h('div', {},
          h('div', { style: { fontSize: 12, fontWeight: 700, color: '#3a4a3f', marginBottom: 8, marginTop: 8 } }, 'Uploaded (' + docs.length + ')'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            docs.map((d, i) => h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#eaf5ee', border: '1px solid #cfe0d5', borderRadius: 8 } },
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 13, fontWeight: 600 } }, d.name),
                h('div', { style: { fontSize: 11, color: '#5a6a5f' } }, d.kind.replace(/_/g, ' ') + ' · ' + Math.round(d.size / 1024) + ' KB'),
              ),
              h('button', { onClick: () => removeDoc(i), style: { color: '#a4362b', fontSize: 12, fontWeight: 600 } }, 'Remove'),
            )),
          ),
        ) : null,
      );
    }
    return h('div', { onClick: this.closeEditCustomer, style: { position: 'fixed', inset: 0, background: 'rgba(26,43,31,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20, backdropFilter: 'blur(4px)', overflow: 'auto' } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'slideIn .2s ease' } },
        h('div', { style: { padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 } },
          h('div', {}, h('div', { style: { fontSize: 20, fontWeight: 800 } }, '✎ Edit Customer'), h('div', { className: 'ur', style: { fontSize: 14, color: '#7a7663' } }, 'گاہک میں ترمیم')),
          h('button', { onClick: this.closeEditCustomer, style: { width: 36, height: 36, borderRadius: 10, background: '#f4f1e6', fontSize: 18 } }, '✕'),
        ),
        h('div', { style: { padding: '20px 28px 0' } }, stepper),
        h('div', { style: { padding: '4px 28px 20px', overflowY: 'auto', flex: 1 } }, content),
        h('div', { style: { padding: '16px 28px', borderTop: '1px solid #ece8dc', display: 'flex', justifyContent: 'space-between', gap: 10, background: '#fdfcf8', borderRadius: '0 0 20px 20px' } },
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { onClick: () => this.deleteCustomer(ec.id), style: { padding: '10px 14px', borderRadius: 10, background: '#fdecea', color: '#a4362b', fontWeight: 600, fontSize: 13 } }, '🗑 Delete'),
            h('button', { onClick: () => step > 1 ? set('step', step - 1) : this.closeEditCustomer(), style: { padding: '10px 16px', borderRadius: 10, background: '#f4f1e6', fontWeight: 600, fontSize: 13, color: '#3a4a3f' } }, step > 1 ? '← Back' : 'Cancel'),
          ),
          h('div', { style: { fontSize: 12, color: '#7a7663', alignSelf: 'center' } }, 'Step ' + step + ' of 4'),
          step < 4
            ? h('button', { onClick: () => set('step', step + 1), style: { padding: '10px 20px', borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 13 } }, 'Continue →')
            : h('button', { onClick: this.saveEditCustomer, style: { padding: '10px 20px', borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 13 } }, '✓ Save Changes'),
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

  renderEditProductModal() {
    const h = this.h;
    const ep = this.state.editProductModal;
    if (!ep.open) return null;
    const set = (k, v) => this.setState({ editProductModal: { ...ep, [k]: v } });
    const inp = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    const field = (label, labelUr, node) => h('div', {},
      h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, label, labelUr ? h('span', { className: 'ur', style: { color: '#7a7663', marginLeft: 6 } }, labelUr) : null),
      node,
    );
    const categories = ['Mobile', 'Motorcycle', 'Television', 'Refrigerator', 'Appliance', 'Air Conditioner', 'Laptop', 'Other'];
    const emojis = ['📱','🏍️','📺','❄️','🧺','💻','📦','⚡','🔌','🎮','📷','🖨️'];
    const sold = this.state.plans.filter(pl => pl.productId === ep.id).length;
    return h('div', { onClick: this.closeEditProduct, style: { position: 'fixed', inset: 0, background: 'rgba(26,43,31,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20, backdropFilter: 'blur(4px)' } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, animation: 'slideIn .2s ease', maxHeight: '90vh', overflowY: 'auto' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } },
          h('div', {},
            h('div', { style: { fontSize: 18, fontWeight: 800 } }, '✎ Edit Product'),
            h('div', { style: { fontSize: 12, color: '#7a7663', marginTop: 2 } }, 'پروڈکٹ میں ترمیم'),
          ),
          h('button', { onClick: this.closeEditProduct, style: { width: 34, height: 34, borderRadius: 9, background: '#f4f1e6', fontSize: 16 } }, '✕'),
        ),
        h('div', { style: { display: 'grid', gap: 14 } },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            field('Product Name *', 'نام', h('input', { value: ep.name, onChange: e => set('name', e.target.value), placeholder: 'e.g. Samsung A35', style: inp })),
            field('Urdu Name', 'اردو نام', h('input', { className: 'ur', value: ep.nameUr, onChange: e => set('nameUr', e.target.value), placeholder: 'سامسنگ', style: { ...inp, textAlign: 'right' } })),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            field('Category', 'قسم', h('select', { value: ep.category, onChange: e => set('category', e.target.value), style: inp },
              categories.map(c => h('option', { key: c, value: c }, c)))),
            field('Price (Rs) *', 'قیمت', h('input', { type: 'number', value: ep.price, onChange: e => set('price', e.target.value), placeholder: '0', className: 'mono', style: inp })),
          ),
          field('Stock', 'اسٹاک', h('input', { type: 'number', value: ep.stock, onChange: e => set('stock', e.target.value), placeholder: '0', className: 'mono', style: inp })),
          field('Icon', 'آئیکن', h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            emojis.map(em => h('button', { key: em, onClick: () => set('emoji', em), style: { width: 40, height: 40, borderRadius: 10, fontSize: 20, border: '2px solid ' + (ep.emoji === em ? '#0f6b4b' : '#ece8dc'), background: ep.emoji === em ? '#eaf5ee' : '#fdfcf8' } }, em))
          )),
        ),
        h('div', { style: { display: 'flex', gap: 10, marginTop: 24 } },
          h('button', { onClick: () => this.deleteProduct(ep.id), style: { padding: '12px 16px', borderRadius: 10, background: '#fdecea', color: '#a4362b', fontWeight: 600, fontSize: 13 } }, '🗑 Delete'),
          h('button', { onClick: this.closeEditProduct, style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600 } }, 'Cancel'),
          h('button', { onClick: this.saveEditProduct, style: { flex: 2, padding: 12, borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700 } }, '✓ Save Changes'),
        ),
        sold > 0 ? h('div', { style: { marginTop: 12, fontSize: 11, color: '#7a7663', textAlign: 'center' } }, 'Used in ' + sold + ' plan(s) — name/price changes won\'t affect existing plans') : null,
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
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 } },
            h('span', { style: { fontSize: 11, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 } }, 'Amount Received'),
            h('span', { className: 'ur', style: { fontSize: 12, color: '#0f6b4b', fontWeight: 600 } }, '(وصول شدہ رقم)'),
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 } },
            h('span', { className: 'mono', style: { fontSize: 20, fontWeight: 700, color: '#7a7663' } }, 'Rs'),
            h('input', { type: 'number', autoFocus: true, value: this.state.paymentAmount, onChange: e => this.setState({ paymentAmount: e.target.value }), className: 'mono', style: { fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', border: 'none', borderBottom: '2px solid #0f6b4b', background: 'transparent', outline: 'none', width: 160, textAlign: 'center', color: '#1a2b1f' } }),
          ),
          h('div', { style: { fontSize: 11, color: '#7a7663', marginTop: 6 } }, '✎ رقم تبدیل کر سکتے ہیں · Due ' + this.fmtDate(s.dueDate) + ' · Full: ' + this.fmtPKR(totalDue)),
          lateFee > 0 ? h('div', { style: { marginTop: 10, padding: '6px 10px', background: '#fdecea', color: '#a4362b', borderRadius: 8, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 } },
            h('span', { className: 'mono', style: { fontWeight: 700 } }, this.fmtPKR(s.amount)), ' installment + ', h('span', { className: 'mono', style: { fontWeight: 700 } }, this.fmtPKR(lateFee)), ' late fee') : null,
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f' } }, 'Receive in account'),
          h('div', { className: 'ur', style: { fontSize: 11, color: '#7a7663' } }, 'اکاؤنٹ منتخب کریں'),
        ),
        (() => { const accs = this.getAccounts(); return accs.length > 0
          ? h('div', { style: { display: 'grid', gridTemplateColumns: accs.length <= 3 ? 'repeat(' + accs.length + ',1fr)' : 'repeat(2,1fr)', gap: 8, marginBottom: 20 } },
              accs.map(acc => { const active = this.state.paymentAccountId === acc.id; return h('button', { type: 'button', key: acc.id, onClick: () => this.setState({ paymentAccountId: acc.id }), style: { padding: '10px 8px', borderRadius: 10, border: '1px solid ' + (active ? '#0f6b4b' : '#ece8dc'), background: active ? '#eaf5ee' : '#fdfcf8', fontSize: 12, fontWeight: 600, color: active ? '#0f6b4b' : '#3a4a3f', textAlign: 'center' } },
                h('div', { style: { fontSize: 16 } }, acc.emoji),
                h('div', { style: { marginTop: 2 } }, acc.name),
                h('div', { className: 'mono', style: { fontSize: 10, color: '#7a7663', marginTop: 2 } }, 'Bal: ' + this.fmtPKR(this.accountBalance(acc.id))),
              ); }),
            )
          : h('div', { style: { padding: '12px 0', marginBottom: 20, color: '#7a7663', fontSize: 12 } }, 'No accounts set up. Add them in Settings → Payment Accounts.');
        })(),
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
        h('div', { className: 'mono', style: { fontSize: 32, fontWeight: 800, color: '#0f6b4b', margin: '20px 0 4px' } }, this.fmtPKR(r.amountCollected != null ? r.amountCollected : r.installment.amount)),
        h('div', { style: { fontSize: 12, color: '#7a7663' } }, 'Receipt #' + r.receiptNo),
        h('div', { style: { textAlign: 'left', background: '#fdfcf8', border: '1px dashed #d9d5c7', borderRadius: 12, padding: 16, marginTop: 20, fontSize: 13 } },
          [['Customer', r.customer.name], ['Product', r.product.name], ['Installment', r.installment.n + ' / ' + r.plan.months], ['Account', r.accountName || '—'], ['Voucher', r.plan.voucherNo || '—'], ['Date', this.fmtDate(r.date)]].map(([l, v], i) =>
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

  renderEditModal() {
    const h = this.h;
    const em = this.state.editPlanModal;
    const pl = this.state.plans.find(p => p.id === em.planId);
    if (!pl) return null;
    const c = this.state.customers.find(x => x.id === pl.customerId);
    const p = this.state.products.find(x => x.id === pl.productId);
    const setDraft = (k, v) => this.setState({ editPlanModal: { ...this.state.editPlanModal, [k]: v } });
    const updateInst = (n, field, val) => {
      setDraft('draftSchedule', em.draftSchedule.map(s => s.n === n ? { ...s, [field]: val } : s));
    };
    const inpStyle = { border: '1px solid #ece8dc', borderRadius: 8, padding: '6px 10px', fontSize: 13, background: '#fdfcf8', outline: 'none', boxSizing: 'border-box' };
    const isMobile = p && ['Mobile', 'Laptop'].includes(p.category);
    const isBike = p && p.category === 'Motorcycle';
    const overlay = { position: 'fixed', inset: 0, background: 'rgba(26,43,31,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '12px 16px', backdropFilter: 'blur(4px)', overflowY: 'auto' };
    if (!em.pinConfirmed) {
      return h('div', { onClick: this.closeEditPlan, style: { ...overlay, alignItems: 'center' } },
        h('div', { onClick: e => e.stopPropagation(), style: { background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, textAlign: 'center' } },
          h('div', { style: { fontSize: 36, marginBottom: 12 } }, '🔐'),
          h('div', { style: { fontSize: 18, fontWeight: 800, marginBottom: 4 } }, 'Confirm Save'),
          h('div', { className: 'ur', style: { fontSize: 14, color: '#7a7663', marginBottom: 24 } }, 'تبدیلیاں محفوظ کریں'),
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 8, textAlign: 'left' } }, 'Enter PIN to save changes ', h('span', { className: 'ur', style: { color: '#7a7663' } }, '— تصدیقی PIN')),
          h('input', { type: 'password', inputMode: 'numeric', maxLength: 4, placeholder: '••••', autoFocus: true, value: em.pinInput, onChange: e => setDraft('pinInput', e.target.value), onKeyDown: e => e.key === 'Enter' && this.submitEditPlanPin(), style: { width: '100%', textAlign: 'center', fontSize: 28, letterSpacing: 14, border: '2px solid #ece8dc', borderRadius: 10, padding: 10, outline: 'none', background: '#fdfcf8', fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: 16 } }),
          h('div', { style: { display: 'flex', gap: 10 } },
            h('button', { onClick: this.closeEditPlan, style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600, color: '#3a4a3f' } }, 'Cancel'),
            h('button', { onClick: this.submitEditPlanPin, style: { flex: 1, padding: 12, borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700 } }, '✓ Save'),
          ),
        ),
      );
    }
    return h('div', { onClick: this.closeEditPlan, style: overlay },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 580, display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflowY: 'auto', margin: 'auto' } },
        h('div', { style: { padding: '20px 22px 16px', borderBottom: '1px solid #ece8dc', position: 'sticky', top: 0, background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 1 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('div', {},
              h('div', { style: { fontSize: 17, fontWeight: 800 } }, '✎ Edit Plan'),
              h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, 'پلان ترمیم'),
            ),
            h('button', { onClick: this.closeEditPlan, style: { width: 34, height: 34, borderRadius: 9, background: '#f4f1e6', fontSize: 15 } }, '✕'),
          ),
          h('div', { style: { marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' } },
            h('div', { style: { width: 38, height: 38, borderRadius: 9, background: '#f4f1e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 } }, p ? p.emoji : '📦'),
            h('div', {},
              h('div', { style: { fontWeight: 700, fontSize: 14 } }, p ? p.name : '—'),
              h('div', { style: { fontSize: 12, color: '#7a7663' } }, c ? c.name : '—'),
              pl.voucherNo ? h('div', { className: 'mono', style: { fontSize: 11, color: '#7a7663', fontWeight: 600 } }, pl.voucherNo) : null,
            ),
          ),
        ),
        h('div', { style: { padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 } },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Customer ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'گاہک')),
              h('select', { value: em.draftCustomerId, onChange: e => setDraft('draftCustomerId', e.target.value), style: { ...inpStyle, width: '100%' } }, this.activeCustomers().map(cx => h('option', { key: cx.id, value: cx.id }, cx.name + ' · ' + cx.phone))),
            ),
            h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Product ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'مصنوعات')),
              h('select', { value: em.draftProductId, onChange: e => setDraft('draftProductId', e.target.value), style: { ...inpStyle, width: '100%' } }, this.activeProducts().map(px => h('option', { key: px.id, value: px.id }, px.name + ' — ' + this.fmtPKR(px.price)))),
            ),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Total Price ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'قیمت')),
              h('input', { type: 'number', value: em.draftTotal, onChange: e => setDraft('draftTotal', e.target.value), style: { ...inpStyle, width: '100%' } }),
            ),
            h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Down Payment ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'ایڈوانس')),
              h('input', { type: 'number', value: em.draftDown, onChange: e => setDraft('draftDown', e.target.value), style: { ...inpStyle, width: '100%' } }),
            ),
          ),
          (() => {
            const financed = Math.max(0, (parseFloat(em.draftTotal) || 0) - (parseFloat(em.draftDown) || 0));
            return h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              h('div', {},
                h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Profit Rs ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'منافع رقم')),
                h('input', { type: 'number', min: 0, value: em.draftInterestAmount, onChange: e => { const raw = e.target.value; const amt = parseFloat(raw) || 0; const pct = financed > 0 ? (amt / financed) * 100 : 0; this.setState({ editPlanModal: { ...this.state.editPlanModal, draftInterestAmount: raw, draftInterest: financed > 0 ? String(Math.round(pct * 100) / 100) : em.draftInterest } }); }, style: { ...inpStyle, width: '100%' } }),
              ),
              h('div', {},
                h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Markup % ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'منافع %')),
                h('input', { type: 'number', max: 100, min: 0, value: em.draftInterest, onChange: e => { const raw = e.target.value; const pct = Math.min(parseFloat(raw) || 0, 100); const amt = Math.round(financed * pct / 100); this.setState({ editPlanModal: { ...this.state.editPlanModal, draftInterest: (parseFloat(raw) > 100 ? '100' : raw), draftInterestAmount: financed > 0 ? String(amt) : em.draftInterestAmount } }); }, style: { ...inpStyle, width: '100%' } }),
              ),
            );
          })(),
          (() => {
            const financed = Math.max(0, (parseFloat(em.draftTotal) || 0) - (parseFloat(em.draftDown) || 0));
            const dAmt = parseFloat(em.draftInterestAmount);
            const profit = Math.max(0, (em.draftInterestAmount !== '' && !isNaN(dAmt)) ? dAmt : financed * Math.min(parseFloat(em.draftInterest) || 0, 100) / 100);
            const total2Pay = financed + profit;
            const paidSum = em.draftSchedule.filter(s => s.paid).reduce((a, s) => a + s.amount, 0);
            const remain = Math.max(0, Math.round(total2Pay - paidSum));
            const installAmt = parseFloat(em.draftInstallmentAmount) || 0;
            let preview = 'Leave blank to split the balance equally';
            if (installAmt > 0 && remain > 0) {
              const full = Math.floor(remain / installAmt);
              const rem = remain - full * installAmt;
              preview = rem > 0
                ? (full > 0 ? this.fmtPKR(installAmt) + ' × ' + full + '  +  ' + this.fmtPKR(rem) + ' × 1' : this.fmtPKR(rem) + ' × 1')
                : this.fmtPKR(installAmt) + ' × ' + full;
            }
            return h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Installment Amount ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'قسط کی رقم')),
              h('input', { type: 'number', min: 0, value: em.draftInstallmentAmount, onChange: e => setDraft('draftInstallmentAmount', e.target.value), placeholder: 'e.g. 3000', style: { ...inpStyle, width: '100%' } }),
              h('div', { style: { marginTop: 6, background: '#eaf5ee', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#0f6b4b', fontWeight: 600 } }, preview),
            );
          })(),
          h('div', { style: { display: 'grid', gridTemplateColumns: isMobile || isBike ? '1fr 1fr' : '1fr', gap: 10 } },
            h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Start Date ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'آغاز')),
              h('input', { type: 'date', value: em.draftStartDate, onChange: e => setDraft('draftStartDate', e.target.value), style: { ...inpStyle, width: '100%' } }),
            ),
            isMobile ? h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'IMEI Number'),
              h('input', { value: em.draftImei, onChange: e => setDraft('draftImei', e.target.value), placeholder: '15-digit IMEI', style: { ...inpStyle, width: '100%', fontFamily: 'monospace' } }),
            ) : null,
            isBike ? h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Chassis No.'),
              h('input', { value: em.draftChassisNo, onChange: e => setDraft('draftChassisNo', e.target.value), placeholder: 'Chassis number', style: { ...inpStyle, width: '100%', fontFamily: 'monospace' } }),
            ) : null,
          ),
          h('div', {},
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Notes ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'نوٹس')),
            h('textarea', { value: em.draftNotes, onChange: e => setDraft('draftNotes', e.target.value), placeholder: 'Any notes about this plan…', rows: 2, style: { ...inpStyle, width: '100%', resize: 'vertical' } }),
          ),
          h('div', {},
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Installment Schedule ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'قسط کی تفصیل')),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              em.draftSchedule.map(s => s.paid
                ? h('div', { key: s.n, style: { display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', background: '#eaf5ee', borderRadius: 8, opacity: 0.7 } },
                    h('div', { style: { width: 22, height: 22, borderRadius: 5, background: '#0f6b4b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 } }, '✓'),
                    h('div', { style: { flex: 1, fontSize: 12, color: '#3a6a4f' } }, '#' + s.n + ' · ' + this.fmtDate(s.dueDate)),
                    h('div', { className: 'mono', style: { fontSize: 12, fontWeight: 700, color: '#0f6b4b' } }, this.fmtPKR(s.amountPaid || s.amount)),
                    h('div', { style: { fontSize: 10, background: '#0f6b4b', color: 'white', borderRadius: 4, padding: '1px 5px', fontWeight: 700 } }, 'PAID'),
                  )
                : h('div', { key: s.n, style: { display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', background: '#fdfcf8', border: '1px solid #ece8dc', borderRadius: 8 } },
                    h('div', { style: { width: 22, height: 22, borderRadius: 5, background: '#f4f1e6', color: '#3a4a3f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 } }, s.n),
                    h('input', { type: 'date', value: s.dueDate, onChange: e => updateInst(s.n, 'dueDate', e.target.value), style: { ...inpStyle, flex: 1, minWidth: 0, fontSize: 12, padding: '5px 8px' } }),
                    h('span', { style: { fontSize: 11, color: '#7a7663', flexShrink: 0 } }, 'Rs'),
                    h('input', { type: 'number', value: s.amount, onChange: e => updateInst(s.n, 'amount', parseFloat(e.target.value) || 0), style: { ...inpStyle, width: 90, textAlign: 'right', fontSize: 13, fontWeight: 700, padding: '5px 8px' } }),
                  )
              ),
            ),
          ),
        ),
        h('div', { style: { padding: '14px 22px', borderTop: '1px solid #ece8dc', display: 'flex', gap: 10, background: '#fdfcf8', borderRadius: '0 0 20px 20px', position: 'sticky', bottom: 0 } },
          h('button', { onClick: this.closeEditPlan, style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600, color: '#3a4a3f' } }, 'Cancel'),
          h('button', { onClick: this.confirmEditPlan, style: { flex: 2, padding: 12, borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 14 } }, '✓ Save Changes'),
        ),
      ),
    );
  }

  renderDeleteModal() {
    const h = this.h;
    const { planId } = this.state.deletePlanModal;
    const pl = this.state.plans.find(p => p.id === planId);
    if (!pl) return null;
    const c = this.state.customers.find(x => x.id === pl.customerId);
    const p = this.state.products.find(x => x.id === pl.productId);
    return h('div', { onClick: this.closeDeletePlan, style: { position: 'fixed', inset: 0, background: 'rgba(26,43,31,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20, backdropFilter: 'blur(4px)' } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400, animation: 'slideIn .2s ease' } },
        h('div', { style: { fontSize: 36, textAlign: 'center', marginBottom: 12 } }, '🗑'),
        h('div', { style: { fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 2 } }, 'Delete Plan?'),
        h('div', { className: 'ur', style: { fontSize: 14, color: '#7a7663', textAlign: 'center', marginBottom: 20 } }, 'پلان ڈیلیٹ کریں؟'),
        h('div', { style: { background: '#fdfcf8', border: '1px solid #ece8dc', borderRadius: 12, padding: '14px 16px', marginBottom: 16 } },
          h('div', { style: { fontWeight: 700, fontSize: 15 } }, c ? c.name : '—'),
          h('div', { style: { color: '#7a7663', fontSize: 13, marginTop: 4 } }, p ? p.emoji + ' ' + p.name : '—'),
          pl.voucherNo ? h('div', { className: 'mono', style: { color: '#7a7663', fontSize: 12, marginTop: 4, fontWeight: 600 } }, pl.voucherNo) : null,
        ),
        h('div', { style: { background: '#fdecea', border: '1px solid #f5cac2', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#a4362b', marginBottom: 20 } }, '⚠️ تمام ادائیگیوں کا ریکارڈ بھی ڈیلیٹ ہو جائے گا۔ یہ واپس نہیں ہو سکتا۔'),
        h('div', { style: { display: 'flex', gap: 10 } },
          h('button', { onClick: this.closeDeletePlan, style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600, color: '#3a4a3f' } }, 'Cancel'),
          h('button', { onClick: this.confirmDeletePlan, style: { flex: 1, padding: 12, borderRadius: 10, background: '#a4362b', color: 'white', fontWeight: 700 } }, '🗑 Delete'),
        ),
      ),
    );
  }

  renderPinModal() {
    const h = this.h;
    const pm = this.state.pinModal;
    if (!pm.open) return null;
    const pin = this.state.pinModalInput;
    const isReset = pm.isResetPin;
    const len = isReset ? (this.state.settings.resetPin || '').length || 6 : this.state.savedPin.length || 4;
    const dotColor = isReset ? '#a4362b' : '#0f6b4b';
    const dots = [];
    for (let i = 0; i < len; i++) dots.push(h('div', { key: i, style: { width: 18, height: 18, borderRadius: '50%', background: i < pin.length ? dotColor : 'transparent', border: '2px solid ' + (i < pin.length ? dotColor : '#c5c0b0'), transition: 'all .15s ease', transform: i === pin.length - 1 && pin.length > 0 ? 'scale(1.2)' : 'scale(1)' } }));
    const keys = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']];
    const btnBase = { width: 72, height: 60, borderRadius: 14, border: '1px solid #ece8dc', background: '#fdfcf8', fontSize: 24, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a2b1f', transition: 'background .1s', touchAction: 'manipulation', userSelect: 'none', WebkitTapHighlightColor: 'transparent' };
    return h('div', { onClick: this.closePinModal, style: { position: 'fixed', inset: 0, background: 'rgba(26,43,31,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20, backdropFilter: 'blur(6px)' } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 24, padding: '32px 24px 24px', width: '100%', maxWidth: 340, animation: 'slideIn .2s ease', textAlign: 'center' } },
        h('div', { style: { fontSize: 36, marginBottom: 8 } }, isReset ? '🛡️' : '🔐'),
        h('div', { style: { fontSize: 17, fontWeight: 800, marginBottom: 2, color: isReset ? '#a4362b' : '#1a2b1f' } }, isReset ? 'Enter Reset PIN' : 'Enter PIN'),
        h('div', { className: 'ur', style: { fontSize: 13, color: '#7a7663', marginBottom: 20 } }, isReset ? '6 ہندسوں کا ری سیٹ PIN درج کریں' : 'PIN درج کریں'),
        h('div', { style: { display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 8 } }, ...dots),
        pm.error ? h('div', { style: { color: '#d93b3b', fontSize: 13, fontWeight: 600, marginTop: 8, marginBottom: 4 } }, pm.error) : h('div', { style: { height: 25 } }),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginTop: 12 } },
          ...keys.map((row, ri) => h('div', { key: ri, style: { display: 'flex', gap: 12 } },
            ...row.map(k => k === '' ? h('div', { key: 'blank', style: { width: 72, height: 60 } }) : h('button', { key: k, type: 'button', onClick: (e) => { e.stopPropagation(); this.pinModalKey(k); }, style: { ...btnBase, ...(k === 'del' ? { fontSize: 18, color: '#7a7663' } : {}) } }, k === 'del' ? '⌫' : k))
          ))
        ),
        h('button', { type: 'button', onClick: this.closePinModal, style: { marginTop: 18, background: 'none', border: 'none', color: '#7a7663', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '8px 20px' } }, 'Cancel / منسوخ'),
      ),
    );
  }

  renderPinLock() {
    const h = this.h;
    const pin = this.state.enteredPin;
    const len = (this.state.savedPin || '').length || 4;
    const dots = [];
    for (let i = 0; i < len; i++) dots.push(h('div', { key: i, style: { width: 18, height: 18, borderRadius: '50%', background: i < pin.length ? '#0f6b4b' : 'transparent', border: i < pin.length ? '2px solid #0f6b4b' : '2px solid #c5c0b0', transition: 'all .15s ease', transform: i === pin.length - 1 && pin.length > 0 ? 'scale(1.2)' : 'scale(1)' } }));
    const keys = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']];
    const btnBase = { width: 76, height: 64, borderRadius: 16, border: '1px solid #ece8dc', background: '#fdfcf8', fontSize: 26, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a2b1f', transition: 'background .1s', touchAction: 'manipulation', userSelect: 'none', WebkitTapHighlightColor: 'transparent' };
    return h('div', { style: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f7f5ef' } },
      h('div', { style: { textAlign: 'center', width: '100%', maxWidth: 360, padding: '0 12px' } },
        h('div', { style: { width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#0f6b4b,#14a374)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 26, margin: '0 auto 16px' } }, 'A'),
        h('div', { style: { fontSize: 22, fontWeight: 800, marginBottom: 2, color: '#1a2b1f' } }, 'Aqsat'),
        h('div', { style: { fontSize: 13, color: '#7a7663', marginBottom: 28 } }, 'Enter PIN to unlock / PIN درج کریں'),
        h('div', { style: { display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 10 } }, ...dots),
        this.state.pinLockError ? h('div', { style: { color: '#d93b3b', fontSize: 13, fontWeight: 600, marginTop: 8, marginBottom: 4, animation: 'shake .3s ease' } }, 'Wrong PIN / غلط PIN') : h('div', { style: { height: 25 } }),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 16 } },
          ...keys.map((row, ri) => h('div', { key: ri, style: { display: 'flex', gap: 12 } },
            ...row.map(k => k === '' ? h('div', { key: 'blank', style: { width: 76, height: 64 } }) : h('button', { key: k, type: 'button', onClick: () => this.pinLockKey(k), style: { ...btnBase, ...(k === 'del' ? { fontSize: 20, color: '#7a7663' } : {}) } }, k === 'del' ? '⌫' : k))
          ))
        ),
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
      { key: 'menu',      label: 'Menu',      icon: '☰',  go: () => this.setState({ menuOpen: true }) },
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
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e7dcc4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6b4a1a', flexShrink: 0 }}>{(this.state.settings.ownerName || 'O').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{this.state.settings.ownerName || 'Owner'}</div>
              <div style={{ fontSize: 11, color: '#7a7663', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{this.state.settings.businessName || 'Aqsat'}</div>
            </div>
          </div>
        </aside>

        {/* Mobile topbar */}
        <div className="mobile-only" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, background: '#ffffff', borderBottom: '1px solid #ece8dc', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#0f6b4b,#14a374)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, flexShrink: 0 }}>A</div>
          <div style={{ flex: 1, background: '#f4f1e6', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>🔍</span>
            <input placeholder="Search…" value={this.state.searchQuery} onChange={e => this.setState({ searchQuery: e.target.value })} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, flex: 1, minWidth: 0 }} />
          </div>
          <button onClick={() => this.go('newplan')} style={{ width: 32, height: 32, borderRadius: 9, background: '#0f6b4b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>＋</button>
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
        {this.state.addProductOpen        && this.renderAddProductModal()}
        {this.state.editProductModal.open && this.renderEditProductModal()}
        {this.state.addCustomerOpen       && this.renderAddCustomer()}
        {this.state.editCustomerModal.open && this.renderEditCustomerModal()}
        {this.state.paymentModalOpen      && this.renderPaymentModal()}
        {this.state.receiptOpen           && this.renderReceipt()}
        {this.state.deletePlanModal.open  && this.renderDeleteModal()}
        {this.state.editPlanModal.open    && this.renderEditModal()}
        {this.state.pinModal.open         && this.renderPinModal()}

        {/* Mobile hamburger menu drawer */}
        {this.state.menuOpen && (
          <div onClick={() => this.setState({ menuOpen: false })} className="mobile-only" style={{ position: 'fixed', inset: 0, background: 'rgba(26,43,31,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: '20px 20px 0 0', padding: '20px 16px 36px', width: '100%', animation: 'slideIn .2s ease' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d9d5c7', margin: '0 auto 20px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { icon: '📊', label: 'Reports',   go: 'reports' },
                  { icon: '🔔', label: 'Reminders', go: 'reminders', badge: overdueCount > 0 ? overdueCount : null },
                  { icon: '📦', label: 'Products',  go: 'products' },
                  { icon: '⚙️', label: 'Settings',  go: 'settings' },
                ].map(item => (
                  <button key={item.go} onClick={() => { this.go(item.go); this.setState({ menuOpen: false }); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 14, background: '#f7f5ef', border: '1px solid #ece8dc', fontWeight: 600, fontSize: 14, position: 'relative' }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    {item.label}
                    {item.badge && <span style={{ position: 'absolute', top: 8, right: 8, background: '#fce8b7', color: '#7a5100', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>{item.badge}</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => { this.openAddProduct(); this.setState({ menuOpen: false }); }} style={{ width: '100%', padding: '14px', borderRadius: 14, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                ＋ Add Product
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}
