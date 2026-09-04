import React from 'react';
import Head from 'next/head';
import { supabase, SHOP_ID } from '../lib/supabase';

export default class App extends React.Component {
  _isDemo = false;

  _generateDemoData() {
    const now = Date.now();
    const id = (prefix, i) => prefix + '_' + (now - i * 86400000).toString(36);
    const d = (daysAgo) => { const dt = new Date(now - daysAgo * 86400000); return dt.toISOString().split('T')[0]; };

    const customers = [
      { id: id('c', 0), name: 'Ahmed Khan', nameUr: 'احمد خان', phone: '03001234567', cnic: '33100-1234567-1', address: 'Main Bazaar, Jhang', city: 'Jhang' },
      { id: id('c', 1), name: 'Bilal Hussain', nameUr: 'بلال حسین', phone: '03019876543', cnic: '33100-7654321-2', address: 'Mohalla Qadirabad', city: 'Chiniot' },
      { id: id('c', 2), name: 'Farhan Ali', nameUr: 'فرحان علی', phone: '03211112222', cnic: '33100-1112222-3', address: 'Faisalabad Road', city: 'Shorkot' },
      { id: id('c', 3), name: 'Hamza Tariq', nameUr: 'حمزہ طارق', phone: '03331234000', cnic: '33100-3334444-4', address: 'College Road', city: 'Sargodha' },
      { id: id('c', 4), name: 'Imran Mazari', nameUr: 'عمران مزاری', phone: '03451112233', cnic: '33100-5556666-5', address: 'GT Road', city: 'Sahiwal' },
      { id: id('c', 5), name: 'Kashif Sial', nameUr: 'کاشف سیال', phone: '03009991111', cnic: '33100-9991111-6', address: 'Tehsil Bazar', city: 'Jhang' },
      { id: id('c', 6), name: 'Nasir Bhatti', nameUr: 'ناصر بھٹی', phone: '03167778888', cnic: '33100-7778888-7', address: 'Chowk Bazaar', city: 'Chiniot' },
      { id: id('c', 7), name: 'Rizwan Chattha', nameUr: 'رضوان چٹھا', phone: '03027773333', cnic: '33100-2224444-8', address: 'Railway Road', city: 'Shorkot' },
    ];

    const products = [
      { id: id('p', 0), name: 'Samsung Galaxy A15', nameUr: 'سیمسنگ A15', category: 'Mobile', price: 42000, costPrice: 36000, stock: 5, emoji: '📱' },
      { id: id('p', 1), name: 'Infinix Hot 50', nameUr: 'انفنکس ہاٹ 50', category: 'Mobile', price: 35000, costPrice: 29000, stock: 8, emoji: '📱' },
      { id: id('p', 2), name: 'Honda CD 70', nameUr: 'ہونڈا CD 70', category: 'Bike', price: 155000, costPrice: 140000, stock: 3, emoji: '🏍️' },
      { id: id('p', 3), name: 'Oppo A60', nameUr: 'اوپو A60', category: 'Mobile', price: 48000, costPrice: 41000, stock: 4, emoji: '📱' },
      { id: id('p', 4), name: 'Dawlance Fridge 9178', nameUr: 'ڈالنس فریج', category: 'Appliance', price: 85000, costPrice: 72000, stock: 2, emoji: '🧊' },
      { id: id('p', 5), name: 'Vivo Y28', nameUr: 'ویوو Y28', category: 'Mobile', price: 52000, costPrice: 44000, stock: 6, emoji: '📱' },
      { id: id('p', 6), name: 'United 125cc', nameUr: 'یونائیٹڈ 125', category: 'Bike', price: 195000, costPrice: 175000, stock: 2, emoji: '🏍️' },
    ];

    const plans = [];
    const pairings = [
      [0, 0, 42000, 10000, 6], [1, 1, 38000, 8000, 6], [2, 2, 165000, 40000, 12],
      [3, 3, 50000, 12000, 6], [4, 4, 95000, 20000, 10], [5, 5, 55000, 15000, 8],
      [6, 6, 210000, 50000, 12], [7, 0, 42000, 10000, 6],
    ];
    pairings.forEach(function(pair, idx) {
      var ci = pair[0], pi = pair[1], total = pair[2], dp = pair[3], months = pair[4];
      var remaining = total - dp;
      var inst = Math.ceil(remaining / months);
      var schedule = [];
      for (var m = 1; m <= months; m++) {
        var due = d(60 - m * 30);
        var isPaid = m <= Math.floor(months * 0.4 + idx * 0.3);
        schedule.push({ month: m, dueDate: due, amount: inst, paid: isPaid ? inst : 0, paidDate: isPaid ? due : null, status: isPaid ? 'paid' : (due < d(0) ? 'overdue' : 'upcoming') });
      }
      plans.push({
        id: id('pl', idx), customerId: customers[ci].id, productId: products[pi].id,
        totalPrice: total, downPayment: dp, months: months, installmentAmount: inst,
        startDate: d(60), status: 'active', schedule: schedule, accountId: 'acc_cash',
      });
    });

    var udpiEntries = [];
    var udharPeople = ['Usman Lohar', 'Tahir Mazari', 'Sajjad Oil Depot', 'Khalid Electrician', 'Waqas Tailor', 'Amjad Karyana'];
    var directions = ['lent', 'lent', 'borrowed', 'lent', 'borrowed', 'lent'];
    var amounts = [15000, 8000, 25000, 12000, 5000, 32000];
    udharPeople.forEach(function(person, i) {
      udpiEntries.push({
        id: id('udpi', i), person: person, direction: directions[i], amount: amounts[i],
        date: d(i * 3 + 1), accountId: 'acc_cash', note: '', returned: false, returnedAmount: 0,
      });
      if (i < 3) {
        udpiEntries.push({
          id: id('udpi', 20 + i), person: person, direction: directions[i] === 'lent' ? 'borrowed' : 'lent',
          amount: Math.floor(amounts[i] * 0.3), date: d(i), accountId: 'acc_cash', note: 'Partial return', returned: false, returnedAmount: 0,
        });
      }
    });

    var ledger = [];
    var expenses = [
      ['Shop Rent', 'rent', 25000], ['Electricity Bill', 'utility', 4500], ['Staff Salary', 'salary', 35000],
      ['Transport', 'transport', 3000], ['Tea & Misc', 'misc', 2000],
    ];
    expenses.forEach(function(exp, i) {
      ledger.push({ id: id('le', i), type: 'expense', amount: exp[2], category: exp[1], accountId: 'acc_cash', date: d(i * 2), note: exp[0] });
    });
    ledger.push({ id: id('le', 10), type: 'income', amount: 50000, category: 'sales', accountId: 'acc_cash', date: d(1), note: 'Cash sales' });
    ledger.push({ id: id('le', 11), type: 'income', amount: 18000, category: 'collection', accountId: 'acc_ep', date: d(0), note: 'EasyPaisa collection' });

    return {
      customers: customers, products: products, plans: plans, udpiEntries: udpiEntries, ledger: ledger, invoices: [], staff: [],
      settings: {
        businessName: 'Sadar Electronics', shopName: 'Sadar Electronics', ownerName: 'Rehan Malik', city: 'Jhang',
        graceDays: 3, lateFeeFlat: 500, lateFeePerDay: 0, maxLateFee: 2000,
        accounts: [
          { id: 'acc_cash', name: 'Cash in Hand', nameUr: 'نقد', emoji: '💵', balance: 50000 },
          { id: 'acc_ep', name: 'EasyPaisa', nameUr: 'ایزی پیسہ', emoji: '📱', balance: 18000 },
          { id: 'acc_bank', name: 'Bank', nameUr: 'بینک', emoji: '🏦', balance: 0 },
        ],
      },
    };
  }

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
    newPlan: { customerId: '', productId: '', totalPrice: '', downPayment: '', months: 6, customMonths: '', installmentAmount: '', interestType: 'percent', interest: 12, interestAmount: '', startDate: this.todayStr(), graceDays: 0, lateFeeFlat: 0, lateFeePerDay: 0, imei: '', chassisNo: '', engineNo: '', frequency: 'monthly', frequencyDays: 30, accountId: '' },
    paymentAmount: '',
    menuOpen: false,
    deletePlanModal: { open: false, planId: null, pinInput: '' },
    editPlanModal: { open: false, planId: null, pinInput: '', pinConfirmed: false, draftSchedule: [], draftImei: '', draftChassisNo: '', draftEngineNo: '', draftNotes: '' },
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
    newProduct: { name: '', nameUr: '', category: 'Mobile', price: '', costPrice: '', stock: '', emoji: '📦' },
    settings: { graceDays: 0, lateFeeFlat: 0, lateFeePerDay: 0, maxLateFee: 0, businessName: 'Sadar Electronics', ownerName: 'Rehan Malik', city: 'Lahore', accounts: [{ id: 'acc_cash', name: 'Cash in Hand', nameUr: 'نقد', emoji: '💵', balance: 0 }, { id: 'acc_ep', name: 'EasyPaisa', nameUr: 'ایزی پیسہ', emoji: '📱', balance: 0 }, { id: 'acc_bank', name: 'Bank', nameUr: 'بینک', emoji: '🏦', balance: 0 }] },
    searchQuery: '',
    darkMode: false,
    pinLocked: false,
    enteredPin: '',
    savedPin: '',
    paymentAccountId: '',
    selectedAccountId: null,
    addAccountOpen: false,
    newAccount: { name: '', nameUr: '', emoji: '💰', balance: '' },
    syncStatus: 'loading', // 'loading' | 'synced' | 'syncing' | 'offline' | 'error'
    syncError: '',
    ledger: null,
    udpiEntries: null,
    ledgerModal: { open: false, type: 'expense', amount: '', accountId: '', category: '', note: '', date: this.todayStr(), editId: null },
    ledgerFilter: 'all',
    ledgerSection: 'expenses',
    dayBookSection: 'all',
    ledgerMonthFilter: '',
    ledgerSearch: '',
    recurringModal: { open: false, editId: null, type: 'expense', amount: '', accountId: '', category: '', note: '', day: 1 },
    udpiModal: { open: false, editId: null, direction: 'lent', amount: '', person: '', accountId: '', note: '', date: this.todayStr(), dueDate: '', category: '', photo: null },
    udharCategoryFilter: '',
    installmentAutoSending: false,
    installmentMenu: null,
    reportAccounts: null,
    udharPerson: null,
    udharSearch: '',
    udharSort: 'recent',
    udharTab: 'parties',
    udharDateFrom: '',
    udharDateTo: '',
    udharReminderQueue: [],
    udharReminderDismissed: false,
    waStatus: 'disconnected',
    waQR: null,
    waModal: false,
    waPolling: null,
    waBotEnabled: false,
    waBotLog: [],
    waReminding: false,
    stockFilter: 'all',
    invoices: [],
    invoiceModal: { open: false, person: '', items: [{ desc: '', qty: 1, price: '' }], note: '', date: this.todayStr() },
    invoiceView: null,
    staff: [],
    staffModal: { open: false, editId: null, name: '', phone: '', role: '', salary: '', joinDate: '' },
    staffView: null,
    attendanceDate: this.todayStr(),
    salaryModal: { open: false, staffId: '', month: '', amount: '', advance: '', accountId: '', note: '' },
  };

  componentDidMount() {
    if (typeof window === 'undefined') return;

    const hostname = window.location.hostname;
    if (hostname.includes('demo')) {
      this._isDemo = true;
      const demo = this._generateDemoData();
      this.setState({ ...demo, pinLocked: false, syncStatus: 'synced', route: 'dashboard' });
      return;
    }

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
    const forceUdhar = hostname.includes('udhar') || hostname.includes('hisaab') || window.location.hash === '#udharbook';
    this.setState({ darkMode: dm, savedPin: pin, pinLocked: forceUdhar ? false : !!pin, ...(forceUdhar ? { route: 'udharbook' } : {}) }, () => {
      this.initSupabaseSync();
    });
    fetch('/api/whatsapp-status').then(r => r.json()).then(d => this.setState({ waStatus: d.status || 'disconnected' })).catch(() => {});
    this._onVisibility = () => {
      if (document.visibilityState === 'visible') this._refetchCloud();
    };
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  componentDidUpdate(_, prev) {
    if (typeof window === 'undefined' || this._isDemo) return;
    const { customers, products, plans, settings, ledger, udpiEntries, invoices, staff } = this.state;
    if (!customers) return;
    if (this._fromCloud) { this._fromCloud = false; return; }
    if (customers !== prev.customers || products !== prev.products || plans !== prev.plans || settings !== prev.settings || ledger !== prev.ledger || udpiEntries !== prev.udpiEntries || invoices !== prev.invoices || staff !== prev.staff) {
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
    const local = this.state.customers ? { customers: this.state.customers, products: this.state.products, plans: this.state.plans, settings: this.state.settings, ledger: this.state.ledger || [], udpiEntries: this.state.udpiEntries || [], invoices: this.state.invoices || [], staff: this.state.staff || [] } : null;
    const merged = local ? this._mergeData(local, d) : { customers: d.customers || [], products: d.products || [], plans: d.plans || [], settings: d.settings || this.state.settings, ledger: d.ledger || [], udpiEntries: d.udpiEntries || [], invoices: d.invoices || [], staff: d.staff || [] };
    const settings = merged.settings || this.state.settings;
    if (!settings.accounts || !settings.accounts.length) {
      settings.accounts = [{ id: 'acc_cash', name: 'Cash in Hand', nameUr: 'نقد', emoji: '💵', balance: 0 }, { id: 'acc_ep', name: 'EasyPaisa', nameUr: 'ایزی پیسہ', emoji: '📱', balance: 0 }, { id: 'acc_bank', name: 'Bank', nameUr: 'بینک', emoji: '🏦', balance: 0 }];
    }
    const cloudPin = settings.pin || '';
    if (cloudPin) { localStorage.setItem('aqsat_pin', cloudPin); }
    const payload = { customers: merged.customers, products: merged.products, plans: merged.plans, settings, ledger: merged.ledger || [], udpiEntries: merged.udpiEntries || [], invoices: merged.invoices || [], staff: merged.staff || [], syncStatus: 'synced' };
    if (cloudPin) payload.savedPin = cloudPin;
    localStorage.setItem('aqsat_data', JSON.stringify(merged));
    this.setState(payload, () => this.processRecurring());
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
          this.setState({ customers: localData.customers || [], products: localData.products || [], plans: localData.plans || [], settings: localData.settings || this.state.settings, ledger: localData.ledger || [], udpiEntries: localData.udpiEntries || [], invoices: localData.invoices || [], staff: localData.staff || [], syncStatus: 'synced' }, this.pushToSupabase);
        } else {
          this.seed();
          this.setState({ syncStatus: 'synced' });
        }
      }
    } catch(err) {
      let localData = null;
      try { const raw = localStorage.getItem('aqsat_data'); if (raw) localData = JSON.parse(raw); } catch(e) {}
      if (localData?.customers) this.setState({ customers: localData.customers || [], products: localData.products || [], plans: localData.plans || [], settings: localData.settings || this.state.settings, ledger: localData.ledger || [], udpiEntries: localData.udpiEntries || [], invoices: localData.invoices || [], staff: localData.staff || [] });
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
        this.setState({ customers: merged.customers, products: merged.products, plans: merged.plans, settings: merged.settings, ledger: merged.ledger || [], udpiEntries: merged.udpiEntries || [], syncStatus: 'synced', ...(cloudPin ? { savedPin: cloudPin } : {}) });
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
      ledger: mergeArr(local.ledger, cloud.ledger),
      udpiEntries: mergeArr(local.udpiEntries, cloud.udpiEntries),
      invoices: mergeArr(local.invoices, cloud.invoices),
      staff: mergeArr(local.staff, cloud.staff),
    };
  };

  pushToSupabase = async () => {
    const { customers, products, plans, settings, ledger, udpiEntries, invoices, staff } = this.state;
    if (!customers) return;
    this.setState({ syncStatus: 'syncing' });
    try {
      const { data: cloud } = await supabase.from('shops').select('data').eq('id', SHOP_ID).single();
      const localData = { customers, products, plans, settings, ledger: ledger || [], udpiEntries: udpiEntries || [], invoices: invoices || [], staff: staff || [] };
      const merged = cloud?.data ? this._mergeData(localData, cloud.data) : localData;
      localStorage.setItem('aqsat_data', JSON.stringify(merged));
      const { error } = await supabase.from('shops').upsert({ id: SHOP_ID, data: merged, updated_at: new Date().toISOString() });
      if (!error && merged !== localData) {
        this._fromCloud = true;
        this.setState({ customers: merged.customers, products: merged.products, plans: merged.plans, settings: merged.settings, ledger: merged.ledger || [], udpiEntries: merged.udpiEntries || [], invoices: merged.invoices || [], staff: merged.staff || [], syncStatus: 'synced' });
      } else {
        this.setState({ syncStatus: error ? 'error' : 'synced', syncError: error?.message || '' });
      }
    } catch(e) {
      localStorage.setItem('aqsat_data', JSON.stringify({ customers, products, plans, settings, ledger: ledger || [], invoices: invoices || [], staff: staff || [] }));
      const { error } = await supabase.from('shops').upsert({ id: SHOP_ID, data: { customers, products, plans, settings, ledger: ledger || [], invoices: invoices || [], staff: staff || [] }, updated_at: new Date().toISOString() });
      this.setState({ syncStatus: error ? 'error' : 'synced', syncError: error?.message || '' });
    }
  };

  seed() {
    this.setState({ customers: [], products: [], plans: [], ledger: [], udpiEntries: [] });
  }

  resetAllData = () => {
    const rp = this.state.settings.resetPin || '';
    if (!rp) { alert('Set a 6-digit Reset PIN in Settings first.\nپہلے سیٹنگز میں 6 ہندسوں کا ری سیٹ PIN مقرر کریں۔'); return; }
    this.requireResetPin(() => {
      if (!confirm('⚠️ FINAL WARNING\nThis will permanently delete ALL customers, products, and plans.\n\nیہ تمام گاہکوں، پروڈکٹس اور پلانز کو مستقل طور پر ڈیلیٹ کر دے گا۔')) return;
      localStorage.removeItem('aqsat_data');
      this.setState({ customers: [], products: [], plans: [], ledger: [], udpiEntries: [], route: 'dashboard' });
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
  _localDateStr(d) {
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
  activePlans() { return (this.state.plans || []).filter(p => !p._deleted); }
  getAccounts() { return (this.state.settings.accounts || []).filter(a => !a._deleted); }
  accountBalance(accId) {
    return this.accExpenseBal(accId) + this.accPlanBal(accId) + this.accUdharBal(accId);
  }
  // Item-type buckets. 'Bike' is legacy data for the same thing as 'Motorcycle',
  // so both are accepted here or those products lose their vehicle fields.
  _phoneCats = ['Mobile', 'Laptop', 'Tablet'];
  _vehicleCats = ['Car', 'Motorcycle', 'Bike', 'Rickshaw', 'Loader'];
  isPhoneCat(cat) { return this._phoneCats.includes(cat); }
  isVehicleCat(cat) { return this._vehicleCats.includes(cat); }

  _isPlanLedgerEntry(le) {
    return le && (le.category === 'Product Cost' || le.category === 'Down Payment');
  }
  accExpenseBal(accId) {
    const acc = this.getAccounts().find(a => a.id === accId);
    const base = acc ? (parseFloat(acc.balance) || 0) : 0;
    return base + (this.state.ledger || []).filter(le => !le._deleted && le.accountId === accId && !le.udpiRef && le.category !== 'Udhar' && le.category !== 'Udhar Return' && !this._isPlanLedgerEntry(le))
      .reduce((sum, le) => sum + (le.type === 'income' ? le.amount : -le.amount), 0);
  }
  accPlanBal(accId) {
    const fromInstallments = this.activePlans().reduce((sum, pl) => {
      return sum + (pl.schedule || []).filter(s => s.paid && s.accountId === accId)
        .reduce((a, s) => a + (s.amountPaid || s.amount || 0), 0);
    }, 0);
    const fromLedger = (this.state.ledger || []).filter(le => !le._deleted && le.accountId === accId && this._isPlanLedgerEntry(le))
      .reduce((sum, le) => sum + (le.type === 'income' ? le.amount : -le.amount), 0);
    return fromInstallments + fromLedger;
  }
  accUdharBal(accId) {
    return this.activeUdpiEntries().filter(u => u.accountId === accId)
      .reduce((sum, u) => {
        if (u.returned) return sum;
        return sum + (u.direction === 'borrowed' ? u.amount : -u.amount);
      }, 0);
  }
  activeLedger() { return (this.state.ledger || []).filter(le => !le._deleted); }
  ledgerCategories() {
    return {
      income: [
        { emoji: '💵', name: 'Sales', nameUr: 'فروخت' },
        { emoji: '🔧', name: 'Repair', nameUr: 'مرمت' },
        { emoji: '📦', name: 'Wholesale', nameUr: 'تھوک' },
        { emoji: '🤝', name: 'Commission', nameUr: 'کمیشن' },
        { emoji: '💡', name: 'Other Income', nameUr: 'دیگر آمدنی' },
      ],
      expense: [
        { emoji: '🏠', name: 'Rent', nameUr: 'کرایہ' },
        { emoji: '⚡', name: 'Electricity', nameUr: 'بجلی' },
        { emoji: '🚗', name: 'Transport', nameUr: 'سفر' },
        { emoji: '🍔', name: 'Food', nameUr: 'کھانا' },
        { emoji: '🛒', name: 'Supplies', nameUr: 'سامان' },
        { emoji: '💵', name: 'Salary', nameUr: 'تنخواہ' },
        { emoji: '📱', name: 'Phone/Internet', nameUr: 'فون/انٹرنیٹ' },
        { emoji: '🏥', name: 'Health', nameUr: 'صحت' },
        { emoji: '💡', name: 'Other Expense', nameUr: 'دیگر خرچ' },
      ],
    };
  }

  // Categories the app creates itself — never offered as user-pickable options.
  _reservedCategories = ['Product Cost', 'Down Payment', 'Udhar', 'Udhar Return'];
  // Built-in categories plus any custom ones the user has typed before, so a
  // category added once stays available for future entries.
  getCategoryList(type) {
    const builtin = type === 'income' ? this.ledgerCategories().income : this.ledgerCategories().expense;
    const known = new Set([...builtin.map(c => c.name), ...this._reservedCategories]);
    const custom = [];
    (this.state.ledger || []).forEach(le => {
      if (le._deleted || le.type !== type || !le.category || known.has(le.category)) return;
      custom.push(le.category);
    });
    this.getRecurring().forEach(r => {
      if (r.type !== type || !r.category || known.has(r.category)) return;
      custom.push(r.category);
    });
    return [...builtin, ...[...new Set(custom)].sort().map(name => ({ emoji: '🏷️', name, nameUr: '' }))];
  }
  categoryEmojiMap() {
    const map = {};
    [...this.getCategoryList('income'), ...this.getCategoryList('expense')].forEach(c => { map[c.name] = c.emoji; });
    return map;
  }
  // Category chips shared by the ledger and recurring modals. Selecting the
  // trailing "Add" chip swaps the row for a free-text field.
  categoryPicker(m, setM) {
    const h = this.h;
    const accent = m.type === 'income' ? '#0f6b4b' : '#b91c1c';
    const activeBg = m.type === 'income' ? '#eaf5ee' : '#fef2f2';
    if (m.category === '__add__') {
      const save = v => setM('category', (v || '').trim());
      return h('div', { style: { display: 'flex', gap: 6 } },
        h('input', { autoFocus: true, type: 'text', placeholder: 'New category name… / نیا زمرہ', maxLength: 40,
          style: { flex: 1, border: '1.5px solid ' + accent, borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' },
          onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); save(e.target.value); } else if (e.key === 'Escape') setM('category', ''); },
          onBlur: e => save(e.target.value) }),
        h('button', { type: 'button', onClick: () => setM('category', ''), style: { padding: '8px 12px', borderRadius: 8, background: '#f4f1e6', fontSize: 12, fontWeight: 600, color: '#7a7663' } }, '✕'),
      );
    }
    const list = this.getCategoryList(m.type);
    // A just-typed category has no saved entry yet, so add it here to keep it visible and selected.
    const opts = m.category && !list.some(c => c.name === m.category) ? [...list, { emoji: '🏷️', name: m.category }] : list;
    return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
      ...opts.map(cat => h('button', { key: cat.name, onClick: () => setM('category', cat.name), style: { padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: m.category === cat.name ? activeBg : '#f4f1e6', color: m.category === cat.name ? accent : '#3a4a3f', border: '1.5px solid ' + (m.category === cat.name ? accent : '#ece8dc') } }, cat.emoji + ' ' + cat.name)),
      h('button', { key: '__add__', onClick: () => setM('category', '__add__'), style: { padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#fdfcf8', color: accent, border: '1.5px dashed ' + accent } }, '➕ Add'),
    );
  }

  _builtinCities = ['Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Multan','Peshawar','Quetta','Sialkot','Gujranwala','Gujrat','Bahawalpur','Sargodha','Rahim Yar Khan','Jhang','Chiniot','Shorkot','Sahiwal'];
  getCityList() {
    const builtin = new Set(this._builtinCities);
    const custom = [];
    (this.state.customers || []).forEach(c => { if (c.city && !c._deleted && !builtin.has(c.city)) custom.push(c.city); });
    return [...this._builtinCities, ...([...new Set(custom)].sort())];
  }
  cityField(value, onChange, style) {
    const h = this.h;
    if (value === '__add__') {
      return h('div', { style: { display: 'flex', gap: 6 } },
        h('input', { autoFocus: true, type: 'text', placeholder: 'Type city name...', style: { ...style, flex: 1 }, onKeyDown: e => { if (e.key === 'Enter' && e.target.value.trim()) onChange(e.target.value.trim()); }, onBlur: e => { if (e.target.value.trim()) onChange(e.target.value.trim()); else onChange(''); } }),
        h('button', { type: 'button', onClick: () => onChange(''), style: { padding: '6px 10px', borderRadius: 8, background: '#f4f1e6', fontSize: 11, fontWeight: 600, color: '#7a7663' } }, '✕'),
      );
    }
    const cities = this.getCityList();
    const isCustom = value && !this._builtinCities.includes(value) && !cities.includes(value);
    const opts = isCustom ? [...cities, value] : cities;
    return h('select', { value: value, onChange: e => onChange(e.target.value), style },
      h('option', { value: '' }, 'Select city…'),
      ...opts.map(c => h('option', { key: c, value: c }, c)),
      h('option', { value: '__add__' }, '➕ Add new city…'),
    );
  }
  activeUdpiEntries() { return (this.state.udpiEntries || []).filter(u => !u._deleted); }
  getRecurring() { return (this.state.settings.recurring || []); }

  processRecurring = () => {
    const now = new Date();
    const pfx = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const day = now.getDate();
    const recurring = this.getRecurring();
    if (!recurring.length) return;
    let added = 0;
    const ledger = [...(this.state.ledger || [])];
    const updatedRec = recurring.map(r => {
      if (r.lastAdded === pfx) return r;
      const targetDay = Math.min(r.day || 1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
      if (day < targetDay) return r;
      const dateStr = pfx + '-' + String(targetDay).padStart(2, '0');
      const txId = 'le_rec_' + r.id + '_' + pfx;
      if (ledger.some(le => le.id === txId)) return { ...r, lastAdded: pfx };
      ledger.unshift({ id: txId, type: r.type, amount: r.amount, accountId: r.accountId, category: r.category, note: r.note || '(recurring)', date: dateStr });
      added++;
      return { ...r, lastAdded: pfx };
    });
    if (added) {
      const settings = { ...this.state.settings, recurring: updatedRec };
      this.setState({ ledger, settings });
    }
  };

  openRecurringModal = (editId) => {
    const accs = this.getAccounts();
    if (editId) {
      const r = this.getRecurring().find(x => x.id === editId);
      if (!r) return;
      this.setState({ recurringModal: { open: true, editId, type: r.type, amount: String(r.amount), accountId: r.accountId, category: r.category, note: r.note || '', day: r.day } });
    } else {
      this.setState({ recurringModal: { open: true, editId: null, type: 'expense', amount: '', accountId: accs.length > 0 ? accs[0].id : '', category: '', note: '', day: 1 } });
    }
  };
  closeRecurringModal = () => this.setState({ recurringModal: { ...this.state.recurringModal, open: false } });
  submitRecurring = () => {
    const m = this.state.recurringModal;
    const amount = parseFloat(m.amount);
    if (!amount || amount <= 0) { alert('Enter a valid amount'); return; }
    if (!m.category || m.category === '__add__') { alert('Select a category'); return; }
    if (!m.accountId) { alert('Select an account'); return; }
    const recurring = [...this.getRecurring()];
    if (m.editId) {
      const idx = recurring.findIndex(x => x.id === m.editId);
      if (idx >= 0) recurring[idx] = { ...recurring[idx], type: m.type, amount, accountId: m.accountId, category: m.category, note: m.note, day: m.day };
    } else {
      recurring.push({ id: 'rec_' + Date.now().toString(36), type: m.type, amount, accountId: m.accountId, category: m.category, note: m.note, day: m.day });
    }
    this.setState({ settings: { ...this.state.settings, recurring }, recurringModal: { ...m, open: false } });
  };
  deleteRecurring = (id) => {
    if (!confirm('Delete this recurring entry?\nیہ بار بار کا اندراج حذف کریں؟')) return;
    const recurring = this.getRecurring().filter(r => r.id !== id);
    this.setState({ settings: { ...this.state.settings, recurring } });
  };

  openUdpiModal = (editId, prefillPerson) => {
    const accs = this.getAccounts();
    if (editId) {
      this.requirePin(() => {
        const u = this.activeUdpiEntries().find(x => x.id === editId);
        if (!u) return;
        this.setState({ udpiModal: { open: true, editId, direction: u.direction, amount: String(u.amount), person: u.person, accountId: u.accountId, note: u.note || '', date: u.date, dueDate: u.dueDate || '', category: u.category || '', photo: u.photo || null } });
      });
    } else {
      this.setState({ udpiModal: { open: true, editId: null, direction: 'lent', amount: '', person: prefillPerson || '', accountId: accs.length > 0 ? accs[0].id : '', note: '', date: this.todayStr(), dueDate: '', category: '', photo: null } });
    }
  };
  closeUdpiModal = () => this.setState({ udpiModal: { ...this.state.udpiModal, open: false } });
  submitUdpiEntry = () => {
    const m = this.state.udpiModal;
    const amount = parseFloat(m.amount);
    if (!amount || amount <= 0) { alert('Enter a valid amount'); return; }
    if (!m.person.trim()) { alert('Enter person name / نام درج کریں'); return; }
    if (!m.accountId) { alert('Select an account'); return; }
    const udpiEntries = [...(this.state.udpiEntries || [])];
    const ledger = [...(this.state.ledger || [])];
    const person = m.person.trim();
    if (m.editId) {
      const idx = udpiEntries.findIndex(x => x.id === m.editId);
      if (idx >= 0) {
        const old = udpiEntries[idx];
        udpiEntries[idx] = { ...old, direction: m.direction, amount, person, accountId: m.accountId, note: m.note, date: m.date, dueDate: m.dueDate || '', category: m.category || '', photo: m.photo || old.photo || null };
        const li = ledger.findIndex(l => l.udpiRef === m.editId);
        if (li >= 0) ledger[li] = { ...ledger[li], type: m.direction === 'lent' ? 'expense' : 'income', amount, accountId: m.accountId, date: m.date, note: (m.direction === 'lent' ? 'Gave' : 'Got') + ' — ' + person + (m.note ? ' (' + m.note + ')' : ''), category: 'Udhar' };
      }
    } else {
      const udId = 'ud_' + Date.now().toString(36);
      udpiEntries.unshift({ id: udId, direction: m.direction, amount, person, accountId: m.accountId, note: m.note, date: m.date, dueDate: m.dueDate || '', category: m.category || '', photo: m.photo || null, returned: false, returnedDate: '', returnedAmount: 0, partialReturns: [] });
      ledger.unshift({ id: 'le_' + Date.now().toString(36), type: m.direction === 'lent' ? 'expense' : 'income', amount, accountId: m.accountId, category: 'Udhar', note: (m.direction === 'lent' ? 'Gave' : 'Got') + ' — ' + person + (m.note ? ' (' + m.note + ')' : ''), date: m.date, udpiRef: udId });
    }
    this.setState({ udpiEntries, ledger, udpiModal: { ...m, open: false } });
  };
  markUdpiReturned = (id) => {
    this.requirePin(() => {
      const u = this.activeUdpiEntries().find(x => x.id === id);
      if (!u) return;
      const remaining = u.amount - (u.returnedAmount || 0);
      const input = prompt('Return amount / واپسی رقم\nRemaining: ' + this.fmtPKR(remaining), String(remaining));
      if (input === null) return;
      const returnAmt = parseFloat(input);
      if (!returnAmt || returnAmt <= 0) return;
      const newReturnedAmount = Math.min((u.returnedAmount || 0) + returnAmt, u.amount);
      const fullyReturned = newReturnedAmount >= u.amount;
      const partialReturns = [...(u.partialReturns || []), { amount: returnAmt, date: this.todayStr(), id: 'pr_' + Date.now().toString(36) }];
      const udpiEntries = (this.state.udpiEntries || []).map(x => x.id === id ? { ...x, returnedAmount: newReturnedAmount, returned: fullyReturned, returnedDate: fullyReturned ? this.todayStr() : '', partialReturns } : x);
      const ledger = [...(this.state.ledger || [])];
      const returnType = u.direction === 'lent' ? 'income' : 'expense';
      ledger.unshift({ id: 'le_' + Date.now().toString(36), type: returnType, amount: returnAmt, accountId: u.accountId, category: 'Udhar Return', note: (u.direction === 'lent' ? 'Got back' : 'Paid back') + ' — ' + u.person + (fullyReturned ? ' (settled)' : ''), date: this.todayStr(), udpiRef: id });
      this.setState({ udpiEntries, ledger });
    });
  };
  _getUdharPersonPhone = (personName) => {
    const c = (this.state.customers || []).find(x => x.name.toLowerCase() === personName.toLowerCase());
    return c ? c.phone : null;
  };
  shareUdharStatement = (personName) => {
    const entries = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase());
    entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    let lent = 0, borrowed = 0;
    entries.forEach(u => { if (u.direction === 'lent' && !u.returned) lent += u.amount; else if (u.direction === 'borrowed' && !u.returned) borrowed += u.amount; });
    const balance = lent - borrowed;
    const shopName = this.state.settings.shopName || 'Shop';
    let msg = '📋 *' + shopName + ' — Account Statement*\n';
    msg += '👤 ' + personName + '\n';
    msg += '📅 ' + new Date().toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }) + '\n';
    msg += '━━━━━━━━━━━━━━━\n';
    entries.forEach(u => {
      const isLent = u.direction === 'lent';
      const status = u.returned ? ' ✓' : (u.returnedAmount > 0 ? ' (partial ' + this.fmtPKR(u.returnedAmount) + ')' : '');
      msg += (isLent ? '🔴 Gave' : '🟢 Got') + ' ' + this.fmtPKR(u.amount) + ' — ' + u.date + (u.note ? ' (' + u.note + ')' : '') + status + '\n';
    });
    msg += '━━━━━━━━━━━━━━━\n';
    msg += '💰 *Balance: ' + this.fmtPKR(Math.abs(balance)) + '*\n';
    msg += balance > 0 ? '📌 آپ کے ذمے ہے / You owe us' : balance < 0 ? '📌 ہمارے ذمے ہے / We owe you' : '✓ All clear / برابر';
    const phone = this._getUdharPersonPhone(personName);
    const url = phone ? 'https://wa.me/' + phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(msg) : 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  };
  deleteUdpiEntry = (id) => {
    this.requirePin(() => {
      if (!confirm('Delete this entry?\nیہ اندراج حذف کریں؟')) return;
      const udpiEntries = (this.state.udpiEntries || []).map(u => u.id === id ? { ...u, _deleted: true } : u);
      const ledger = (this.state.ledger || []).map(l => l.udpiRef === id ? { ...l, _deleted: true } : l);
      this.setState({ udpiEntries, ledger });
    });
  };

  deleteAllUdpiForPerson = (personName) => {
    this.requirePin(() => {
      const count = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase()).length;
      if (!confirm('Delete ALL ' + count + ' entries for ' + personName + '?\nکیا آپ ' + personName + ' کے تمام ' + count + ' اندراجات حذف کرنا چاہتے ہیں؟\n\nThis cannot be undone!')) return;
      const ids = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase()).map(u => u.id);
      const udpiEntries = (this.state.udpiEntries || []).map(u => ids.includes(u.id) ? { ...u, _deleted: true } : u);
      const ledger = (this.state.ledger || []).map(l => l.udpiRef && ids.includes(l.udpiRef) ? { ...l, _deleted: true } : l);
      this.setState({ udpiEntries, ledger, udharPerson: null });
    });
  };

  toggleUdharPin = (name) => {
    const s = { ...(this.state.settings || {}) };
    const pins = [...(s.udharPins || [])];
    const idx = pins.indexOf(name);
    if (idx >= 0) pins.splice(idx, 1); else pins.push(name);
    s.udharPins = pins;
    this.setState({ settings: s });
  };
  isUdharPinned = (name) => ((this.state.settings || {}).udharPins || []).includes(name);
  setUdharMeta = (name, key, value) => {
    const s = { ...(this.state.settings || {}) };
    const meta = { ...(s.udharMeta || {}) };
    meta[name] = { ...(meta[name] || {}), [key]: value };
    s.udharMeta = meta;
    this.setState({ settings: s });
  };
  getUdharMeta = (name) => ((this.state.settings || {}).udharMeta || {})[name] || {};
  getUdharTrust = (personName) => {
    const entries = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase());
    const lentEntries = entries.filter(u => u.direction === 'lent');
    if (lentEntries.length === 0) return { score: 0, label: 'New', color: '#7a7663' };
    const settled = lentEntries.filter(u => u.returned).length;
    const total = lentEntries.length;
    const rate = total > 0 ? settled / total : 0;
    const onTime = lentEntries.filter(u => u.returned && u.dueDate && u.returnedDate && u.returnedDate <= u.dueDate).length;
    const withDue = lentEntries.filter(u => u.returned && u.dueDate).length;
    const onTimeRate = withDue > 0 ? onTime / withDue : 1;
    const combined = (rate * 0.6 + onTimeRate * 0.4);
    if (total <= 1) return { score: 0, label: 'New', color: '#7a7663', rate: Math.round(rate * 100) };
    if (combined >= 0.8) return { score: 5, label: 'Excellent', color: '#0f6b4b', rate: Math.round(rate * 100) };
    if (combined >= 0.6) return { score: 4, label: 'Good', color: '#15803d', rate: Math.round(rate * 100) };
    if (combined >= 0.4) return { score: 3, label: 'Average', color: '#d97706', rate: Math.round(rate * 100) };
    if (combined >= 0.2) return { score: 2, label: 'Poor', color: '#ea580c', rate: Math.round(rate * 100) };
    return { score: 1, label: 'Risky', color: '#b91c1c', rate: Math.round(rate * 100) };
  };

  bulkSettle = (personName) => {
    const entries = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase() && !u.returned);
    if (entries.length === 0) { alert('No pending entries to settle.'); return; }
    const total = entries.reduce((s, u) => s + (u.amount - (u.returnedAmount || 0)), 0);
    if (!confirm('Settle all ' + entries.length + ' pending entries for ' + personName + '?\nTotal: ' + this.fmtPKR(total) + '\n\nسب بقایا اندراجات کو برابر کریں؟')) return;
    const today = this.todayStr();
    const udpiEntries = (this.state.udpiEntries || []).map(u => {
      if (u.person.trim().toLowerCase() === personName.toLowerCase() && !u.returned && !u._deleted) {
        return { ...u, returned: true, returnedDate: today, returnedAmount: u.amount };
      }
      return u;
    });
    this.setState({ udpiEntries });
    const phone = this._getUdharPersonPhone(personName);
    if (phone) {
      const msg = 'Assalam o Alaikum ' + personName + '! ✅\n\nAp ka hisaab baraabar ho gaya hai.\nTotal settled: ' + this.fmtPKR(total) + '\n\nShukriya! 🙏\n\n— ' + (this.state.settings.shopName || 'Shop');
      if (confirm('Send settlement receipt via WhatsApp?\nواٹس ایپ پر تصفیہ رسید بھیجیں؟')) {
        window.open('https://wa.me/' + phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(msg), '_blank');
      }
    }
  };
  exportUdharBook = () => {
    const parties = this._getUdharParties();
    const entries = this.activeUdpiEntries();
    const today = this.todayStr();
    const shopName = this.state.settings.shopName || 'Shop';
    let text = '📒 UDHAR BOOK — ' + shopName + '\n';
    text += '📅 ' + new Date(today + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }) + '\n';
    text += '━━━━━━━━━━━━━━━━━━━\n\n';
    const totalR = parties.reduce((s, p) => s + Math.max(0, p.balance), 0);
    const totalP = parties.reduce((s, p) => s + Math.max(0, -p.balance), 0);
    text += '💰 Net Position: ' + (totalR >= totalP ? '+' : '-') + this.fmtPKR(Math.abs(totalR - totalP)) + '\n';
    text += '📈 You\'ll Get: ' + this.fmtPKR(totalR) + ' (' + parties.filter(p => p.balance > 0).length + ' people)\n';
    text += '📉 You\'ll Give: ' + this.fmtPKR(totalP) + ' (' + parties.filter(p => p.balance < 0).length + ' people)\n\n';
    parties.filter(p => p.balance !== 0).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).forEach(p => {
      text += (p.balance > 0 ? '🔴 ' : '🟢 ') + p.name + ': ' + this.fmtPKR(Math.abs(p.balance)) + (p.balance > 0 ? ' (receivable)' : ' (payable)') + '\n';
    });
    text += '\n━━━━━━━━━━━━━━━━━━━\nTotal entries: ' + entries.length + ' | Parties: ' + parties.length + '\nGenerated by Aqsat';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert('Report copied to clipboard!\nرپورٹ کلپ بورڈ پر کاپی ہو گئی'));
    } else {
      prompt('Copy this report:', text);
    }
  };
  printUdharStatement = (personName) => {
    const entries = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase());
    entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const shopName = (this.state.settings || {}).shopName || 'Aqsat';
    let lent = 0, borrowed = 0, runBal = 0;
    entries.forEach(u => { if (u.direction === 'lent' && !u.returned) lent += u.amount - (u.returnedAmount || 0); if (u.direction === 'borrowed' && !u.returned) borrowed += u.amount - (u.returnedAmount || 0); });
    const balance = lent - borrowed;
    const rows = entries.map(u => {
      const amt = u.amount - (u.returnedAmount || 0);
      if (!u.returned) { if (u.direction === 'lent') runBal += amt; else runBal -= amt; }
      return '<tr><td>' + u.date + '</td><td>' + (u.note || (u.direction === 'lent' ? 'Gave' : 'Got')) + '</td><td>' + (u.category || '-') + '</td><td style="color:' + (u.direction === 'lent' ? '#dc2626' : '#059669') + ';font-weight:700">' + (u.direction === 'lent' ? '-' : '+') + this.fmtPKR(u.amount) + '</td><td>' + (u.returned ? '✓ Settled' : this.fmtPKR(runBal)) + '</td><td>' + (u.dueDate || '-') + '</td></tr>';
    }).join('');
    const html = '<!DOCTYPE html><html><head><title>Statement — ' + personName + '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;padding:24px;color:#1e293b;max-width:800px;margin:0 auto}h1{font-size:22px;margin-bottom:4px}h2{font-size:14px;color:#64748b;margin-bottom:20px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f172a;padding-bottom:16px;margin-bottom:20px}.summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}.summary div{background:#f8fafc;border-radius:8px;padding:12px;text-align:center}.summary .label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;font-weight:700}.summary .val{font-size:20px;font-weight:800;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#0f172a;color:white;padding:8px 10px;text-align:left;font-weight:700;font-size:11px}td{padding:8px 10px;border-bottom:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}.footer{margin-top:20px;padding-top:12px;border-top:2px solid #0f172a;display:flex;justify-content:space-between;font-size:11px;color:#64748b}@media print{body{padding:12px}button{display:none !important}}</style></head><body>' +
      '<div class="header"><div><h1>' + shopName + '</h1><h2>Udhar Statement — ' + personName + '</h2></div><div style="text-align:right;font-size:12px;color:#64748b"><div>Date: ' + this.todayStr() + '</div><div>Entries: ' + entries.length + '</div></div></div>' +
      '<div class="summary"><div><div class="label">Total Gave</div><div class="val" style="color:#dc2626">' + this.fmtPKR(entries.filter(u => u.direction === 'lent').reduce((s, u) => s + u.amount, 0)) + '</div></div><div><div class="label">Total Got</div><div class="val" style="color:#059669">' + this.fmtPKR(entries.filter(u => u.direction === 'borrowed').reduce((s, u) => s + u.amount, 0)) + '</div></div><div><div class="label">Balance</div><div class="val" style="color:' + (balance > 0 ? '#dc2626' : '#059669') + '">' + this.fmtPKR(Math.abs(balance)) + '</div><div style="font-size:10px;color:#64748b">' + (balance > 0 ? 'Receivable' : balance < 0 ? 'Payable' : 'Clear') + '</div></div></div>' +
      '<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Balance</th><th>Due Date</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="footer"><span>Generated by ' + shopName + ' · Udhar Book</span><span>Printed on ' + new Date().toLocaleString() + '</span></div>' +
      '<div style="text-align:center;margin-top:16px"><button onclick="window.print()" style="padding:10px 24px;border-radius:8px;background:#0f172a;color:white;font-weight:700;border:none;cursor:pointer;font-size:13px">🖨 Print / Save PDF</button></div></body></html>';
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    else alert('Popup blocked. Please allow popups for this site.');
  };
  exportUdharCSV = () => {
    const entries = this.activeUdpiEntries();
    const parties = this._getUdharParties();
    let csv = 'Date,Person,Direction,Amount,Returned Amount,Note,Category,Due Date,Settled,Account\n';
    entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const accs = this.getAccounts();
    entries.forEach(u => {
      const acc = accs.find(a => a.id === u.accountId);
      csv += [u.date, '"' + u.person.replace(/"/g, '""') + '"', u.direction, u.amount, u.returnedAmount || 0, '"' + (u.note || '').replace(/"/g, '""') + '"', u.category || '', u.dueDate || '', u.returned ? 'Yes' : 'No', acc ? acc.name : ''].join(',') + '\n';
    });
    csv += '\n\nSummary\n';
    csv += 'Total Parties,' + parties.length + '\n';
    csv += 'Total Receivable,' + parties.reduce((s, p) => s + Math.max(0, p.balance), 0) + '\n';
    csv += 'Total Payable,' + parties.reduce((s, p) => s + Math.max(0, -p.balance), 0) + '\n';
    csv += 'Total Entries,' + entries.length + '\n';
    csv += 'Generated,' + new Date().toLocaleString() + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'udhar-book-' + this.todayStr() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  handleUdharPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Photo too large (max 2MB)\nتصویر بہت بڑی ہے'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      this.setState({ udpiModal: { ...this.state.udpiModal, photo: reader.result } });
    };
    reader.readAsDataURL(file);
  };
  shareUdharBookWhatsApp = () => {
    const parties = this._getUdharParties();
    const today = this.todayStr();
    const shopName = this.state.settings.shopName || 'Shop';
    let text = '📒 UDHAR BOOK — ' + shopName + '\n📅 ' + new Date(today + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }) + '\n\n';
    const totalR = parties.reduce((s, p) => s + Math.max(0, p.balance), 0);
    const totalP = parties.reduce((s, p) => s + Math.max(0, -p.balance), 0);
    text += '💰 Net: ' + (totalR >= totalP ? '+' : '-') + this.fmtPKR(Math.abs(totalR - totalP)) + '\n\n';
    parties.filter(p => p.balance !== 0).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).forEach(p => {
      text += (p.balance > 0 ? '🔴 ' : '🟢 ') + p.name + ': ' + this.fmtPKR(Math.abs(p.balance)) + '\n';
    });
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  };
  calcUdharInterest = (personName) => {
    const entries = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase() && u.direction === 'lent' && !u.returned);
    if (entries.length === 0) { alert('No outstanding amounts to calculate interest on.'); return; }
    const rateStr = prompt('Enter monthly interest rate (%):\nماہانہ سود کی شرح (فیصد) درج کریں:', '2');
    if (!rateStr) return;
    const rate = parseFloat(rateStr) / 100;
    const today = new Date(this.todayStr());
    let totalInterest = 0;
    let details = '';
    entries.forEach(u => {
      const start = new Date(u.date + 'T00:00:00');
      const months = Math.max(0, (today - start) / (30 * 86400000));
      const remaining = u.amount - (u.returnedAmount || 0);
      const interest = Math.round(remaining * rate * months);
      totalInterest += interest;
      details += u.note || 'Entry';
      details += ': ' + this.fmtPKR(remaining) + ' × ' + months.toFixed(1) + ' months = ' + this.fmtPKR(interest) + '\n';
    });
    alert('Interest Calculation for ' + personName + '\nRate: ' + rateStr + '% per month\n\n' + details + '\n━━━━━━━━━━━━━━━━━━━\nTotal Interest: ' + this.fmtPKR(totalInterest) + '\nPrincipal + Interest: ' + this.fmtPKR(entries.reduce((s, u) => s + (u.amount - (u.returnedAmount || 0)), 0) + totalInterest));
  };

  generateUdharStatement = (personName) => {
    const entries = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase());
    if (entries.length === 0) { alert('No entries found.'); return ''; }
    const sorted = [...entries].sort((a, b) => a.date > b.date ? 1 : -1);
    let text = '📄 Statement — ' + personName + '\n';
    text += '━'.repeat(30) + '\n';
    let runBal = 0;
    sorted.forEach(u => {
      const amt = u.amount - (u.returnedAmount || 0);
      if (u.direction === 'lent') { runBal += amt; text += u.date + ' | GAVE ' + this.fmtPKR(u.amount); }
      else { runBal -= amt; text += u.date + ' | GOT ' + this.fmtPKR(u.amount); }
      if (u.returned) text += ' ✓';
      else if (u.returnedAmount > 0) text += ' (partial ' + this.fmtPKR(u.returnedAmount) + ')';
      text += ' | Bal: ' + this.fmtPKR(runBal) + '\n';
    });
    text += '━'.repeat(30) + '\n';
    text += 'Balance: ' + this.fmtPKR(runBal) + '\n';
    text += 'Generated: ' + this.todayStr();
    return text;
  };
  shareStatementWhatsApp = (personName) => {
    const text = this.generateUdharStatement(personName);
    if (!text) return;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  };
  copyStatement = (personName) => {
    const text = this.generateUdharStatement(personName);
    if (!text) return;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => alert('Statement copied! / بیان کاپی ہوگیا!'));
    else alert(text);
  };
  remindViaWhatsApp = (personName) => {
    const entries = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase() && u.direction === 'lent' && !u.returned);
    if (entries.length === 0) { alert('No pending amounts for ' + personName); return; }
    const total = entries.reduce((s, u) => s + (u.amount - (u.returnedAmount || 0)), 0);
    const text = 'Assalam-o-Alaikum ' + personName + ',\n\nYaddhani / Reminder:\nAap per ' + this.fmtPKR(total) + ' baqaya hain.\n\n' + entries.map(u => '• ' + (u.note || 'Amount') + ': ' + this.fmtPKR(u.amount - (u.returnedAmount || 0)) + (u.dueDate ? ' (due: ' + u.dueDate + ')' : '')).join('\n') + '\n\nBara-e-karam jaldi ada karen.\nShukriya! 🙏';
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  };
  setUdharReminder = (personName) => {
    const days = prompt('Remind after how many days?\nکتنے دنوں بعد یاد دہانی؟', '7');
    if (!days) return;
    const d = parseInt(days);
    if (isNaN(d) || d < 1) { alert('Enter a valid number'); return; }
    const today = new Date(this.todayStr() + 'T00:00:00');
    today.setDate(today.getDate() + d);
    const reminderDate = today.toISOString().split('T')[0];
    this.setUdharMeta(personName, 'reminderDate', reminderDate);
    alert('Reminder set for ' + reminderDate + '\n' + personName + ' کے لیے یاد دہانی ' + reminderDate + ' کو');
  };
  sendWhatsAppAPI = async (phone, message) => {
    try {
      const resp = await fetch('/api/whatsapp-send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message }),
      });
      const data = await resp.json();
      return data;
    } catch (err) {
      return { error: err.message };
    }
  };
  sendAutoReminders = async () => {
    this.setState({ udharAutoSending: true });
    try {
      const resp = await fetch('/api/whatsapp-remind', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: 'auto' }),
      });
      const data = await resp.json();
      if (data.error) { alert('Error: ' + data.error); }
      else {
        const msg = 'Auto Reminders Sent!\n\n' +
          '✓ Sent: ' + data.sent + '\n' +
          (data.failed > 0 ? '✕ Failed: ' + data.failed + '\n' : '') +
          '\nDetails:\n' + (data.results || []).map(r => (r.ok ? '✓ ' : '✕ ') + r.name + (r.error ? ' — ' + r.error : '')).join('\n');
        alert(msg);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
    this.setState({ udharAutoSending: false });
  };
  sendSingleReminder = async (personName) => {
    const entries = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase() && u.direction === 'lent' && !u.returned);
    if (entries.length === 0) { alert('No pending amounts'); return; }
    const customer = (this.state.customers || []).find(c => c.name.toLowerCase() === personName.toLowerCase());
    if (!customer || !customer.phone) { alert('No phone number for ' + personName + '. Add it in customer details.'); return; }
    const total = entries.reduce((s, u) => s + (u.amount - (u.returnedAmount || 0)), 0);
    const message = 'Assalam-o-Alaikum ' + personName + ',\n\nYaddhani / Reminder:\nAap per ' + this.fmtPKR(total) + ' baqaya hain.\n\n' +
      entries.slice(0, 5).map(u => '• ' + (u.note || 'Amount') + ': ' + this.fmtPKR(u.amount - (u.returnedAmount || 0)) + (u.dueDate ? ' (due: ' + u.dueDate + ')' : '')).join('\n') +
      '\n\nBara-e-karam jaldi ada karen.\nShukriya! 🙏';
    this.setState({ udharAutoSending: true });
    const result = await this.sendWhatsAppAPI(customer.phone, message);
    this.setState({ udharAutoSending: false });
    if (result.ok) alert('✓ Reminder sent to ' + personName + ' via WhatsApp!');
    else if (result.error) {
      if (result.error.includes('not connected') || result.error.includes('not configured')) { alert('WhatsApp not connected.\nConnect your WhatsApp from Udhar Book header.\n\nواٹس ایپ منسلک نہیں۔'); this.setState({ waModal: true }); this.startWAPolling(); }
      else alert('Failed: ' + result.error);
    }
  };
  checkWhatsAppConfig = async () => {
    try {
      const resp = await fetch('/api/whatsapp-status');
      const data = await resp.json();
      return data.status === 'ready';
    } catch { return false; }
  };
  pollWhatsAppStatus = async () => {
    try {
      const resp = await fetch('/api/whatsapp-status');
      const data = await resp.json();
      this.setState({ waStatus: data.status, waQR: data.qr || null, waBotEnabled: data.botEnabled || false });
    } catch {}
  };
  startWAPolling = () => {
    this.pollWhatsAppStatus();
    if (this.state.waPolling) clearInterval(this.state.waPolling);
    const id = setInterval(() => this.pollWhatsAppStatus(), 3000);
    this.setState({ waPolling: id });
  };
  stopWAPolling = () => {
    if (this.state.waPolling) { clearInterval(this.state.waPolling); this.setState({ waPolling: null }); }
  };
  connectWhatsApp = async () => {
    try {
      await fetch('/api/whatsapp-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'connect' }) });
      this.setState({ waModal: true });
      this.startWAPolling();
    } catch (err) { alert('Failed to start WhatsApp: ' + err.message); }
  };
  disconnectWhatsApp = async () => {
    if (!confirm('Disconnect WhatsApp?\nواٹس ایپ منقطع کریں؟')) return;
    try {
      await fetch('/api/whatsapp-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disconnect' }) });
      this.setState({ waStatus: 'disconnected', waQR: null, waModal: false });
      this.stopWAPolling();
    } catch (err) { alert('Error: ' + err.message); }
  };
  toggleWABot = async () => {
    try {
      const resp = await fetch('/api/whatsapp-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bot-toggle', enabled: !this.state.waBotEnabled }) });
      const data = await resp.json();
      this.setState({ waBotEnabled: data.botEnabled });
    } catch (err) { alert('Error: ' + err.message); }
  };
  fetchBotLog = async () => {
    try {
      const resp = await fetch('/api/whatsapp-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bot-log' }) });
      const data = await resp.json();
      this.setState({ waBotLog: data.log || [] });
    } catch {}
  };
  sendWAReminders = async () => {
    if (!confirm('Send reminders to all overdue customers?\nتمام بقایا گاہکوں کو یاد دہانی بھیجیں؟')) return;
    this.setState({ waReminding: true });
    try {
      const resp = await fetch('/api/whatsapp-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send-reminders' }) });
      const data = await resp.json();
      alert('Sent: ' + (data.sent || 0) + ' | Failed: ' + (data.failed || 0) + '\nبھیجے: ' + (data.sent || 0) + ' | ناکام: ' + (data.failed || 0));
    } catch (err) { alert('Error: ' + err.message); }
    this.setState({ waReminding: false });
  };
  openInvoiceModal = (person) => {
    const items = [{ desc: '', qty: 1, price: '', productId: '' }];
    this.setState({ invoiceModal: { open: true, person: person || '', items, note: '', date: this.todayStr() } });
  };
  closeInvoiceModal = () => this.setState({ invoiceModal: { ...this.state.invoiceModal, open: false } });
  addInvoiceItem = () => {
    const m = this.state.invoiceModal;
    this.setState({ invoiceModal: { ...m, items: [...m.items, { desc: '', qty: 1, price: '', productId: '' }] } });
  };
  removeInvoiceItem = (idx) => {
    const m = this.state.invoiceModal;
    if (m.items.length <= 1) return;
    this.setState({ invoiceModal: { ...m, items: m.items.filter((_, i) => i !== idx) } });
  };
  setInvoiceItem = (idx, key, val) => {
    const m = this.state.invoiceModal;
    const items = m.items.map((it, i) => i === idx ? { ...it, [key]: val } : it);
    this.setState({ invoiceModal: { ...m, items } });
  };
  selectInvoiceProduct = (idx, productId) => {
    const p = this.activeProducts().find(x => x.id === productId);
    if (!p) return;
    const m = this.state.invoiceModal;
    const items = m.items.map((it, i) => i === idx ? { ...it, productId, desc: p.name, price: String(p.price) } : it);
    this.setState({ invoiceModal: { ...m, items } });
  };
  saveInvoice = () => {
    const m = this.state.invoiceModal;
    if (!m.person.trim()) { alert('Enter person name / نام درج کریں'); return; }
    const validItems = m.items.filter(it => it.desc && parseFloat(it.price) > 0);
    if (validItems.length === 0) { alert('Add at least one item / کم از کم ایک آئٹم شامل کریں'); return; }
    const total = validItems.reduce((s, it) => s + (parseFloat(it.price) || 0) * (parseInt(it.qty) || 1), 0);
    const invNum = (this.state.invoices.length + 1).toString().padStart(3, '0');
    const invoice = {
      id: 'inv_' + Date.now().toString(36),
      number: 'INV-' + new Date().getFullYear() + '-' + invNum,
      person: m.person.trim(),
      items: validItems.map(it => ({ desc: it.desc, qty: parseInt(it.qty) || 1, price: parseFloat(it.price) || 0, productId: it.productId || null })),
      total,
      note: m.note,
      date: m.date,
      shopName: this.state.settings.shopName || this.state.settings.businessName || 'Shop',
    };
    const udpiEntries = [...(this.state.udpiEntries || [])];
    udpiEntries.push({ id: 'udpi_' + Date.now().toString(36), direction: 'lent', amount: total, person: m.person.trim(), accountId: '', note: 'Invoice ' + invoice.number, date: m.date, returned: false, invoiceId: invoice.id });
    this.setState({ invoices: [...this.state.invoices, invoice], udpiEntries, invoiceModal: { ...m, open: false }, invoiceView: invoice.id });
  };
  shareInvoiceWhatsApp = (inv) => {
    const lines = [
      '📄 *' + inv.number + '*',
      '*' + (inv.shopName || 'Shop') + '*',
      '📅 ' + new Date(inv.date + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }),
      '',
      '*Bill To:* ' + inv.person,
      '─────────────',
    ];
    inv.items.forEach((it, i) => {
      lines.push((i + 1) + '. ' + it.desc + ' x' + it.qty + ' = ' + this.fmtPKR(it.price * it.qty));
    });
    lines.push('─────────────');
    lines.push('*Total: ' + this.fmtPKR(inv.total) + '*');
    if (inv.note) lines.push('\n📝 ' + inv.note);
    lines.push('\nشکریہ 🙏');
    const msg = encodeURIComponent(lines.join('\n'));
    window.open('https://wa.me/?text=' + msg, '_blank');
  };

  activeStaff() { return (this.state.staff || []).filter(s => !s._deleted); }

  openStaffModal = (editId) => {
    if (editId) {
      const s = this.activeStaff().find(x => x.id === editId);
      if (!s) return;
      this.requirePin(() => this.setState({ staffModal: { open: true, editId, name: s.name, phone: s.phone || '', role: s.role || '', salary: String(s.salary || ''), joinDate: s.joinDate || '' } }));
    } else {
      this.setState({ staffModal: { open: true, editId: null, name: '', phone: '', role: '', salary: '', joinDate: this.todayStr() } });
    }
  };
  closeStaffModal = () => this.setState({ staffModal: { ...this.state.staffModal, open: false } });
  saveStaff = () => {
    const m = this.state.staffModal;
    if (!m.name.trim()) { alert('Enter staff name / نام درج کریں'); return; }
    if (m.editId) {
      const staff = (this.state.staff || []).map(s => s.id === m.editId ? { ...s, name: m.name.trim(), phone: m.phone, role: m.role, salary: parseFloat(m.salary) || 0, joinDate: m.joinDate } : s);
      this.setState({ staff, staffModal: { ...m, open: false } });
    } else {
      const s = { id: 'stf_' + Date.now().toString(36), name: m.name.trim(), phone: m.phone, role: m.role, salary: parseFloat(m.salary) || 0, joinDate: m.joinDate, attendance: {}, salaryPayments: [] };
      this.setState({ staff: [s, ...(this.state.staff || [])], staffModal: { ...m, open: false } });
    }
  };
  deleteStaff = (id) => {
    if (!confirm('Delete this staff member?\nکیا آپ یہ ملازم ڈیلیٹ کرنا چاہتے ہیں؟')) return;
    this.setState({ staff: (this.state.staff || []).map(s => s.id === id ? { ...s, _deleted: true } : s), staffModal: { ...this.state.staffModal, open: false } });
  };
  markAttendance = (staffId, date, status) => {
    const staff = (this.state.staff || []).map(s => {
      if (s.id !== staffId) return s;
      const att = { ...(s.attendance || {}) };
      att[date] = status;
      return { ...s, attendance: att };
    });
    this.setState({ staff });
  };
  openSalaryModal = (staffId) => {
    const s = this.activeStaff().find(x => x.id === staffId);
    if (!s) return;
    const now = new Date();
    const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const accs = this.getAccounts();
    this.setState({ salaryModal: { open: true, staffId, month, amount: String(s.salary || ''), advance: '0', accountId: accs.length > 0 ? accs[0].id : '', note: '' } });
  };
  closeSalaryModal = () => this.setState({ salaryModal: { ...this.state.salaryModal, open: false } });
  paySalary = () => {
    const m = this.state.salaryModal;
    const amount = parseFloat(m.amount) || 0;
    const advance = parseFloat(m.advance) || 0;
    if (amount <= 0) { alert('Enter salary amount'); return; }
    const net = amount - advance;
    const s = this.activeStaff().find(x => x.id === m.staffId);
    if (!s) return;
    const payment = { id: 'sp_' + Date.now().toString(36), month: m.month, gross: amount, advance, net, date: this.todayStr(), accountId: m.accountId, note: m.note };
    const staff = (this.state.staff || []).map(st => st.id === m.staffId ? { ...st, salaryPayments: [...(st.salaryPayments || []), payment] } : st);
    const ledger = [...(this.state.ledger || [])];
    ledger.unshift({ id: 'le_' + Date.now().toString(36), type: 'expense', amount: net, accountId: m.accountId, category: 'Salary', note: s.name + ' — ' + m.month + (advance > 0 ? ' (advance: ' + this.fmtPKR(advance) + ')' : ''), date: this.todayStr() });
    this.setState({ staff, ledger, salaryModal: { ...m, open: false } });
  };

  exportAllData = () => {
    const { customers, products, plans, settings, ledger, udpiEntries, invoices, staff } = this.state;
    const d = { customers, products, plans, settings, ledger: ledger || [], udpiEntries: udpiEntries || [], invoices: invoices || [], staff: staff || [], exportedAt: new Date().toISOString(), app: 'Aqsat', v: '2.0' };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
    a.download = 'aqsat-backup-' + this.todayStr() + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

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
    const cPlans = this.activePlans().filter(p => p.customerId === cId).sort((a, b) => (b.id || '').localeCompare(a.id || ''));
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
    const today = this.todayStr();
    const amountCollected = parseFloat(this.state.paymentAmount) || 0;
    const accId = this.state.paymentAccountId;
    const plans = this.state.plans.map(pl => {
      if (pl.id !== ctx.planId) return pl;
      const schedule = pl.schedule.map(s => s.n === ctx.installmentN
        ? { ...s, paid: true, paidDate: ctx.isEdit ? (s.paidDate || today) : today, amountPaid: amountCollected || s.amount, lateFeeCharged: ctx.isEdit ? s.lateFeeCharged : this.computeLateFee(s, pl), accountId: accId || undefined }
        : s);
      const allPaid = schedule.every(s => s.paid);
      return { ...pl, schedule, status: allPaid ? 'completed' : pl.status };
    });
    const pl = plans.find(p => p.id === ctx.planId);
    const customer = this.state.customers.find(c => c.id === pl.customerId);
    const product = this.state.products.find(p => p.id === pl.productId);
    const s = pl.schedule.find(x => x.n === ctx.installmentN);
    const acc = this.getAccounts().find(a => a.id === accId);
    if (ctx.isEdit) {
      this.setState({ plans, paymentModalOpen: false });
    } else {
      this.setState({ plans, paymentModalOpen: false, receiptOpen: true, receiptData: { receiptNo: 'RCP-' + Date.now().toString().slice(-6), customer, product, plan: pl, installment: s, date: today, amountCollected: amountCollected || s.amount, accountName: acc ? acc.emoji + ' ' + acc.name : '' } });
    }
  }
  closeReceipt = () => this.setState({ receiptOpen: false, receiptData: null });

  undoPayment = (planId, installmentN) => {
    this.requirePin(() => {
      if (!confirm('Undo payment for installment #' + installmentN + '?\nقسط نمبر ' + installmentN + ' کی ادائیگی واپس کریں؟')) return;
      const plans = this.state.plans.map(pl => {
        if (pl.id !== planId) return pl;
        const schedule = pl.schedule.map(s => s.n === installmentN
          ? { ...s, paid: false, paidDate: undefined, amountPaid: undefined, lateFeeCharged: undefined, accountId: undefined }
          : s);
        return { ...pl, schedule, status: 'active' };
      });
      this.setState({ plans });
    });
  }

  editPayment = (planId, installmentN) => {
    const pl = this.state.plans.find(p => p.id === planId);
    if (!pl) return;
    const s = pl.schedule.find(x => x.n === installmentN);
    if (!s || !s.paid) return;
    const accs = this.getAccounts();
    this.requirePin(() => {
      this.setState({
        paymentModalOpen: true,
        paymentContext: { planId, installmentN, isEdit: true },
        paymentAmount: String(s.amountPaid || s.amount),
        paymentAccountId: s.accountId || (accs.length > 0 ? accs[0].id : ''),
      });
    });
  }

  createPlan = () => {
    const np = this.state.newPlan;
    if (!np.customerId) { alert('Please select a customer'); return; }
    if (!np.productId) { alert('Please select a product'); return; }
    if (!np.accountId) { alert('Please select an account\nاکاؤنٹ منتخب کریں'); return; }
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
        schedule.push({ n: i + 1, dueDate: this._localDateStr(d), amount: amt, paid: false, paidDate: null });
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
        schedule.push({ n: i + 1, dueDate: this._localDateStr(d), amount, paid: false, paidDate: null });
      }
    }
    const months = schedule.length;
    if (months > 24 && !confirm(months + ' installments — is this correct?\n' + months + ' اقساط — کیا یہ درست ہے؟')) return;
    const monthly = installAmt > 0 ? installAmt : (months > 0 ? Math.round(total2Pay / months) : 0);
    const voucherSeq = (this.state.plans.length + 1).toString().padStart(3, '0');
    const voucherNo = 'VCH-' + new Date().getFullYear() + '-' + voucherSeq;
    const plan = { id: 'pl_' + Date.now().toString(36), voucherNo, customerId: np.customerId, productId: np.productId, total, down, months, interest: profitPct, monthly, installmentAmount: installAmt, startDate: this._localDateStr(start), status: 'active', schedule, imei: np.imei, chassisNo: np.chassisNo, engineNo: np.engineNo, frequency: np.frequency, frequencyDays: freqDays, accountId: np.accountId, lateFee: { graceDays: parseInt(np.graceDays) || 0, lateFeeFlat: parseFloat(np.lateFeeFlat) || 0, lateFeePerDay: parseFloat(np.lateFeePerDay) || 0, maxLateFee: this.state.settings.maxLateFee } };
    const customer = this.state.customers.find(c => c.id === np.customerId);
    const custName = customer ? customer.name : '';
    const prodName = product ? product.name : '';
    const today = this.todayStr();
    const ledger = [...(this.state.ledger || [])];
    ledger.unshift({ id: 'le_' + Date.now().toString(36), type: 'expense', amount: total, accountId: np.accountId, category: 'Product Cost', note: prodName + ' — ' + custName + ' (' + voucherNo + ')', date: today });
    if (down > 0) {
      ledger.unshift({ id: 'le_' + (Date.now() + 1).toString(36), type: 'income', amount: down, accountId: np.accountId, category: 'Down Payment', note: prodName + ' — ' + custName + ' (' + voucherNo + ')', date: today });
    }
    const updProducts = this.state.products.map(p => p.id === np.productId && p.stock > 0 ? { ...p, stock: p.stock - 1 } : p);
    this.setState({ plans: [plan, ...this.state.plans], ledger, products: updProducts, newPlan: { customerId: '', productId: '', totalPrice: '', downPayment: '', months: 6, customMonths: '', installmentAmount: '', interestType: 'percent', interest: 12, interestAmount: '', startDate: this.todayStr(), graceDays: 0, lateFeeFlat: 0, lateFeePerDay: 0, imei: '', chassisNo: '', engineNo: '', frequency: 'monthly', frequencyDays: 30, accountId: '' } });
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
    const c = { id: 'c' + (this.state.customers.length + 1) + '_' + Date.now().toString(36).slice(-4), name: nc.name, nameUr: nc.nameUr || nc.name, phone: nc.phone, altPhone: nc.altPhone, cnic: nc.cnic, dob: nc.dob, fatherName: nc.fatherName, occupation: nc.occupation, monthlyIncome: nc.monthlyIncome, address: nc.address, city: nc.city, area: nc.area || nc.city, guarantor: { name: nc.guarantorName, phone: nc.guarantorPhone, cnic: nc.guarantorCnic, relation: nc.guarantorRelation }, notes: nc.notes, documents: nc.documents, joined: this.todayStr(), avatar: initials, color: colors[this.state.customers.length % colors.length] };
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
    this.requirePin(() => {
      const c = this.state.customers.find(x => x.id === id);
      const plans = this.activePlans().filter(pl => pl.customerId === id);
      const activePlans = plans.filter(pl => pl.status === 'active');
      const msg = activePlans.length > 0
        ? 'WARNING: ' + (c ? c.name : 'Customer') + ' has ' + activePlans.length + ' active plan(s)!\nDelete customer AND all their ' + plans.length + ' plan(s)?\n\nخبردار: ' + activePlans.length + ' فعال پلان ہیں!\nگاہک اور تمام ' + plans.length + ' پلان حذف کریں؟'
        : 'Delete ' + (c ? c.name : 'this customer') + '?\nکیا آپ ' + (c ? c.name : 'یہ گاہک') + ' ڈیلیٹ کرنا چاہتے ہیں؟';
      if (!confirm(msg)) return;
      const customers = this.state.customers.map(x => x.id === id ? { ...x, _deleted: true } : x);
      const updatedPlans = (this.state.plans || []).map(pl => pl.customerId === id ? { ...pl, _deleted: true } : pl);
      this.setState({ customers, plans: updatedPlans });
      this.closeEditCustomer();
      this.go('customers');
    });
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

  sendInstallmentReminder = async (customer, plan, product, installment) => {
    if (!customer.phone) { alert('No phone number for ' + customer.name); return; }
    const biz = this.state.settings.businessName || 'Aqsat';
    const today = new Date();
    const due = new Date(installment.dueDate);
    const daysLeft = Math.round((due - today) / 86400000);
    const urgency = daysLeft < 0 ? '(' + Math.abs(daysLeft) + ' دن تاخیر ہو چکی ہے)' : daysLeft === 0 ? '(آج آخری دن ہے)' : '(' + daysLeft + ' دن باقی ہیں)';
    const msg = 'السلام وعلیکم ' + customer.name + '! 🙏\n\n' + biz + ' کی طرف سے یاد دہانی:\n\n📦 ' + (product ? product.name : 'پروڈکٹ') + '\n💳 قسط نمبر: ' + installment.n + ' / ' + plan.months + '\n💰 رقم: ' + this.fmtPKR(installment.amount) + '\n📅 تاریخ: ' + this.fmtDate(installment.dueDate) + ' ' + urgency + '\n🔖 وچر: ' + (plan.voucherNo || '—') + '\n\nبراہ کرم بروقت ادائیگی کریں۔\nشکریہ 🙏';
    const result = await this.sendWhatsAppAPI(customer.phone, msg);
    if (result.ok) alert('✓ Reminder sent to ' + customer.name + '!');
    else if (result.error) {
      if (result.error.includes('not connected')) { alert('WhatsApp not connected.\nGo to Udhar Book → tap WA button to scan QR.\n\nواٹس ایپ منسلک نہیں۔'); }
      else alert('Failed: ' + result.error);
    }
  };
  sendAllInstallmentReminders = async () => {
    let overdueList = [];
    this.activePlans().forEach(pl => {
      const c = this.state.customers.find(x => x.id === pl.customerId);
      const p = this.state.products.find(x => x.id === pl.productId);
      if (!c || !c.phone) return;
      pl.schedule.forEach(s => { const diff = this.dayDiff(s.dueDate); if (!s.paid && diff < 0) overdueList.push({ pl, s, c, p, diff }); });
    });
    if (overdueList.length === 0) { alert('No overdue installments with phone numbers.'); return; }
    if (!confirm('Send WhatsApp reminders to ' + overdueList.length + ' overdue installments?\n\n' + overdueList.length + ' واجب المعیاد اقساط کو واٹس ایپ ریمائنڈر بھیجیں؟')) return;
    this.setState({ installmentAutoSending: true });
    let sent = 0, failed = 0;
    for (const r of overdueList) {
      const result = await this.sendWhatsAppAPI(r.c.phone, 'السلام وعلیکم ' + r.c.name + '! 🙏\n\n' + (this.state.settings.businessName || 'Aqsat') + ' کی طرف سے یاد دہانی:\n\n📦 ' + (r.p ? r.p.name : 'پروڈکٹ') + '\n💳 قسط نمبر: ' + r.s.n + ' / ' + r.pl.months + '\n💰 رقم: ' + this.fmtPKR(r.s.amount) + '\n📅 تاریخ: ' + this.fmtDate(r.s.dueDate) + ' (' + Math.abs(r.diff) + ' دن تاخیر)\n\nبراہ کرم بروقت ادائیگی کریں۔\nشکریہ 🙏');
      if (result.ok) sent++; else failed++;
      if (overdueList.indexOf(r) < overdueList.length - 1) await new Promise(res => setTimeout(res, 2000));
    }
    this.setState({ installmentAutoSending: false });
    alert('Auto Reminders Done!\n\n✓ Sent: ' + sent + (failed > 0 ? '\n✕ Failed: ' + failed : '') + '\n\nTotal: ' + overdueList.length);
  };
  getPortalLink = (phone) => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return base + '/portal?phone=' + (phone || '').replace(/[^0-9]/g, '');
  };
  sharePortalLink = async (customer) => {
    if (!customer.phone) { alert('No phone number for ' + customer.name); return; }
    const link = this.getPortalLink(customer.phone);
    const biz = this.state.settings.businessName || 'Aqsat';
    const msg = 'السلام وعلیکم ' + customer.name + '! 🙏\n\n' + biz + ' کی طرف سے آپ کا کسٹمر پورٹل:\n\n🔗 ' + link + '\n\nاس لنک سے آپ اپنی اقساط کی تفصیلات دیکھ سکتے ہیں:\n• قسطوں کی رقم اور تاریخیں\n• ادائیگی کی حالت\n• باقی رقم\n\nشکریہ 🙏';
    const result = await this.sendWhatsAppAPI(customer.phone, msg);
    if (result.ok) alert('✓ Portal link sent to ' + customer.name + '!');
    else {
      const waNum = '92' + customer.phone.replace(/\D/g, '').replace(/^0/, '');
      window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg), '_blank');
    }
  };
  copyPortalLink = (phone) => {
    const link = this.getPortalLink(phone);
    if (navigator.clipboard) { navigator.clipboard.writeText(link).then(() => alert('Portal link copied!\nپورٹل لنک کاپی ہو گیا')); }
    else { prompt('Copy this link:', link); }
  };
  exportBackup = () => {
    const data = { customers: this.state.customers, products: this.state.products, plans: this.state.plans, settings: this.state.settings, ledger: this.state.ledger || [], udpiEntries: this.state.udpiEntries || [], exportedAt: new Date().toISOString(), version: 2 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aqsat-backup-${this.todayStr()}.json`;
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
          this.setState({ customers: d.customers, products: d.products, plans: d.plans, settings: d.settings || this.state.settings, ledger: d.ledger || [], udpiEntries: d.udpiEntries || [] });
          alert('✓ Backup imported successfully!');
        } catch(e) { alert('Could not read file — make sure it is a valid Aqsat backup.'); }
      };
      reader.readAsText(file);
    };
    this.requirePin(doImport);
  };

  exportCSV = () => {
    const rows = [['Customer', 'Product', 'Total', 'Down', 'Monthly', 'Paid', 'Remaining', 'Status', 'Start Date']];
    this.activePlans().forEach(pl => {
      const c = this.state.customers.find(x => x.id === pl.customerId);
      const p = this.state.products.find(x => x.id === pl.productId);
      const st = this.planStats(pl);
      rows.push([c.name, p.name, pl.total, pl.down, pl.monthly, st.paidAmount, st.remaining, pl.status, pl.startDate]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'aqsat-plans.csv'; a.click();
  };

  getReportAccounts() {
    const accs = this.getAccounts();
    const sel = this.state.reportAccounts;
    if (!sel || sel.length === 0) return accs.map(a => a.id);
    return sel;
  }

  toggleReportAccount = (accId) => {
    const accs = this.getAccounts();
    const all = accs.map(a => a.id);
    let sel = this.state.reportAccounts || [...all];
    if (sel.includes(accId)) {
      sel = sel.filter(id => id !== accId);
      if (sel.length === 0) sel = [...all];
    } else {
      sel = [...sel, accId];
    }
    if (sel.length === all.length) sel = null;
    this.setState({ reportAccounts: sel });
  }

  downloadReportPDF = (type) => {
    const accs = this.getAccounts();
    const selIds = this.getReportAccounts();
    const selAccs = accs.filter(a => selIds.includes(a.id));
    const biz = this.state.settings.businessName || 'Aqsat';
    const owner = this.state.settings.ownerName || '';

    let title, dateLabel, rows = [];

    if (type === 'daily') {
      const dateStr = this.state.dayBookDate || this.todayStr();
      const dayLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      title = 'Daily Report / روزنامچہ';
      dateLabel = dayLabel;
      const allSelAccs = selIds.length === accs.length;
      const allTx = this._buildTxList().filter(tx => tx.date === dateStr && (allSelAccs || selIds.includes(tx.accountId)));
      let totalIn = 0, totalOut = 0;
      allTx.forEach(tx => {
        const acc = accs.find(a => a.id === tx.accountId);
        const accName = acc ? acc.name : '';
        if (tx.source === 'plan') {
          totalIn += tx.amount;
          rows.push({ desc: (tx.customer ? tx.customer.name : 'Customer') + ' — Installment', account: accName, inAmt: tx.amount, outAmt: 0 });
        } else if (tx.source === 'ledger') {
          const le = tx.ledgerEntry;
          const isInc = le.type === 'income';
          if (isInc) { totalIn += tx.amount; rows.push({ desc: le.category + (le.note ? ' — ' + le.note : ''), account: accName, inAmt: tx.amount, outAmt: 0 }); }
          else { totalOut += tx.amount; rows.push({ desc: le.category + (le.note ? ' — ' + le.note : ''), account: accName, inAmt: 0, outAmt: tx.amount }); }
        } else if (tx.source === 'udpi') {
          const u = tx.udpiEntry;
          if (u.direction === 'borrowed') { totalIn += tx.amount; rows.push({ desc: u.person + ' (Borrowed)', account: accName, inAmt: tx.amount, outAmt: 0 }); }
          else { totalOut += tx.amount; rows.push({ desc: u.person + ' (Lent)', account: accName, inAmt: 0, outAmt: tx.amount }); }
        }
      });
      rows.push({ desc: 'TOTAL', account: '', inAmt: totalIn, outAmt: totalOut, isTotal: true });
    } else {
      const mKey = this.state.pnlMonth || (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));
      const mLabel = new Date(mKey + '-01T00:00:00').toLocaleDateString('en', { month: 'long', year: 'numeric' });
      title = 'Monthly P&L Report / ماہانہ نفع نقصان';
      dateLabel = mLabel;
      let instCollected = 0, instProfit = 0, downPayments = 0, productCost = 0;
      this.activePlans().forEach(pl => {
        const financed = Math.max(0, pl.total - (pl.down || 0));
        const scheduleTotal = pl.schedule.reduce((s, x) => s + x.amount, 0) || 1;
        const profit = Math.max(0, scheduleTotal - financed);
        const profitPerRupee = profit / scheduleTotal;
        const idPart = (pl.id || '').replace(/^pl_/, '');
        const createdMs = parseInt(idPart, 36);
        const createdDate = isFinite(createdMs) && createdMs > 0 ? new Date(createdMs) : (pl.startDate ? new Date(pl.startDate) : null);
        const createdKey = createdDate ? createdDate.getFullYear() + '-' + String(createdDate.getMonth() + 1).padStart(2, '0') : '';
        if (createdKey === mKey && selIds.includes(pl.accountId)) {
          downPayments += (pl.down || 0);
          productCost += (pl.total || 0);
        }
        pl.schedule.forEach(s => {
          if (s.paid && s.paidDate && s.paidDate.slice(0, 7) === mKey && selIds.includes(s.accountId)) {
            instCollected += (s.amountPaid || s.amount);
            instProfit += (s.amountPaid || s.amount) * profitPerRupee;
          }
        });
      });
      const mLedger = this.activeLedger().filter(le => le.date && le.date.slice(0, 7) === mKey && selIds.includes(le.accountId) && !le.udpiRef && le.category !== 'Udhar' && le.category !== 'Udhar Return' && !this._isPlanLedgerEntry(le));
      const ledgerIncome = mLedger.filter(le => le.type === 'income').reduce((s, le) => s + le.amount, 0);
      const ledgerExpense = mLedger.filter(le => le.type === 'expense').reduce((s, le) => s + le.amount, 0);
      const totalIncome = instCollected + downPayments + ledgerIncome;
      const totalExpense = ledgerExpense + productCost;
      const netPnL = totalIncome - totalExpense;
      rows = [
        { section: 'Income / آمدنی' },
        { desc: 'Installments Collected / اقساط وصول', amount: instCollected },
        { desc: 'Down Payments / ایڈوانس', amount: downPayments },
        { desc: 'Other Income / دیگر آمدنی', amount: ledgerIncome },
        { desc: 'Total Income / کل آمدنی', amount: totalIncome, isTotal: true },
        { section: 'Expenses / اخراجات' },
        { desc: 'Product Cost / پلانز کی لاگت', amount: productCost },
        { desc: 'Expenses / لیجر اخراجات', amount: ledgerExpense },
        { desc: 'Total Expenses / کل اخراجات', amount: totalExpense, isTotal: true },
        { section: 'Profitability / منافع' },
        { desc: 'Markup Earned / قسط کا منافع', amount: Math.round(instProfit) },
        { desc: 'Net P&L / خالص نفع نقصان', amount: netPnL, isTotal: true, isNet: true },
      ];
    }

    const accLabel = selAccs.length === accs.length ? 'All Accounts' : selAccs.map(a => a.name).join(', ');
    const fmtPKR = (n) => 'Rs ' + (Math.round(n) || 0).toLocaleString('en-PK');
    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title>';
    html += '<style>body{font-family:Arial,sans-serif;margin:40px;color:#1a2b1f}h1{font-size:20px;margin:0}h2{font-size:13px;color:#7a7663;margin:4px 0 0}.meta{font-size:12px;color:#7a7663;margin:16px 0 20px;border-bottom:2px solid #ece8dc;padding-bottom:12px}';
    html += 'table{width:100%;border-collapse:collapse;margin-top:12px}th{text-align:left;font-size:11px;color:#7a7663;text-transform:uppercase;padding:8px 6px;border-bottom:2px solid #ece8dc}td{padding:8px 6px;font-size:13px;border-bottom:1px solid #f2eee2}';
    html += '.mono{font-family:monospace}.right{text-align:right}.green{color:#0f6b4b}.red{color:#b91c1c}.bold{font-weight:700}.total-row{border-top:2px solid #ece8dc;font-weight:700;font-size:14px}.section{font-weight:700;font-size:14px;padding-top:16px;border:none}.net{font-size:16px}';
    html += '@media print{body{margin:20px}}</style></head><body>';
    html += '<h1>' + biz + '</h1><h2>' + title + '</h2>';
    html += '<div class="meta">' + dateLabel + '<br>Accounts: ' + accLabel + (owner ? '<br>Prepared by: ' + owner : '') + '<br>Generated: ' + new Date().toLocaleString('en-PK') + '</div>';

    if (type === 'daily') {
      html += '<table><thead><tr><th>Description</th><th>Account</th><th class="right">Money In</th><th class="right">Money Out</th></tr></thead><tbody>';
      rows.forEach(r => {
        const cls = r.isTotal ? ' class="total-row"' : '';
        html += '<tr' + cls + '><td>' + r.desc + '</td><td>' + r.account + '</td><td class="mono right green">' + (r.inAmt ? fmtPKR(r.inAmt) : '') + '</td><td class="mono right red">' + (r.outAmt ? fmtPKR(r.outAmt) : '') + '</td></tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<table><thead><tr><th>Item</th><th class="right">Amount</th></tr></thead><tbody>';
      rows.forEach(r => {
        if (r.section) { html += '<tr><td class="section" colspan="2">' + r.section + '</td></tr>'; return; }
        const cls = r.isTotal ? (r.isNet ? 'total-row net' : 'total-row') : '';
        const color = r.isNet ? (r.amount >= 0 ? 'green' : 'red') : '';
        html += '<tr class="' + cls + '"><td>' + r.desc + '</td><td class="mono right bold ' + color + '">' + (r.isNet && r.amount >= 0 ? '+' : '') + fmtPKR(r.amount) + '</td></tr>';
      });
      html += '</tbody></table>';
    }
    html += '</body></html>';

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

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
    this.setState({ plans: this.state.plans.map(p => p.id === planId ? { ...p, _deleted: true } : p), deletePlanModal: { open: false, planId: null, pinInput: '' } });
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
    const doOpen = () => this.setState({ editPlanModal: { open: true, planId, pinInput: '', pinConfirmed: true, draftCustomerId: pl.customerId, draftProductId: pl.productId, draftTotal: String(pl.total), draftDown: String(pl.down), draftInterest: String(pl.interest || 0), draftInterestAmount: initAmt, draftInstallmentAmount: initInst, draftStartDate: pl.startDate || '', draftSchedule: pl.schedule.map(s => ({ ...s })), draftImei: pl.imei || '', draftChassisNo: pl.chassisNo || '', draftEngineNo: pl.engineNo || '', draftNotes: pl.notes || '' } });
    this.requirePin(doOpen);
  };
  closeEditPlan = () => this.setState({ editPlanModal: { open: false, planId: null, pinInput: '', pinConfirmed: true, draftCustomerId: '', draftProductId: '', draftTotal: '', draftDown: '', draftInterest: '', draftInterestAmount: '', draftInstallmentAmount: '', draftStartDate: '', draftSchedule: [], draftImei: '', draftChassisNo: '', draftEngineNo: '', draftNotes: '' } });
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
      return this._localDateStr(d);
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
    const startChanged = paidList.length === 0 || (oldUnpaid.length > 0 && oldUnpaid[0].dueDate !== stepDate(paidList.length));
    unpaidAmounts.forEach((amt, j) => {
      const globalIdx = paidList.length + j;
      const dueDate = startChanged ? stepDate(globalIdx) : (j < oldUnpaid.length ? oldUnpaid[j].dueDate : stepDate(globalIdx));
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
      const startBase = em.draftStartDate || pl.startDate || this.todayStr();
      const schedule = this._rebuildSchedule(em.draftSchedule, total2Pay, installAmt, freq, freqDays, startBase);
      const allPaid = schedule.length > 0 && schedule.every(s => s.paid);
      const months = schedule.length;
      const firstUnpaid = schedule.find(s => !s.paid);
      const monthly = installAmt > 0 ? installAmt : (firstUnpaid ? firstUnpaid.amount : (months > 0 ? Math.round(total2Pay / months) : 0));
      return { ...pl, customerId: em.draftCustomerId || pl.customerId, productId: em.draftProductId || pl.productId, total, down, interest, monthly, installmentAmount: installAmt, startDate: em.draftStartDate || pl.startDate, months, schedule, imei: em.draftImei, chassisNo: em.draftChassisNo, engineNo: em.draftEngineNo, notes: em.draftNotes, status: allPaid ? 'completed' : 'active' };
    });
    this.setState({ plans, editPlanModal: { open: false, planId: null, pinInput: '', pinConfirmed: true, draftCustomerId: '', draftProductId: '', draftTotal: '', draftDown: '', draftInterest: '', draftInterestAmount: '', draftStartDate: '', draftSchedule: [], draftImei: '', draftChassisNo: '', draftEngineNo: '', draftNotes: '' } });
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

  openAddProduct  = () => this.setState({ addProductOpen: true, newProduct: { name: '', nameUr: '', category: 'Mobile', price: '', costPrice: '', stock: '', emoji: '📱' } });
  closeAddProduct = () => this.setState({ addProductOpen: false });
  saveNewProduct  = () => {
    const np = this.state.newProduct;
    if (!np.name || !np.price) { alert('Please enter product name and price'); return; }
    const p = { id: 'p_' + Date.now().toString(36), name: np.name, nameUr: np.nameUr || np.name, category: np.category, price: parseFloat(np.price) || 0, costPrice: parseFloat(np.costPrice) || 0, stock: parseInt(np.stock) || 0, emoji: np.emoji || '📦' };
    this.setState({ products: [p, ...this.state.products], addProductOpen: false });
  };
  openEditProduct = (id) => {
    const p = this.state.products.find(x => x.id === id);
    if (!p) return;
    this.requirePin(() => this.setState({ editProductModal: { open: true, id, name: p.name, nameUr: p.nameUr || '', category: p.category, price: String(p.price), costPrice: String(p.costPrice || ''), stock: String(p.stock || 0), emoji: p.emoji || '📦' } }));
  };
  closeEditProduct = () => this.setState({ editProductModal: { open: false, id: null, name: '', nameUr: '', category: 'Mobile', price: '', costPrice: '', stock: '', emoji: '📦' } });
  saveEditProduct = () => {
    const ep = this.state.editProductModal;
    if (!ep.name || !ep.price) { alert('Please enter product name and price'); return; }
    this.updateProduct(ep.id, { name: ep.name, nameUr: ep.nameUr || ep.name, category: ep.category, price: parseFloat(ep.price) || 0, costPrice: parseFloat(ep.costPrice) || 0, stock: parseInt(ep.stock) || 0, emoji: ep.emoji || '📦' });
    this.closeEditProduct();
  };
  deleteProduct = (id) => {
    this.requirePin(() => {
      const p = this.state.products.find(x => x.id === id);
      const plans = this.activePlans().filter(pl => pl.productId === id);
      const msg = plans.length > 0
        ? 'WARNING: ' + (p ? p.name : 'Product') + ' is used in ' + plans.length + ' plan(s)!\nDelete product AND all plans?\n\nخبردار: ' + plans.length + ' پلان میں استعمال ہو رہی ہے!'
        : 'Delete ' + (p ? p.name : 'this product') + '?\nکیا آپ ' + (p ? p.name : 'یہ پروڈکٹ') + ' ڈیلیٹ کرنا چاہتے ہیں؟';
      if (!confirm(msg)) return;
      const products = this.state.products.map(x => x.id === id ? { ...x, _deleted: true } : x);
      const updatedPlans = plans.length > 0 ? (this.state.plans || []).map(pl => pl.productId === id ? { ...pl, _deleted: true } : pl) : this.state.plans;
      this.setState({ products, plans: updatedPlans });
      this.closeEditProduct();
    });
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
    const { customers, products } = this.state;
    const plans = this.activePlans();
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
      (() => {
        const le = this.activeLedger().filter(x => !x.udpiRef && x.category !== 'Udhar' && x.category !== 'Udhar Return' && !this._isPlanLedgerEntry(x));
        const curMonth = this.todayStr().slice(0, 7);
        const mEntries = le.filter(x => x.date.startsWith(curMonth));
        const mInc = mEntries.filter(x => x.type === 'income').reduce((s, x) => s + x.amount, 0);
        const mExp = mEntries.filter(x => x.type === 'expense').reduce((s, x) => s + x.amount, 0);
        const mNet = mInc - mExp;
        if (le.length === 0) return null;
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 12, flexWrap: 'wrap', cursor: 'pointer' }, onClick: () => this.go('ledger') },
          h('div', { style: { fontSize: 14, fontWeight: 700 } }, '📒 This Month Ledger'),
          h('div', { style: { display: 'flex', gap: 14, marginLeft: 'auto' } },
            h('span', { className: 'mono', style: { fontSize: 13, fontWeight: 700, color: '#0f6b4b' } }, '↑ ' + this.fmtPKR(mInc)),
            h('span', { className: 'mono', style: { fontSize: 13, fontWeight: 700, color: '#b91c1c' } }, '↓ ' + this.fmtPKR(mExp)),
            h('span', { className: 'mono', style: { fontSize: 13, fontWeight: 800, color: mNet >= 0 ? '#0f6b4b' : '#b91c1c' } }, 'Net ' + (mNet >= 0 ? '+' : '-') + this.fmtPKR(Math.abs(mNet))),
          ),
          h('span', { style: { fontSize: 11, color: '#7a7663' } }, 'View →'),
        );
      })(),
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
            : upcomingList.map((row, i) =>
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
            : recentPayments.map((row, i) =>
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
      .map(c => ({ c, st: this.customerStats(c.id) }))
      .sort((a, b) => (b.c.id || '').localeCompare(a.c.id || ''));
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
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('button', { onClick: () => this.openEditCustomer(c.id), style: { background: '#f4f1e6', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 } }, '✎ Edit'),
            h('button', { onClick: () => this.deleteCustomer(c.id), style: { background: '#fdecea', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#a4362b' } }, '🗑 Delete'),
            nextInst ? h('a', { href: this.waLink(c.phone, c.name, nextInst.amount, nextInst.dueDate), target: '_blank', rel: 'noopener', style: { background: '#f4f1e6', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' } }, '💬 Manual') : null,
            nextInst && c.phone ? h('button', { onClick: () => { const pl = st.plans[0]; const pr = this.state.products.find(x => x.id === pl.productId); this.sendInstallmentReminder(c, pl, pr, nextInst); }, style: { background: '#0f6b4b', color: 'white', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 } }, '🤖 Auto Send') : null,
            h('button', { onClick: () => this.go('newplan'), style: { background: '#0f6b4b', color: 'white', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 } }, '＋ New Plan'),
          ),
          c.phone ? h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
            h('button', { onClick: () => this.sharePortalLink(c), style: { background: '#25D366', color: 'white', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: 'none' } }, '🔗 Send Portal Link'),
            h('button', { onClick: () => this.copyPortalLink(c.phone), style: { background: '#f4f1e6', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: 'none' } }, '📋 Copy Portal Link'),
            h('a', { href: this.getPortalLink(c.phone), target: '_blank', style: { background: '#f4f1e6', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: 'none', color: '#3a4a3f', display: 'inline-flex', alignItems: 'center' } }, '👁 Preview Portal'),
          ) : null,
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
          return h('div', { key: s.n, style: { position: 'relative' } },
            h('button', { onClick: () => s.paid ? this.setState({ installmentMenu: this.state.installmentMenu === pl.id + '_' + s.n ? null : pl.id + '_' + s.n }) : this.openPayment(pl.id, s.n), style: { width: '100%', background: bg, border: '1px solid ' + (isNext ? '#f0c977' : '#ece8dc'), borderRadius: 10, padding: '8px 6px', textAlign: 'center', cursor: 'pointer' } },
              h('div', { style: { fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase' } }, s.paid ? '✓ Paid' : isOverdueS ? 'Late' : '#' + s.n),
              h('div', { className: 'mono', style: { fontSize: 11, fontWeight: 700, color: '#1a2b1f', marginTop: 2 } }, s.paid ? this.fmtPKR(s.amountPaid || s.amount).replace('Rs ', '') : s.amount >= 1000 ? parseFloat((s.amount / 1000).toFixed(1)) + 'k' : s.amount),
              h('div', { style: { fontSize: 9, color: col, marginTop: 1 } }, s.paid ? new Date(s.paidDate).toLocaleDateString('en', { day: '2-digit', month: 'short' }) : new Date(s.dueDate).toLocaleDateString('en', { day: '2-digit', month: 'short' })),
            ),
            this.state.installmentMenu === pl.id + '_' + s.n ? h('div', { style: { position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: '#fff', border: '1px solid #ece8dc', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,.12)', padding: 6, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120, marginTop: 4 } },
              h('button', { onClick: () => { this.setState({ installmentMenu: null }); this.editPayment(pl.id, s.n); }, style: { padding: '8px 10px', borderRadius: 8, background: '#eaf5ee', color: '#0f6b4b', fontSize: 12, fontWeight: 600, textAlign: 'left' } }, '✎ Edit Payment'),
              h('button', { onClick: () => { this.setState({ installmentMenu: null }); this.undoPayment(pl.id, s.n); }, style: { padding: '8px 10px', borderRadius: 8, background: '#fdecea', color: '#a4362b', fontSize: 12, fontWeight: 600, textAlign: 'left' } }, '↩ Undo Payment'),
            ) : null,
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
    const q = this.state.searchQuery.toLowerCase();
    const all = this.activeProducts();
    const stockFilter = this.state.stockFilter || 'all';
    let products = all.filter(p => !q || p.name.toLowerCase().includes(q) || (p.nameUr || '').includes(q) || (p.category || '').toLowerCase().includes(q));
    if (stockFilter === 'low') products = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5);
    else if (stockFilter === 'out') products = products.filter(p => (p.stock || 0) === 0);
    else if (stockFilter === 'in') products = products.filter(p => (p.stock || 0) > 0);
    products.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    const totalStock = all.reduce((s, p) => s + (p.stock || 0), 0);
    const totalValue = all.reduce((s, p) => s + (p.stock || 0) * (p.costPrice || p.price || 0), 0);
    const lowCount = all.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
    const outCount = all.filter(p => (p.stock || 0) === 0).length;
    const sfBtn = (label, val, cnt) => h('button', { key: val, onClick: () => this.setState({ stockFilter: val }), style: { padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: stockFilter === val ? '#1a2b1f' : '#f4f1e6', color: stockFilter === val ? 'white' : '#3a4a3f', border: '1px solid ' + (stockFilter === val ? '#1a2b1f' : '#ece8dc') } }, label + (cnt > 0 ? ' · ' + cnt : ''));
    return h('div', { className: 'screen' },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 14 } },
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Total Units'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: '#1a2b1f', marginTop: 2 } }, totalStock),
        ]),
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Stock Value'),
          h('div', { className: 'mono', style: { fontSize: 16, fontWeight: 800, color: '#0f6b4b', marginTop: 2 } }, this.fmtPKR(totalValue)),
        ]),
        lowCount > 0 ? this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#a26a10', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Low Stock'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: '#a26a10', marginTop: 2 } }, lowCount),
        ]) : null,
        outCount > 0 ? this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#a4362b', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Out of Stock'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: '#a4362b', marginTop: 2 } }, outCount),
        ]) : null,
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 } },
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          sfBtn('All', 'all', all.length),
          sfBtn('In Stock', 'in', all.filter(p => (p.stock || 0) > 0).length),
          sfBtn('Low', 'low', lowCount),
          sfBtn('Out', 'out', outCount),
        ),
        h('button', { onClick: this.openAddProduct, style: { background: '#0f6b4b', color: 'white', padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: 13 } }, '＋ Add Product'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 } },
        products.map(p => {
          const sold = this.activePlans().filter(pl => pl.productId === p.id).length;
          const stock = p.stock || 0;
          const stockColor = stock === 0 ? '#a4362b' : stock <= 5 ? '#a26a10' : '#0f6b4b';
          const stockBg = stock === 0 ? '#fdecea' : stock <= 5 ? '#fdf2d9' : '#eaf5ee';
          const stockLabel = stock === 0 ? 'Out of stock' : stock <= 5 ? 'Low stock' : 'In stock';
          return h('div', { key: p.id, style: { background: '#ffffff', border: '1px solid ' + (stock === 0 ? '#f5cac2' : stock <= 5 ? '#f0d89a' : '#ece8dc'), borderRadius: 12, padding: 16 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
              h('div', { style: { fontSize: 34, marginBottom: 8 } }, p.emoji),
              h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                h('span', { style: { fontSize: 10, fontWeight: 700, color: stockColor, background: stockBg, padding: '3px 8px', borderRadius: 6 } }, stockLabel),
                h('button', { onClick: () => this.openEditProduct(p.id), style: { width: 32, height: 32, borderRadius: 8, background: '#f4f1e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 } }, '✎'),
              ),
            ),
            h('div', { style: { fontSize: 10, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 } }, p.category),
            h('div', { style: { fontSize: 15, fontWeight: 700, marginTop: 2 } }, p.name),
            h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, p.nameUr),
            h('div', { className: 'mono', style: { fontSize: 18, fontWeight: 700, color: '#0f6b4b', marginTop: 10 } }, this.fmtPKR(p.price)),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f2eee2', fontSize: 11 } },
              h('span', { style: { color: '#7a7663' } }, 'Stock: ', h('span', { className: 'mono', style: { fontWeight: 700, color: stockColor } }, stock)),
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
    const q = this.state.searchQuery.toLowerCase();
    let plans = this.activePlans().slice().sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    if (q) plans = plans.filter(pl => {
      const c = (this.state.customers || []).find(x => x.id === pl.customerId);
      const p = this.activeProducts().find(x => x.id === pl.productId);
      return (c && (c.name.toLowerCase().includes(q) || c.nameUr.includes(q) || c.phone.includes(q)))
        || (p && p.name.toLowerCase().includes(q))
        || (pl.voucherNo || '').toLowerCase().includes(q)
        || (pl.imei || '').toLowerCase().includes(q)
        || (pl.chassisNo || '').toLowerCase().includes(q)
        || (pl.engineNo || '').toLowerCase().includes(q);
    });
    if (filter === 'active') plans = plans.filter(p => p.status === 'active');
    if (filter === 'completed') plans = plans.filter(p => p.status === 'completed');
    if (filter === 'overdue') plans = plans.filter(p => this.planStats(p).overdue.length > 0);
    const filters = [['all', 'All', this.activePlans().length], ['active', 'Active', this.activePlans().filter(p => p.status === 'active').length], ['overdue', 'Overdue', this.activePlans().filter(p => this.planStats(p).overdue.length > 0).length], ['completed', 'Completed', this.activePlans().filter(p => p.status === 'completed').length]];
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
    const _directAmt = parseFloat(np.interestAmount);
    const _hasDirect = np.interestAmount !== '' && np.interestAmount != null && !isNaN(_directAmt);
    const profit = Math.max(0, _hasDirect ? _directAmt : financed * Math.min(parseFloat(np.interest) || 0, 100) / 100);
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
    const isMobile = product && this.isPhoneCat(product.category);
    const isVehicle = product && this.isVehicleCat(product.category);
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
          field('Deduct From Account', 'اکاؤنٹ منتخب کریں',
            (() => { const accs = this.getAccounts(); return accs.length > 0
              ? h('div', { style: { display: 'grid', gridTemplateColumns: accs.length <= 3 ? 'repeat(' + accs.length + ',1fr)' : 'repeat(2,1fr)', gap: 8 } },
                  accs.map(acc => { const active = np.accountId === acc.id; return h('button', { type: 'button', key: acc.id, onClick: () => set('accountId', acc.id), style: { padding: '10px 8px', borderRadius: 10, border: '1px solid ' + (active ? '#0f6b4b' : '#ece8dc'), background: active ? '#eaf5ee' : '#fdfcf8', fontSize: 12, fontWeight: 600, color: active ? '#0f6b4b' : '#3a4a3f', textAlign: 'center' } },
                    h('div', { style: { fontSize: 18, marginBottom: 4 } }, acc.emoji),
                    h('div', {}, acc.name),
                    h('div', { className: 'mono', style: { fontSize: 11, color: '#7a7663', marginTop: 2 } }, '📋 ' + this.fmtPKR(this.accPlanBal(acc.id))),
                  ); }),
                )
              : h('div', { style: { fontSize: 13, color: '#7a7663' } }, 'No accounts configured. Add in Settings.');
            })(),
          ),
          isMobile ? field('IMEI Number', 'آئی ایم ای آئی', h('input', { value: np.imei, onChange: e => set('imei', e.target.value), placeholder: '15-digit IMEI', style: { ...inpStyle, fontFamily: 'JetBrains Mono, monospace' } })) : null,
          isVehicle ? field('Chassis Number', 'چیسس نمبر', h('input', { value: np.chassisNo, onChange: e => set('chassisNo', e.target.value), placeholder: 'e.g. ABC1234567890', style: { ...inpStyle, fontFamily: 'JetBrains Mono, monospace' } })) : null,
          isVehicle ? field('Engine Number', 'انجن نمبر', h('input', { value: np.engineNo, onChange: e => set('engineNo', e.target.value), placeholder: 'e.g. G15A1234567', style: { ...inpStyle, fontFamily: 'JetBrains Mono, monospace' } })) : null,
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

    const totalReceived = this.activePlans().reduce((a, p) => a + this.planStats(p).paidAmount, 0);
    const totalOut = this.activePlans().reduce((a, p) => a + this.planStats(p).remaining, 0);

    const profitOf = (pl) => {
      const financed = Math.max(0, pl.total - (pl.down || 0));
      const scheduleTotal = (pl.schedule || []).reduce((s, x) => s + x.amount, 0);
      return Math.max(0, scheduleTotal - financed);
    };
    const totalProfit = this.activePlans().reduce((a, pl) => a + profitOf(pl), 0);
    const earnedProfit = this.activePlans().reduce((a, pl) => {
      const profit = profitOf(pl);
      const scheduleTotal = pl.schedule.reduce((s, x) => s + x.amount, 0) || 1;
      const paidTotal = pl.schedule.filter(s => s.paid).reduce((s, x) => s + x.amount, 0);
      return a + profit * (paidTotal / scheduleTotal);
    }, 0);

    const monthlyData = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(curYear, i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleDateString('en', { month: 'short' });
      monthlyData[key] = { label, collected: 0, profitEarned: 0, plans: 0, down: 0 };
    }
    this.activePlans().forEach(pl => {
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

    const expectedProfitData = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(curYear, i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleDateString('en', { month: 'short' });
      expectedProfitData[key] = { label, expected: 0 };
    }
    this.activePlans().forEach(pl => {
      const profit = profitOf(pl);
      const scheduleTotal = pl.schedule.reduce((s, x) => s + x.amount, 0) || 1;
      const profitPerRupee = profit / scheduleTotal;
      pl.schedule.forEach(s => {
        if (s.dueDate) {
          const mKey = s.dueDate.slice(0, 7);
          if (expectedProfitData[mKey]) {
            expectedProfitData[mKey].expected += s.amount * profitPerRupee;
          }
        }
      });
    });
    const epKeys = Object.keys(expectedProfitData);
    const maxExpected = Math.max(...epKeys.map(k => expectedProfitData[k].expected), 1);

    const planProfitData = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(curYear, i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleDateString('en', { month: 'short' });
      planProfitData[key] = { label, profit: 0 };
    }
    this.activePlans().forEach(pl => {
      const idPart = (pl.id || '').replace(/^pl_/, '');
      const createdMs = parseInt(idPart, 36);
      const createdDate = isFinite(createdMs) && createdMs > 0 ? new Date(createdMs) : (pl.startDate ? new Date(pl.startDate) : null);
      const cKey = createdDate ? createdDate.getFullYear() + '-' + String(createdDate.getMonth() + 1).padStart(2, '0') : '';
      if (planProfitData[cKey]) {
        planProfitData[cKey].profit += profitOf(pl);
      }
    });
    const ppKeys = Object.keys(planProfitData);
    const maxPlanProfit = Math.max(...ppKeys.map(k => planProfitData[k].profit), 1);

    const byCat = {};
    this.activePlans().forEach(pl => { const p = this.state.products.find(x => x.id === pl.productId); if (p) byCat[p.category] = (byCat[p.category] || 0) + this.planStats(pl).total; });
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
        this.sectionHeader('Expected Profit', 'متوقع منافع'),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', height: 200, paddingTop: 16 } },
          epKeys.map(k => {
            const ep = expectedProfitData[k];
            const isCur = k === curKey;
            const val = Math.round(ep.expected);
            return h('div', { key: k, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
              h('div', { className: 'mono', style: { fontSize: 10, color: '#5a6a5f', fontWeight: 600 } }, val >= 1000 ? Math.round(val / 1000) + 'k' : val),
              h('div', { style: { width: '100%', maxWidth: 36, background: isCur ? 'linear-gradient(180deg,#d4a94a,#a26a10)' : '#e8dcc4', borderRadius: '6px 6px 0 0', height: (val / maxExpected * 140) + 'px', minHeight: 4, transition: 'height .4s' } }),
              h('div', { style: { fontSize: 11, color: isCur ? '#a26a10' : '#7a7663', fontWeight: isCur ? 700 : 500 } }, ep.label),
            );
          }),
        ),
      ]),

      h('div', { style: { height: 20 } }),
      this.card([
        this.sectionHeader('Profit by Plans', 'منافع بمطابق پلانز'),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', height: 200, paddingTop: 16 } },
          ppKeys.map(k => {
            const pp = planProfitData[k];
            const isCur = k === curKey;
            const val = Math.round(pp.profit);
            return h('div', { key: k, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } },
              h('div', { className: 'mono', style: { fontSize: 10, color: '#5a6a5f', fontWeight: 600 } }, val >= 1000 ? Math.round(val / 1000) + 'k' : val),
              h('div', { style: { width: '100%', maxWidth: 36, background: isCur ? 'linear-gradient(180deg,#4a8fd4,#1a4a8f)' : '#c4d8e8', borderRadius: '6px 6px 0 0', height: (val / maxPlanProfit * 140) + 'px', minHeight: 4, transition: 'height .4s' } }),
              h('div', { style: { fontSize: 11, color: isCur ? '#1a4a8f' : '#7a7663', fontWeight: isCur ? 700 : 500 } }, pp.label),
            );
          }),
        ),
      ]),

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
    this.activePlans().forEach(pl => {
      const c = this.state.customers.find(x => x.id === pl.customerId);
      const p = this.state.products.find(x => x.id === pl.productId);
      pl.schedule.forEach(s => { const diff = this.dayDiff(s.dueDate); if (!s.paid && diff < 0) overdueList.push({ pl, s, c, p, diff }); });
    });
    overdueList.sort((a, b) => a.diff - b.diff);
    const waConnected = this.state.waStatus === 'ready';
    return h('div', { className: 'screen' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
        h('div', { style: { fontSize: 14, color: '#7a7663' } }, overdueList.length + ' overdue installments need attention.'),
        overdueList.length > 0 ? h('button', { onClick: () => this.sendAllInstallmentReminders(), disabled: this.state.installmentAutoSending, style: { padding: '8px 16px', borderRadius: 10, background: this.state.installmentAutoSending ? '#94a3b8' : 'linear-gradient(135deg, #25D366, #128C7E)', color: 'white', fontWeight: 700, fontSize: 12, border: 'none', opacity: this.state.installmentAutoSending ? 0.7 : 1 } }, this.state.installmentAutoSending ? '⏳ Sending...' : '🤖 Auto Send All') : null,
      ),
      !waConnected && overdueList.length > 0 ? h('div', { style: { background: '#f59e0b15', border: '1px solid #f59e0b33', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 } },
        h('span', { style: { fontSize: 14 } }, '⚠️'),
        h('div', { style: { flex: 1, color: '#92400e' } }, 'WhatsApp not connected. Go to ', h('strong', {}, 'Udhar Book → WA'), ' button to scan QR for auto-send.'),
      ) : null,
      this.card([
        overdueList.map((r, i) => h('div', { key: i, style: { display: 'flex', gap: 12, padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid #f2eee2', alignItems: 'center', flexWrap: 'wrap' } },
          h('div', { style: { width: 44, height: 44, borderRadius: 12, background: r.c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#3a2f1a' } }, r.c.avatar),
          h('div', { style: { flex: 1, minWidth: 200 } },
            h('div', { style: { fontWeight: 700, fontSize: 15 } }, r.c.name + ' — ', h('span', { className: 'ur', style: { fontWeight: 400, fontSize: 13, color: '#7a7663' } }, r.c.nameUr)),
            h('div', { style: { fontSize: 12, color: '#a4362b', fontWeight: 500 } }, Math.abs(r.diff) + ' days late · ' + r.p.name + ' · ' + this.fmtPKR(r.s.amount)),
          ),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            h('a', { href: this.waLink(r.c.phone, r.c.name, r.s.amount, r.s.dueDate), target: '_blank', rel: 'noopener', style: { background: '#25D366', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' } }, '💬 Manual'),
            h('button', { onClick: () => this.sendInstallmentReminder(r.c, r.pl, r.p, r.s), disabled: this.state.installmentAutoSending, style: { background: this.state.installmentAutoSending ? '#94a3b8' : '#0f6b4b', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 } }, '🤖 Auto'),
            h('a', { href: this.getPortalLink(r.c.phone), target: '_blank', rel: 'noopener', style: { background: '#3b82f6', color: 'white', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' } }, '🔗 Portal'),
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
              h('div', { style: { display: 'flex', gap: 8, marginTop: 2, fontSize: 10, fontWeight: 600 } },
                h('span', { className: 'mono', style: { color: this.accExpenseBal(acc.id) >= 0 ? '#0f6b4b' : '#b91c1c' } }, '💰 ' + this.fmtPKR(this.accExpenseBal(acc.id))),
                h('span', { className: 'mono', style: { color: '#0f6b4b' } }, '📋 ' + this.fmtPKR(this.accPlanBal(acc.id))),
                h('span', { className: 'mono', style: { color: this.accUdharBal(acc.id) >= 0 ? '#3b82f6' : '#b91c1c' } }, '🤝 ' + this.fmtPKR(this.accUdharBal(acc.id))),
              ),
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
        h('div', { style: { fontSize: 16, fontWeight: 700, marginBottom: 4 } }, 'Customer Portal'),
        h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663', marginBottom: 8 } }, 'کسٹمر پورٹل'),
        h('div', { style: { fontSize: 12, color: '#7a7663', marginBottom: 12 } }, 'Share this link with customers so they can check their installment details, payment status, and remaining balance.'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px', background: '#f4f6f3', borderRadius: 10, border: '1px solid #e6eae5' } },
          h('div', { style: { flex: 1, fontSize: 12, color: '#3a4a3f', fontFamily: 'monospace', wordBreak: 'break-all' } }, (typeof window !== 'undefined' ? window.location.origin : '') + '/portal?phone=CUSTOMER_PHONE'),
          h('button', { type: 'button', onClick: () => { const link = (typeof window !== 'undefined' ? window.location.origin : '') + '/portal'; if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => alert('Portal base link copied!\nپورٹل لنک کاپی ہو گیا')); else prompt('Copy this link:', link); }, style: { padding: '8px 14px', borderRadius: 8, background: '#0f6b4b', color: 'white', fontWeight: 600, fontSize: 12, flexShrink: 0, border: 'none', cursor: 'pointer' } }, '📋 Copy'),
        ),
        h('div', { style: { fontSize: 11, color: '#8b978f', marginTop: 8 } }, '💡 Each customer gets a unique link with their phone number. You can also share portal links from individual customer profiles.'),
      ]),
      h('div', { style: { height: 16 } }),
      this.card([
        h('div', { style: { fontSize: 16, fontWeight: 700, marginBottom: 4 } }, 'Quick Links'),
        h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663', marginBottom: 12 } }, 'اہم لنکس'),
        ...[
          ['Aqsat App (Main)', 'اقساط ایپ', 'https://aqsaat.vercel.app', '📱'],
          ['Udhar Book Portal', 'ادھار بک', 'https://udharbook-wheat.vercel.app', '📒'],
          ['Customer Portal', 'کسٹمر پورٹل', (typeof window !== 'undefined' ? window.location.origin : '') + '/portal', '👤'],
        ].map(([label, ur, url, icon]) =>
          h('div', { key: label, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '1px solid #f2eee2' } },
            h('div', { style: { fontSize: 20, width: 36, textAlign: 'center', flexShrink: 0 } }, icon),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 600, fontSize: 14 } }, label),
              h('div', { className: 'ur', style: { fontSize: 11, color: '#7a7663' } }, ur),
              h('div', { style: { fontSize: 11, color: '#8b978f', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 2 } }, url),
            ),
            h('div', { style: { display: 'flex', gap: 6, flexShrink: 0 } },
              h('button', { type: 'button', onClick: () => { if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => alert('Link copied!\nلنک کاپی ہو گیا')); else prompt('Copy:', url); }, style: { padding: '6px 10px', borderRadius: 8, background: '#f4f1e6', color: '#3a4a3f', fontWeight: 600, fontSize: 11, border: 'none', cursor: 'pointer' } }, '📋'),
              h('a', { href: url, target: '_blank', rel: 'noopener', style: { padding: '6px 10px', borderRadius: 8, background: '#eaf5ee', color: '#0f6b4b', fontWeight: 600, fontSize: 11, border: 'none', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' } }, '↗'),
            ),
          ),
        ),
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

  openLedgerModal = (editId) => {
    const accs = this.getAccounts();
    if (editId) {
      const le = this.activeLedger().find(x => x.id === editId);
      if (!le) return;
      this.setState({ ledgerModal: { open: true, type: le.type, amount: String(le.amount), accountId: le.accountId, category: le.category, note: le.note || '', date: le.date, editId } });
    } else {
      this.setState({ ledgerModal: { open: true, type: 'expense', amount: '', accountId: accs.length > 0 ? accs[0].id : '', category: '', note: '', date: this.todayStr(), editId: null } });
    }
  };
  closeLedgerModal = () => this.setState({ ledgerModal: { ...this.state.ledgerModal, open: false } });
  submitLedgerEntry = () => {
    const m = this.state.ledgerModal;
    const amount = parseFloat(m.amount);
    if (!amount || amount <= 0) { alert('Enter a valid amount / درست رقم درج کریں'); return; }
    if (!m.category || m.category === '__add__') { alert('Select a category / زمرہ منتخب کریں'); return; }
    if (!m.accountId) { alert('Select an account / اکاؤنٹ منتخب کریں'); return; }
    const ledger = [...(this.state.ledger || [])];
    if (m.editId) {
      const idx = ledger.findIndex(x => x.id === m.editId);
      if (idx >= 0) ledger[idx] = { ...ledger[idx], type: m.type, amount, accountId: m.accountId, category: m.category, note: m.note, date: m.date };
    } else {
      ledger.unshift({ id: 'le_' + Date.now().toString(36), type: m.type, amount, accountId: m.accountId, category: m.category, note: m.note, date: m.date });
    }
    this.setState({ ledger, ledgerModal: { ...m, open: false } });
  };
  deleteLedgerEntry = (id) => {
    if (!confirm('Delete this entry?\nیہ اندراج حذف کریں؟')) return;
    const ledger = (this.state.ledger || []).map(le => le.id === id ? { ...le, _deleted: true } : le);
    this.setState({ ledger });
  };

  _buildTxList() {
    const tx = [];
    this.activePlans().forEach(pl => {
      const c = (this.state.customers || []).find(x => x.id === pl.customerId);
      const p = (this.state.products || []).find(x => x.id === pl.productId);
      (pl.schedule || []).forEach(s => {
        if (s.paid) tx.push({ source: 'plan', accountId: s.accountId || null, amount: s.amountPaid || s.amount, date: s.paidDate, customer: c, product: p, plan: pl, installment: s });
      });
    });
    this.activeLedger().forEach(le => {
      if (le.udpiRef || le.category === 'Udhar' || le.category === 'Udhar Return') return;
      tx.push({ source: 'ledger', accountId: le.accountId, amount: le.amount, date: le.date, ledgerEntry: le });
    });
    this.activeUdpiEntries().forEach(u => {
      tx.push({ source: 'udpi', accountId: u.accountId, amount: u.amount, date: u.date, udpiEntry: u });
    });
    tx.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return tx;
  }

  _idTime(id) {
    if (!id) return '';
    const part = id.replace(/^[a-z]+_/, '');
    const ms = parseInt(part, 36);
    if (!isFinite(ms) || ms < 1e12) return '';
    const d = new Date(ms);
    return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  _renderTxList(txList, accs, showAccount) {
    const h = this.h;
    if (txList.length === 0) return [h('div', { key: 'empty', style: { padding: '14px 0', color: '#7a7663', fontSize: 13 } }, 'No transactions recorded yet.')];
    const catMap = this.categoryEmojiMap();
    return txList.map((tx, i) => {
      const acc = accs.find(a => a.id === tx.accountId);
      if (tx.source === 'ledger') {
        const le = tx.ledgerEntry;
        const isInc = le.type === 'income';
        const catEmoji = catMap[le.category] || '💡';
        return h('div', { key: 'le-' + i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #f2eee2' } },
          h('div', { style: { fontSize: 16, width: 32, textAlign: 'center', flexShrink: 0 } }, catEmoji),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, le.category),
            h('div', { style: { fontSize: 11, color: '#7a7663', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              (le.note || (isInc ? 'Income' : 'Expense')) + (showAccount && acc ? ' · ' + acc.name : ''),
            ),
          ),
          h('div', { style: { textAlign: 'right', flexShrink: 0 } },
            h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13, color: isInc ? '#0f6b4b' : '#b91c1c' } }, (isInc ? '+ ' : '- ') + this.fmtPKR(le.amount)),
            h('div', { style: { fontSize: 10, color: '#7a7663' } }, this.fmtDate(le.date) + (this._idTime(le.id) ? ' · ' + this._idTime(le.id) : '')),
          ),
        );
      }
      if (tx.source === 'udpi') {
        const u = tx.udpiEntry;
        const isLent = u.direction === 'lent';
        return h('div', { key: 'ud-' + i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #f2eee2' } },
          h('div', { style: { fontSize: 16, width: 32, textAlign: 'center', flexShrink: 0 } }, isLent ? '💸' : '📥'),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, u.person),
            h('div', { style: { fontSize: 11, color: '#7a7663', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              (isLent ? 'Lent / اُدھار دیا' : 'Borrowed / اُدھار لیا') + (u.returned ? ' ✅' : '') + (showAccount && acc ? ' · ' + acc.name : ''),
            ),
          ),
          h('div', { style: { textAlign: 'right', flexShrink: 0 } },
            h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13, color: isLent ? '#b91c1c' : '#3b82f6' } }, (isLent ? '- ' : '+ ') + this.fmtPKR(u.amount)),
            h('div', { style: { fontSize: 10, color: '#7a7663' } }, this.fmtDate(u.date) + (this._idTime(u.id) ? ' · ' + this._idTime(u.id) : '')),
          ),
        );
      }
      return h('div', { key: 'pl-' + i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #f2eee2' } },
        h('div', { style: { fontSize: 16, width: 32, textAlign: 'center', flexShrink: 0 } }, acc ? acc.emoji : '💰'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, tx.customer ? tx.customer.name : 'Unknown'),
          h('div', { style: { fontSize: 11, color: '#7a7663', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            (tx.product ? tx.product.name : '') + ' · #' + tx.installment.n + '/' + tx.plan.months + (showAccount && acc ? ' · ' + acc.name : ''),
          ),
        ),
        h('div', { style: { textAlign: 'right', flexShrink: 0 } },
          h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13, color: '#0f6b4b' } }, '+ ' + this.fmtPKR(tx.amount)),
          h('div', { style: { fontSize: 10, color: '#7a7663' } }, this.fmtDate(tx.date) + (this._idTime(tx.installment && tx.installment.id || tx.plan.id) ? ' · ' + this._idTime(tx.installment && tx.installment.id || tx.plan.id) : '')),
        ),
      );
    });
  }

  renderLedger() {
    const h = this.h;
    const accs = this.getAccounts();
    const entries = this.activeLedger();
    const filter = this.state.ledgerFilter;
    const monthFilter = this.state.ledgerMonthFilter;
    const search = (this.state.ledgerSearch || '').toLowerCase();
    const curMonth = this.todayStr().slice(0, 7);

    const filtered = entries.filter(le => {
      if (filter !== 'all' && le.type !== filter) return false;
      if (monthFilter && !le.date.startsWith(monthFilter)) return false;
      if (search && !(le.category || '').toLowerCase().includes(search) && !(le.note || '').toLowerCase().includes(search)) return false;
      return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const totals = (list) => {
      let inc = 0, exp = 0;
      list.forEach(le => { if (le.type === 'income') inc += le.amount; else exp += le.amount; });
      return { inc, exp, net: inc - exp };
    };
    const noUdharEntries = entries.filter(le => !le.udpiRef && le.category !== 'Udhar' && le.category !== 'Udhar Return' && !this._isPlanLedgerEntry(le));
    const allTime = totals(noUdharEntries);
    const thisMonth = totals(noUdharEntries.filter(le => le.date.startsWith(curMonth)));

    const catMap = this.categoryEmojiMap();

    const catBreakdown = {};
    filtered.filter(le => !this._isPlanLedgerEntry(le) && le.category !== 'Udhar' && le.category !== 'Udhar Return').forEach(le => {
      if (!catBreakdown[le.category]) catBreakdown[le.category] = { inc: 0, exp: 0 };
      if (le.type === 'income') catBreakdown[le.category].inc += le.amount;
      else catBreakdown[le.category].exp += le.amount;
    });
    const catList = Object.entries(catBreakdown).sort((a, b) => (b[1].inc + b[1].exp) - (a[1].inc + a[1].exp));
    const maxCatAmt = catList.length > 0 ? catList[0][1].inc + catList[0][1].exp : 1;

    const months = [...new Set(entries.map(le => le.date.slice(0, 7)))].sort().reverse();

    const filterBtn = (label, val) => h('button', { key: val, onClick: () => this.setState({ ledgerFilter: val }), style: { padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: filter === val ? '#0f6b4b' : '#f4f1e6', color: filter === val ? 'white' : '#3a4a3f', border: filter === val ? '1px solid #0f6b4b' : '1px solid #ece8dc' } }, label);

    // Quick-add chips: top 6 most-used categories (excluding plan-related ones)
    const catCount = {};
    entries.filter(le => !this._isPlanLedgerEntry(le) && le.category !== 'Udhar' && le.category !== 'Udhar Return').forEach(le => { const k = le.type + '|' + le.category; catCount[k] = (catCount[k] || 0) + 1; });
    const topChips = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Recurring entries
    const recurring = this.getRecurring();

    // Udhar (lent/borrowed)
    const udpiList = this.activeUdpiEntries();
    const lentOut = udpiList.filter(u => u.direction === 'lent' && !u.returned);
    const borrowed = udpiList.filter(u => u.direction === 'borrowed' && !u.returned);
    const lentTotal = lentOut.reduce((s, u) => s + u.amount, 0);
    const borrowedTotal = borrowed.reduce((s, u) => s + u.amount, 0);

    const ls = this.state.ledgerSection || 'expenses';
    const secTab = (label, ur, val, icon) => h('button', { onClick: () => this.setState({ ledgerSection: val }), style: { flex: 1, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: ls === val ? '#0f6b4b' : '#fdfcf8', color: ls === val ? 'white' : '#3a4a3f', border: '1px solid ' + (ls === val ? '#0f6b4b' : '#ece8dc'), textAlign: 'center' } },
      h('div', {}, icon + ' ' + label),
      h('div', { className: 'ur', style: { fontSize: 9, marginTop: 1, opacity: 0.8 } }, ur),
    );

    const expEntries = filtered.filter(le => !le.udpiRef && le.category !== 'Udhar' && le.category !== 'Udhar Return' && !this._isPlanLedgerEntry(le));
    const planEntries = filtered.filter(le => this._isPlanLedgerEntry(le));

    const allPlans = this.activePlans();
    const activePlansList = allPlans.filter(p => p.status === 'active');
    const completedPlansList = allPlans.filter(p => p.status === 'completed');
    const recentPayments = [];
    allPlans.forEach(pl => {
      const c = (this.state.customers || []).find(x => x.id === pl.customerId);
      const p = (this.state.products || []).find(x => x.id === pl.productId);
      (pl.schedule || []).forEach(s => {
        if (s.paid) recentPayments.push({ plan: pl, installment: s, customer: c, product: p });
      });
    });
    recentPayments.sort((a, b) => (b.installment.paidDate || '').localeCompare(a.installment.paidDate || ''));
    const totalCollected = recentPayments.reduce((s, rp) => s + (rp.installment.amountPaid || rp.installment.amount), 0);
    const totalPending = allPlans.reduce((s, pl) => s + (pl.schedule || []).filter(si => !si.paid).reduce((ss, si) => ss + si.amount, 0), 0);

    return h('div', { className: 'screen', style: { maxWidth: 800 } },
      h('div', { style: { display: 'flex', gap: 4, marginBottom: 14 } },
        secTab('Expenses', 'اخراجات', 'expenses', '💰'),
        secTab('Plans', 'قسطیں', 'plans', '📋'),
        secTab('Udhar', 'ادھار', 'udhar', '🤝'),
      ),
      ...(ls === 'expenses' ? [
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 14 } },
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'This Month Income'),
          h('div', { className: 'ur', style: { fontSize: 11, color: '#7a7663' } }, 'اس ماہ آمدنی'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: '#0f6b4b', marginTop: 4 } }, this.fmtPKR(thisMonth.inc)),
        ]),
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'This Month Expenses'),
          h('div', { className: 'ur', style: { fontSize: 11, color: '#7a7663' } }, 'اس ماہ اخراجات'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: '#b91c1c', marginTop: 4 } }, this.fmtPKR(thisMonth.exp)),
        ]),
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Net'),
          h('div', { className: 'ur', style: { fontSize: 11, color: '#7a7663' } }, 'خالص'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: allTime.net >= 0 ? '#0f6b4b' : '#b91c1c', marginTop: 4 } }, (allTime.net >= 0 ? '+' : '-') + ' ' + this.fmtPKR(Math.abs(allTime.net))),
        ]),
      ),
      // Quick-add chips
      topChips.length > 0 ? h('div', { style: { marginBottom: 12 } },
        h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Quick Add'),
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          ...topChips.map(([k]) => {
            const [type, cat] = k.split('|');
            return h('button', { key: k, onClick: () => { this.openLedgerModal(); setTimeout(() => { const m = this.state.ledgerModal; this.setState({ ledgerModal: { ...m, type, category: cat } }); }, 50); }, style: { padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: type === 'income' ? '#eaf5ee' : '#fef2f2', color: type === 'income' ? '#0f6b4b' : '#b91c1c', border: '1px solid ' + (type === 'income' ? '#c8e6d0' : '#f5cac2'), cursor: 'pointer' } }, (catMap[cat] || '💡') + ' ' + cat);
          }),
        ),
      ) : null,
      // Action buttons
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 } },
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          h('button', { onClick: () => this.openLedgerModal(), style: { padding: '10px 16px', borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 13 } }, '＋ Entry'),
          h('button', { onClick: () => this.openUdpiModal(), style: { padding: '10px 16px', borderRadius: 10, background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: 13 } }, '💸 Udhar'),
          h('button', { onClick: () => this.openRecurringModal(), style: { padding: '10px 16px', borderRadius: 10, background: '#f4f1e6', color: '#3a4a3f', fontWeight: 700, fontSize: 13, border: '1px solid #ece8dc' } }, '🔄 Recurring'),
        ),
        h('div', { style: { display: 'flex', gap: 4 } }, filterBtn('All', 'all'), filterBtn('Income', 'income'), filterBtn('Expense', 'expense')),
      ),
      // Search
      h('div', { style: { marginBottom: 12 } },
        h('input', { type: 'text', placeholder: 'Search entries... / تلاش کریں', value: this.state.ledgerSearch, onChange: e => this.setState({ ledgerSearch: e.target.value }), style: { width: '100%', padding: '8px 12px', border: '1px solid #ece8dc', borderRadius: 10, fontSize: 13, background: '#fdfcf8', outline: 'none' } }),
      ),
      months.length > 1 ? h('div', { style: { display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' } },
        h('button', { onClick: () => this.setState({ ledgerMonthFilter: '' }), style: { padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: !monthFilter ? '#0f6b4b' : '#f4f1e6', color: !monthFilter ? 'white' : '#7a7663', border: '1px solid ' + (!monthFilter ? '#0f6b4b' : '#ece8dc') } }, 'All'),
        ...months.map(m => h('button', { key: m, onClick: () => this.setState({ ledgerMonthFilter: m }), style: { padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: monthFilter === m ? '#0f6b4b' : '#f4f1e6', color: monthFilter === m ? 'white' : '#7a7663', border: '1px solid ' + (monthFilter === m ? '#0f6b4b' : '#ece8dc') } }, new Date(m + '-01').toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }))),
      ) : null,
      // Recurring entries section
      recurring.length > 0 ? this.card([
        this.sectionHeader('Recurring / بار بار', '', h('span', { style: { fontSize: 12, color: '#7a7663' } }, recurring.length + ' entries')),
        ...recurring.map((r, i) => {
          const acc = accs.find(a => a.id === r.accountId);
          return h('div', { key: r.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #f2eee2' } },
            h('div', { style: { fontSize: 16, width: 32, textAlign: 'center', flexShrink: 0 } }, catMap[r.category] || '🔄'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 600, fontSize: 13 } }, r.category + (r.note ? ' · ' + r.note : '')),
              h('div', { style: { fontSize: 11, color: '#7a7663' } }, 'Day ' + r.day + ' every month' + (acc ? ' · ' + acc.name : '')),
            ),
            h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13, color: r.type === 'income' ? '#0f6b4b' : '#b91c1c', flexShrink: 0 } }, (r.type === 'income' ? '+' : '-') + this.fmtPKR(r.amount)),
            h('div', { style: { display: 'flex', gap: 4, flexShrink: 0 } },
              h('button', { onClick: () => this.openRecurringModal(r.id), style: { padding: '4px 8px', borderRadius: 6, background: '#f4f1e6', fontSize: 11, fontWeight: 600 } }, '✏'),
              h('button', { onClick: () => this.deleteRecurring(r.id), style: { padding: '4px 8px', borderRadius: 6, background: '#fef2f2', color: '#b91c1c', fontSize: 11, fontWeight: 600 } }, '✕'),
            ),
          );
        }),
      ]) : null,
      recurring.length > 0 ? h('div', { style: { height: 12 } }) : null,
      catList.length > 0 ? this.card([
        this.sectionHeader('By Category', 'زمرے کے مطابق'),
        ...catList.map(([cat, v]) => {
          const total = v.inc + v.exp;
          const pct = Math.round((total / maxCatAmt) * 100);
          return h('div', { key: cat, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid #f9f6ee' } },
            h('div', { style: { fontSize: 16, width: 28, textAlign: 'center', flexShrink: 0 } }, catMap[cat] || '💡'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 600, fontSize: 13 } }, cat),
              h('div', { style: { height: 4, background: '#f2eee2', borderRadius: 2, marginTop: 4 } },
                h('div', { style: { height: '100%', width: pct + '%', borderRadius: 2, background: v.exp > v.inc ? '#b91c1c' : '#0f6b4b' } }),
              ),
            ),
            h('div', { className: 'mono', style: { fontSize: 13, fontWeight: 700, textAlign: 'right', flexShrink: 0, minWidth: 80 } },
              v.inc > 0 ? h('span', { style: { color: '#0f6b4b' } }, '+' + this.fmtPKR(v.inc)) : null,
              v.inc > 0 && v.exp > 0 ? ' ' : null,
              v.exp > 0 ? h('span', { style: { color: '#b91c1c' } }, '-' + this.fmtPKR(v.exp)) : null,
            ),
          );
        }),
      ]) : null,
      h('div', { style: { height: 12 } }),
      this.card([
        this.sectionHeader('Transactions', 'لین دین', h('span', { style: { fontSize: 12, color: '#7a7663' } }, expEntries.length + ' entries')),
        ...(expEntries.length === 0 ? [h('div', { key: 'empty', style: { padding: '14px 0', color: '#7a7663', fontSize: 13 } }, 'No entries yet. Tap + Entry to start.')] : expEntries.map((le, i) => {
          const acc = accs.find(a => a.id === le.accountId);
          const isInc = le.type === 'income';
          return h('div', { key: le.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #f2eee2' } },
            h('div', { style: { fontSize: 16, width: 32, textAlign: 'center', flexShrink: 0 } }, catMap[le.category] || '💡'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, le.category),
              h('div', { style: { fontSize: 11, color: '#7a7663', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                (le.note || (isInc ? 'Income' : 'Expense')) + (acc ? ' · ' + acc.emoji + ' ' + acc.name : ''),
              ),
            ),
            h('div', { style: { textAlign: 'right', flexShrink: 0 } },
              h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13, color: isInc ? '#0f6b4b' : '#b91c1c' } }, (isInc ? '+ ' : '- ') + this.fmtPKR(le.amount)),
              h('div', { style: { fontSize: 10, color: '#7a7663' } }, this.fmtDate(le.date) + (this._idTime(le.id) ? ' · ' + this._idTime(le.id) : '')),
            ),
            h('div', { style: { display: 'flex', gap: 4, flexShrink: 0 } },
              h('button', { onClick: e => { e.stopPropagation(); this.openLedgerModal(le.id); }, style: { padding: '4px 8px', borderRadius: 6, background: '#f4f1e6', fontSize: 11, fontWeight: 600 } }, '✏'),
              h('button', { onClick: e => { e.stopPropagation(); this.deleteLedgerEntry(le.id); }, style: { padding: '4px 8px', borderRadius: 6, background: '#fef2f2', color: '#b91c1c', fontSize: 11, fontWeight: 600 } }, '✕'),
            ),
          );
        })),
      ]),
      ] : []),

      // === PLANS SECTION ===
      ...(ls === 'plans' ? [
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 } },
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase' } }, 'Active Plans'),
          h('div', { className: 'ur', style: { fontSize: 9, color: '#7a7663' } }, 'فعال پلانز'),
          h('div', { className: 'mono', style: { fontSize: 22, fontWeight: 800, color: '#0f6b4b', marginTop: 4 } }, activePlansList.length),
        ]),
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase' } }, 'Collected'),
          h('div', { className: 'ur', style: { fontSize: 9, color: '#7a7663' } }, 'وصول شدہ'),
          h('div', { className: 'mono', style: { fontSize: 16, fontWeight: 800, color: '#0f6b4b', marginTop: 4 } }, this.fmtPKR(totalCollected)),
        ]),
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase' } }, 'Pending'),
          h('div', { className: 'ur', style: { fontSize: 9, color: '#7a7663' } }, 'بقایا'),
          h('div', { className: 'mono', style: { fontSize: 16, fontWeight: 800, color: '#b91c1c', marginTop: 4 } }, this.fmtPKR(totalPending)),
        ]),
      ),
      h('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
        h('button', { onClick: () => this.go('newplan'), style: { flex: 1, padding: '10px 16px', borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 13 } }, '＋ New Plan'),
        h('button', { onClick: () => this.go('plans'), style: { flex: 1, padding: '10px 16px', borderRadius: 10, background: '#f4f1e6', color: '#3a4a3f', fontWeight: 700, fontSize: 13, border: '1px solid #ece8dc' } }, '📋 All Plans'),
      ),
      activePlansList.length > 0 ? this.card([
        this.sectionHeader('Active Plans', 'فعال پلانز'),
        ...activePlansList.slice(0, 10).map((pl, i) => {
          const c = (this.state.customers || []).find(x => x.id === pl.customerId);
          const p = (this.state.products || []).find(x => x.id === pl.productId);
          const paid = (pl.schedule || []).filter(s => s.paid).length;
          const total = (pl.schedule || []).length;
          const collected = (pl.schedule || []).filter(s => s.paid).reduce((ss, s) => ss + (s.amountPaid || s.amount), 0);
          const pct = total > 0 ? Math.round(paid / total * 100) : 0;
          return h('div', { key: pl.id, onClick: () => this.go('plan', pl.id), style: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid #f2eee2' } },
            h('div', { style: { width: 36, height: 36, borderRadius: 10, background: '#eaf5ee', color: '#0f6b4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 } }, paid + '/' + total),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c ? c.name : 'Unknown'),
              h('div', { style: { fontSize: 11, color: '#7a7663', marginTop: 2 } }, (p ? p.name : '') + ' · ' + this.fmtPKR(collected) + ' collected'),
              h('div', { style: { height: 4, background: '#f2eee2', borderRadius: 2, marginTop: 4 } },
                h('div', { style: { height: '100%', width: pct + '%', borderRadius: 2, background: '#0f6b4b', transition: 'width .3s' } }),
              ),
            ),
            h('div', { style: { color: '#7a7663', fontSize: 16, flexShrink: 0 } }, '›'),
          );
        }),
      ]) : h('div', { style: { textAlign: 'center', padding: '40px 20px', color: '#7a7663' } },
        h('div', { style: { fontSize: 48, marginBottom: 12 } }, '📋'),
        h('div', { style: { fontWeight: 800, fontSize: 16, color: '#3a4a3f' } }, 'No active plans'),
        h('div', { className: 'ur', style: { fontSize: 13 } }, 'کوئی فعال پلان نہیں'),
      ),
      recentPayments.length > 0 ? h('div', { style: { height: 12 } }) : null,
      recentPayments.length > 0 ? this.card([
        this.sectionHeader('Recent Payments', 'حالیہ ادائیگیاں'),
        ...recentPayments.slice(0, 15).map((rp, i) => {
          const acc = accs.find(a => a.id === rp.installment.accountId);
          return h('div', { key: 'rp' + i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #f2eee2' } },
            h('div', { style: { fontSize: 16, width: 32, textAlign: 'center', flexShrink: 0 } }, '💰'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (rp.customer ? rp.customer.name : 'Unknown') + ' — #' + rp.installment.n),
              h('div', { style: { fontSize: 11, color: '#7a7663' } }, (rp.product ? rp.product.name : '') + (acc ? ' · ' + acc.emoji + ' ' + acc.name : '') + ' · ' + this.fmtDate(rp.installment.paidDate)),
            ),
            h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13, color: '#0f6b4b', flexShrink: 0 } }, '+ ' + this.fmtPKR(rp.installment.amountPaid || rp.installment.amount)),
          );
        }),
      ]) : null,
      ] : []),

      // === UDHAR SECTION ===
      ...(ls === 'udhar' ? [
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 } },
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' } }, 'You Will Get'),
          h('div', { className: 'ur', style: { fontSize: 9, color: '#7a7663' } }, 'آپ کو ملیں گے'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: '#b91c1c', marginTop: 4 } }, this.fmtPKR(lentTotal)),
          h('div', { style: { fontSize: 10, color: '#7a7663', marginTop: 2 } }, lentOut.length + ' pending'),
        ]),
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#0f6b4b', textTransform: 'uppercase' } }, 'You Will Give'),
          h('div', { className: 'ur', style: { fontSize: 9, color: '#7a7663' } }, 'آپ نے دینے ہیں'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: '#0f6b4b', marginTop: 4 } }, this.fmtPKR(borrowedTotal)),
          h('div', { style: { fontSize: 10, color: '#7a7663', marginTop: 2 } }, borrowed.length + ' pending'),
        ]),
      ),
      h('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
        h('button', { onClick: () => this.openUdpiModal(), style: { flex: 1, padding: '10px 16px', borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 13 } }, '＋ New Entry'),
        h('button', { onClick: () => this.go('udharbook'), style: { flex: 1, padding: '10px 16px', borderRadius: 10, background: '#f4f1e6', color: '#3a4a3f', fontWeight: 700, fontSize: 13, border: '1px solid #ece8dc' } }, '📒 Full Udhar Book'),
      ),
      (lentOut.length > 0 || borrowed.length > 0) ? this.card([
        this.sectionHeader('Outstanding / بقایا', '', h('span', { style: { fontSize: 12, color: '#7a7663' } }, (lentOut.length + borrowed.length) + ' entries')),
        ...[...lentOut, ...borrowed].slice(0, 20).map((u, i) => {
          const acc = accs.find(a => a.id === u.accountId);
          const isLent = u.direction === 'lent';
          return h('div', { key: u.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #f2eee2' } },
            h('div', { style: { fontSize: 16, width: 32, textAlign: 'center', flexShrink: 0 } }, isLent ? '💸' : '📥'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 600, fontSize: 13 } }, u.person),
              h('div', { style: { fontSize: 11, color: '#7a7663' } }, (isLent ? 'Lent' : 'Borrowed') + (u.note ? ' · ' + u.note : '') + (acc ? ' · ' + acc.name : '') + ' · ' + this.fmtDate(u.date)),
            ),
            h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 13, color: isLent ? '#b91c1c' : '#3b82f6', flexShrink: 0 } }, this.fmtPKR(u.amount)),
            h('div', { style: { display: 'flex', gap: 4, flexShrink: 0 } },
              h('button', { onClick: () => this.markUdpiReturned(u.id), style: { padding: '4px 8px', borderRadius: 6, background: '#eaf5ee', color: '#0f6b4b', fontSize: 11, fontWeight: 600 } }, '✅'),
              h('button', { onClick: () => this.openUdpiModal(u.id), style: { padding: '4px 8px', borderRadius: 6, background: '#f4f1e6', fontSize: 11, fontWeight: 600 } }, '✏'),
              h('button', { onClick: () => this.deleteUdpiEntry(u.id), style: { padding: '4px 8px', borderRadius: 6, background: '#fef2f2', color: '#b91c1c', fontSize: 11, fontWeight: 600 } }, '✕'),
            ),
          );
        }),
      ]) : h('div', { style: { textAlign: 'center', padding: '40px 20px', color: '#7a7663' } },
        h('div', { style: { fontSize: 48, marginBottom: 12 } }, '🤝'),
        h('div', { style: { fontWeight: 800, fontSize: 16, color: '#3a4a3f' } }, 'No outstanding entries'),
        h('div', { className: 'ur', style: { fontSize: 13 } }, 'کوئی بقایا نہیں'),
      ),
      ] : []),

      this.renderLedgerModal(),
      this.renderRecurringModal(),
      this.renderUdpiModal(),
    );
  }

  renderLedgerModal() {
    const h = this.h;
    const m = this.state.ledgerModal;
    if (!m.open) return null;
    const accs = this.getAccounts();
    const inpStyle = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    const setM = (k, v) => this.setState({ ledgerModal: { ...m, [k]: v } });
    const typeBtn = (label, val, color) => h('button', { key: val, onClick: () => setM('type', val), style: { flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: m.type === val ? (val === 'income' ? '#eaf5ee' : '#fef2f2') : '#f4f1e6', color: m.type === val ? color : '#7a7663', border: '1.5px solid ' + (m.type === val ? color : '#ece8dc') } }, label);

    return h('div', { onClick: e => { if (e.target === e.currentTarget) this.closeLedgerModal(); }, style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#fdfcf8', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
          h('div', { style: { fontSize: 18, fontWeight: 800 } }, m.editId ? 'Edit Entry' : 'Add Entry', ' ', h('span', { className: 'ur', style: { fontSize: 14, fontWeight: 400, color: '#7a7663' } }, m.editId ? 'ترمیم' : 'نیا اندراج')),
          h('button', { onClick: () => this.closeLedgerModal(), style: { width: 32, height: 32, borderRadius: '50%', background: '#f4f1e6', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '✕'),
        ),
        h('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
          typeBtn('⬆ Income / آمدنی', 'income', '#0f6b4b'),
          typeBtn('⬇ Expense / خرچ', 'expense', '#b91c1c'),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Amount (Rs) ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'رقم')),
          h('input', { type: 'number', min: 0, value: m.amount, onChange: e => setM('amount', e.target.value), placeholder: '0', style: { ...inpStyle, fontSize: 20, fontWeight: 700 } }),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Category ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'زمرہ')),
          this.categoryPicker(m, setM),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Account ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'اکاؤنٹ')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(' + Math.min(accs.length, 3) + ',1fr)', gap: 6 } },
            ...accs.map(acc => h('button', { key: acc.id, onClick: () => setM('accountId', acc.id), style: { padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, textAlign: 'center', background: m.accountId === acc.id ? '#eaf5ee' : '#f4f1e6', color: m.accountId === acc.id ? '#0f6b4b' : '#3a4a3f', border: '1.5px solid ' + (m.accountId === acc.id ? '#0f6b4b' : '#ece8dc') } },
              h('div', { style: { fontSize: 18, marginBottom: 2 } }, acc.emoji),
              h('div', {}, acc.name),
              h('div', { className: 'mono', style: { fontSize: 10, color: '#7a7663', marginTop: 2 } }, '💰 ' + this.fmtPKR(this.accExpenseBal(acc.id))),
            )),
          ),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 } },
          h('div', {},
            h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Date ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'تاریخ')),
            h('input', { type: 'date', value: m.date, onChange: e => setM('date', e.target.value), style: inpStyle }),
          ),
          h('div', {},
            h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Note ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'نوٹ')),
            h('input', { type: 'text', value: m.note, onChange: e => setM('note', e.target.value), placeholder: 'Optional', style: inpStyle }),
          ),
        ),
        h('button', { onClick: () => this.submitLedgerEntry(), style: { width: '100%', padding: '14px', borderRadius: 12, background: m.type === 'income' ? '#0f6b4b' : '#b91c1c', color: 'white', fontSize: 15, fontWeight: 800 } }, m.editId ? 'Save Changes' : (m.type === 'income' ? '⬆ Add Income' : '⬇ Add Expense')),
      ),
    );
  }

  renderRecurringModal() {
    const h = this.h;
    const m = this.state.recurringModal;
    if (!m.open) return null;
    const accs = this.getAccounts();
    const inpStyle = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    const setM = (k, v) => this.setState({ recurringModal: { ...m, [k]: v } });
    const typeBtn = (label, val, color) => h('button', { key: val, onClick: () => setM('type', val), style: { flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: m.type === val ? (val === 'income' ? '#eaf5ee' : '#fef2f2') : '#f4f1e6', color: m.type === val ? color : '#7a7663', border: '1.5px solid ' + (m.type === val ? color : '#ece8dc') } }, label);

    return h('div', { onClick: e => { if (e.target === e.currentTarget) this.closeRecurringModal(); }, style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#fdfcf8', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
          h('div', { style: { fontSize: 18, fontWeight: 800 } }, '🔄 ', m.editId ? 'Edit Recurring' : 'New Recurring', ' ', h('span', { className: 'ur', style: { fontSize: 14, fontWeight: 400, color: '#7a7663' } }, 'بار بار')),
          h('button', { onClick: () => this.closeRecurringModal(), style: { width: 32, height: 32, borderRadius: '50%', background: '#f4f1e6', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '✕'),
        ),
        h('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
          typeBtn('⬆ Income', 'income', '#0f6b4b'),
          typeBtn('⬇ Expense', 'expense', '#b91c1c'),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Amount (Rs) ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'رقم')),
          h('input', { type: 'number', min: 0, value: m.amount, onChange: e => setM('amount', e.target.value), placeholder: '0', style: { ...inpStyle, fontSize: 20, fontWeight: 700 } }),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Day of month ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'مہینے کا دن')),
          h('input', { type: 'number', min: 1, max: 28, value: m.day, onChange: e => setM('day', Math.min(28, Math.max(1, parseInt(e.target.value) || 1))), style: inpStyle }),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Category ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'زمرہ')),
          this.categoryPicker(m, setM),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Account ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'اکاؤنٹ')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(' + Math.min(accs.length, 3) + ',1fr)', gap: 6 } },
            ...accs.map(acc => h('button', { key: acc.id, onClick: () => setM('accountId', acc.id), style: { padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, textAlign: 'center', background: m.accountId === acc.id ? '#eaf5ee' : '#f4f1e6', color: m.accountId === acc.id ? '#0f6b4b' : '#3a4a3f', border: '1.5px solid ' + (m.accountId === acc.id ? '#0f6b4b' : '#ece8dc') } },
              h('div', { style: { fontSize: 18, marginBottom: 2 } }, acc.emoji),
              h('div', {}, acc.name),
            )),
          ),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Note ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'نوٹ')),
          h('input', { type: 'text', value: m.note, onChange: e => setM('note', e.target.value), placeholder: 'e.g. Shop rent', style: inpStyle }),
        ),
        h('button', { onClick: () => this.submitRecurring(), style: { width: '100%', padding: '14px', borderRadius: 12, background: '#0f6b4b', color: 'white', fontSize: 15, fontWeight: 800 } }, m.editId ? 'Save Changes' : '🔄 Add Recurring'),
      ),
    );
  }

  renderUdpiModal() {
    const h = this.h;
    const m = this.state.udpiModal;
    if (!m.open) return null;
    const accs = this.getAccounts();
    const inpStyle = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    const setM = (k, v) => this.setState({ udpiModal: { ...m, [k]: v } });
    const dirBtn = (label, val, color) => h('button', { key: val, onClick: () => setM('direction', val), style: { flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: m.direction === val ? (val === 'lent' ? '#fef2f2' : '#eff6ff') : '#f4f1e6', color: m.direction === val ? color : '#7a7663', border: '1.5px solid ' + (m.direction === val ? color : '#ece8dc') } }, label);

    return h('div', { onClick: e => { if (e.target === e.currentTarget) this.closeUdpiModal(); }, style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#fdfcf8', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
          h('div', { style: { fontSize: 18, fontWeight: 800 } }, '💸 ', m.editId ? 'Edit Udhar' : 'New Udhar', ' ', h('span', { className: 'ur', style: { fontSize: 14, fontWeight: 400, color: '#7a7663' } }, 'اُدھار')),
          h('button', { onClick: () => this.closeUdpiModal(), style: { width: 32, height: 32, borderRadius: '50%', background: '#f4f1e6', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '✕'),
        ),
        h('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
          dirBtn('💸 I Lent / میں نے دیا', 'lent', '#b91c1c'),
          dirBtn('📥 I Borrowed / میں نے لیا', 'borrowed', '#3b82f6'),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Person ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'شخص کا نام')),
          h('input', { type: 'text', value: m.person, onChange: e => setM('person', e.target.value), placeholder: 'Name...', style: inpStyle }),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Amount (Rs) ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'رقم')),
          h('input', { type: 'number', min: 0, value: m.amount, onChange: e => setM('amount', e.target.value), placeholder: '0', style: { ...inpStyle, fontSize: 20, fontWeight: 700 } }),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Account ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'اکاؤنٹ')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(' + Math.min(accs.length, 3) + ',1fr)', gap: 6 } },
            ...accs.map(acc => h('button', { key: acc.id, onClick: () => setM('accountId', acc.id), style: { padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, textAlign: 'center', background: m.accountId === acc.id ? '#eaf5ee' : '#f4f1e6', color: m.accountId === acc.id ? '#0f6b4b' : '#3a4a3f', border: '1.5px solid ' + (m.accountId === acc.id ? '#0f6b4b' : '#ece8dc') } },
              h('div', { style: { fontSize: 18, marginBottom: 2 } }, acc.emoji),
              h('div', {}, acc.name),
            )),
          ),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 } },
          h('div', {},
            h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Date ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'تاریخ')),
            h('input', { type: 'date', value: m.date, onChange: e => setM('date', e.target.value), style: inpStyle }),
          ),
          h('div', {},
            h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Due Date ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'واپسی تاریخ')),
            h('input', { type: 'date', value: m.dueDate || '', onChange: e => setM('dueDate', e.target.value), style: inpStyle }),
          ),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Note ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'نوٹ')),
          h('input', { type: 'text', value: m.note, onChange: e => setM('note', e.target.value), placeholder: 'Optional', style: inpStyle }),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Category ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'زمرہ')),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            ...[['', '🏷 None'], ['business', '💼 Business'], ['personal', '👤 Personal'], ['family', '👨‍👩‍👧 Family'], ['emergency', '🚨 Emergency']].map(([val, label]) =>
              h('button', { key: val, onClick: () => setM('category', val), style: { padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: m.category === val ? '#eaf5ee' : '#f4f1e6', color: m.category === val ? '#0f6b4b' : '#7a7663', border: '1.5px solid ' + (m.category === val ? '#0f6b4b' : '#ece8dc') } }, label)
            ),
          ),
        ),
        h('div', { style: { marginBottom: 14 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Receipt / Photo ', h('span', { className: 'ur', style: { color: '#7a7663', fontWeight: 400 } }, 'رسید')),
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            h('label', { style: { padding: '8px 14px', borderRadius: 10, background: '#f4f1e6', border: '1.5px dashed #ece8dc', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#7a7663', display: 'inline-flex', alignItems: 'center', gap: 4 } },
              '📷 ', m.photo ? 'Change Photo' : 'Add Photo',
              h('input', { type: 'file', accept: 'image/*', capture: 'environment', onChange: (e) => this.handleUdharPhoto(e), style: { display: 'none' } }),
            ),
            m.photo ? h('div', { style: { position: 'relative' } },
              h('img', { src: m.photo, style: { width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid #ece8dc' } }),
              h('button', { onClick: () => setM('photo', null), style: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#b91c1c', color: 'white', fontSize: 10, fontWeight: 800, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } }, '✕'),
            ) : null,
          ),
        ),
        h('button', { onClick: () => this.submitUdpiEntry(), style: { width: '100%', padding: '14px', borderRadius: 12, background: m.direction === 'lent' ? '#b91c1c' : '#3b82f6', color: 'white', fontSize: 15, fontWeight: 800 } }, m.editId ? 'Save Changes' : (m.direction === 'lent' ? '💸 Record Gave' : '📥 Record Got')),
      ),
    );
  }

  _getUdharParties() {
    const entries = this.activeUdpiEntries();
    const today = this.todayStr();
    const map = {};
    entries.forEach(u => {
      const name = u.person.trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!map[key]) map[key] = { name, entries: [], lent: 0, borrowed: 0, lastDate: '', overdueCount: 0, phone: null };
      map[key].entries.push(u);
      const remaining = u.amount - (u.returnedAmount || 0);
      if (u.direction === 'lent' && !u.returned) map[key].lent += remaining;
      else if (u.direction === 'borrowed' && !u.returned) map[key].borrowed += remaining;
      if (u.date > map[key].lastDate) map[key].lastDate = u.date;
      if (!u.returned && u.dueDate && u.dueDate < today) map[key].overdueCount++;
    });
    return Object.values(map).map(p => {
      const phone = this._getUdharPersonPhone(p.name);
      return { ...p, balance: p.lent - p.borrowed, phone };
    });
  }

  renderUdharActivity() {
    const h = this.h;
    const aq = (this.state.activitySearch || '').toLowerCase();
    const activityFilter = this.state.activityFilter || 'all';
    let entries = this.activeUdpiEntries().slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));
    if (aq) entries = entries.filter(u => u.person.toLowerCase().includes(aq) || (u.note || '').toLowerCase().includes(aq));
    if (activityFilter === 'gave') entries = entries.filter(u => u.direction === 'lent');
    else if (activityFilter === 'got') entries = entries.filter(u => u.direction === 'borrowed');
    else if (activityFilter === 'pending') entries = entries.filter(u => !u.returned);
    const accs = this.getAccounts();
    const grouped = {};
    entries.forEach(u => {
      const d = u.date || 'Unknown';
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(u);
    });
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const today = this.todayStr();
    const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
    const dateLabel = (d) => d === today ? 'Today / آج' : d === yesterday ? 'Yesterday / کل' : new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const fBtn = (label, val) => h('button', { key: val, onClick: () => this.setState({ activityFilter: val }), style: { padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: activityFilter === val ? '#1a2b1f' : 'transparent', color: activityFilter === val ? 'white' : '#7a7663', border: activityFilter === val ? 'none' : '1px solid #e5e2d6' } }, label);

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
      h('div', { style: { display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' } },
        h('div', { style: { flex: 1, position: 'relative' } },
          h('span', { style: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#7a7663', pointerEvents: 'none' } }, '🔍'),
          h('input', { type: 'text', value: this.state.activitySearch || '', onChange: e => this.setState({ activitySearch: e.target.value }), placeholder: 'Search transactions...', style: { width: '100%', border: '1px solid #ece8dc', borderRadius: 8, padding: '8px 10px 8px 32px', fontSize: 12, background: '#fdfcf8', outline: 'none' } }),
        ),
      ),
      h('div', { style: { display: 'flex', gap: 4, marginBottom: 8 } },
        fBtn('All', 'all'), fBtn('Gave', 'gave'), fBtn('Got', 'got'), fBtn('Pending', 'pending'),
      ),
      entries.length === 0
        ? h('div', { style: { textAlign: 'center', padding: '40px 20px', color: '#7a7663' } },
            h('div', { style: { fontSize: 48, marginBottom: 12 } }, '📋'),
            h('div', { style: { fontWeight: 800, fontSize: 16, color: '#1a2b1f' } }, 'No activity yet'),
            h('div', { className: 'ur', style: { fontSize: 13 } }, 'ابھی تک کوئی سرگرمی نہیں'),
          )
        : dates.map(d => h('div', { key: d },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#7a7663', padding: '10px 0 6px', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid #ece8dc', marginBottom: 4 } }, dateLabel(d)),
            ...grouped[d].map(u => {
              const isLent = u.direction === 'lent';
              const acc = accs.find(a => a.id === u.accountId);
              return h('div', { key: u.id, onClick: () => this.setState({ udharPerson: u.person.trim() }), style: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fdfcf8', borderRadius: 10, border: '1px solid #ece8dc', borderLeft: '4px solid ' + (isLent ? '#b91c1c' : '#0f6b4b'), marginBottom: 3 } },
                h('div', { style: { width: 28, height: 28, borderRadius: 7, background: isLent ? '#fef2f2' : '#f0fdf4', color: isLent ? '#b91c1c' : '#0f6b4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 } }, isLent ? '↑' : '↓'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, u.person.trim()),
                  h('div', { style: { fontSize: 11, color: '#7a7663', marginTop: 1 } },
                    u.note || (isLent ? 'Gave' : 'Got'),
                    acc ? ' · ' + acc.emoji + ' ' + acc.name : '',
                  ),
                ),
                h('div', { style: { textAlign: 'right', flexShrink: 0 } },
                  h('div', { className: 'mono', style: { fontWeight: 800, fontSize: 13, color: isLent ? '#b91c1c' : '#0f6b4b' } }, (isLent ? '-' : '+') + this.fmtPKR(u.amount)),
                  u.returned ? h('div', { style: { fontSize: 9, color: '#0f6b4b', fontWeight: 600 } }, '✓ Settled') : null,
                ),
              );
            }),
          )),
    );
  }

  renderUdharReports() {
    const h = this.h;
    const entries = this.activeUdpiEntries();
    const parties = this._getUdharParties();
    const today = this.todayStr();
    const months = {};
    entries.forEach(u => {
      const m = (u.date || '').substring(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { gave: 0, got: 0, count: 0, settled: 0 };
      if (u.direction === 'lent') months[m].gave += u.amount;
      else months[m].got += u.amount;
      months[m].count++;
      if (u.returned) months[m].settled++;
    });
    const monthKeys = Object.keys(months).sort().slice(-6);
    const maxAmount = Math.max(...monthKeys.map(k => Math.max(months[k].gave, months[k].got)), 1);
    const totalGave = entries.filter(u => u.direction === 'lent').reduce((s, u) => s + u.amount, 0);
    const totalGot = entries.filter(u => u.direction === 'borrowed').reduce((s, u) => s + u.amount, 0);
    const totalSettled = entries.filter(u => u.returned).length;
    const totalPending = entries.filter(u => !u.returned).length;
    const settlementRate = entries.length > 0 ? Math.round(totalSettled / entries.length * 100) : 0;
    const avgTxn = entries.length > 0 ? Math.round(entries.reduce((s, u) => s + u.amount, 0) / entries.length) : 0;
    const topDebtors = parties.filter(p => p.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);
    const topCreditors = parties.filter(p => p.balance < 0).sort((a, b) => a.balance - b.balance).slice(0, 5);
    const overdueEntries = entries.filter(u => !u.returned && u.dueDate && u.dueDate < today);
    const overdueAmount = overdueEntries.reduce((s, u) => s + (u.amount - (u.returnedAmount || 0)), 0);

    const statCard = (label, ur, value, sub, bg, ac) => h('div', { style: { background: bg, borderRadius: 12, padding: '12px 14px', border: '1px solid #ece8dc' } },
      h('div', { style: { fontSize: 10, fontWeight: 700, color: ac, textTransform: 'uppercase', letterSpacing: '0.04em' } }, label),
      h('div', { className: 'ur', style: { fontSize: 9, color: '#7a7663' } }, ur),
      h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: ac, marginTop: 4 } }, value),
      sub ? h('div', { style: { fontSize: 10, color: '#7a7663', marginTop: 2 } }, sub) : null,
    );

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
        statCard('Total Gave', 'کل دیا', this.fmtPKR(totalGave), entries.filter(u => u.direction === 'lent').length + ' entries', '#fef2f2', '#b91c1c'),
        statCard('Total Got', 'کل لیا', this.fmtPKR(totalGot), entries.filter(u => u.direction === 'borrowed').length + ' entries', '#f0fdf4', '#0f6b4b'),
        statCard('Settlement', 'تصفیہ', settlementRate + '%', totalSettled + ' of ' + entries.length + ' settled', '#f4f1e6', '#3a4a3f'),
        statCard('Avg Amount', 'اوسط رقم', this.fmtPKR(avgTxn), totalPending + ' pending', '#eff6ff', '#3b82f6'),
      ),
      overdueAmount > 0 ? h('div', { style: { background: '#fef2f2', borderRadius: 14, padding: '14px 16px', border: '1px solid #fecaca' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', {},
            h('div', { style: { fontWeight: 800, fontSize: 13, color: '#b91c1c' } }, '⚠ Overdue Amount / واجب المعیاد'),
            h('div', { style: { fontSize: 11, color: '#9a6060', marginTop: 2 } }, overdueEntries.length + ' entries past due date'),
          ),
          h('div', { className: 'mono', style: { fontSize: 22, fontWeight: 800, color: '#b91c1c' } }, this.fmtPKR(overdueAmount)),
        ),
      ) : null,
      monthKeys.length > 0 ? h('div', { style: { background: '#fdfcf8', borderRadius: 14, padding: '16px', border: '1px solid #ece8dc' } },
        h('div', { style: { fontWeight: 800, fontSize: 14, color: '#1a2b1f', marginBottom: 4 } }, 'Monthly Trend / ماہانہ رجحان'),
        h('div', { style: { fontSize: 11, color: '#7a7663', marginBottom: 12 } }, 'Last ' + monthKeys.length + ' months'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          monthKeys.map(k => {
            const m = months[k];
            const label = new Date(k + '-01T00:00:00').toLocaleDateString('en', { month: 'short', year: '2-digit' });
            return h('div', { key: k },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 } },
                h('span', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', width: 55 } }, label),
                h('span', { style: { fontSize: 10, color: '#7a7663' } }, m.count + ' txns'),
              ),
              h('div', { style: { display: 'flex', gap: 4, alignItems: 'center' } },
                h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 } },
                  h('div', { style: { height: 8, borderRadius: 4, background: '#b91c1c', width: Math.max(4, m.gave / maxAmount * 100) + '%', transition: 'width .3s' } }),
                  h('div', { style: { height: 8, borderRadius: 4, background: '#0f6b4b', width: Math.max(4, m.got / maxAmount * 100) + '%', transition: 'width .3s' } }),
                ),
                h('div', { style: { width: 65, textAlign: 'right', flexShrink: 0 } },
                  h('div', { className: 'mono', style: { fontSize: 9, color: '#b91c1c', fontWeight: 700 } }, this.fmtPKR(m.gave)),
                  h('div', { className: 'mono', style: { fontSize: 9, color: '#0f6b4b', fontWeight: 700 } }, this.fmtPKR(m.got)),
                ),
              ),
            );
          }),
        ),
        h('div', { style: { display: 'flex', gap: 16, marginTop: 10, paddingTop: 8, borderTop: '1px solid #ece8dc' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#7a7663' } },
            h('div', { style: { width: 10, height: 10, borderRadius: 2, background: '#b91c1c' } }),
            'Gave / دیا',
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#7a7663' } },
            h('div', { style: { width: 10, height: 10, borderRadius: 2, background: '#0f6b4b' } }),
            'Got / لیا',
          ),
        ),
      ) : null,
      topDebtors.length > 0 ? h('div', { style: { background: '#fdfcf8', borderRadius: 14, padding: '16px', border: '1px solid #ece8dc' } },
        h('div', { style: { fontWeight: 800, fontSize: 14, color: '#b91c1c', marginBottom: 10 } }, 'Top Debtors / سب سے زیادہ مقروض'),
        topDebtors.map((p, i) => {
          const trust = this.getUdharTrust(p.name);
          return h('div', { key: p.name, onClick: () => this.setState({ udharPerson: p.name, udharTab: 'parties' }), style: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < topDebtors.length - 1 ? '1px solid #ece8dc' : 'none' } },
            h('div', { style: { width: 22, height: 22, borderRadius: 6, background: '#fef2f2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 } }, i + 1),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, p.name),
              h('div', { style: { fontSize: 10, color: trust.color, fontWeight: 600, marginTop: 1 } }, trust.label + ' · ' + p.entries.length + ' entries'),
            ),
            h('div', { className: 'mono', style: { fontWeight: 800, fontSize: 14, color: '#b91c1c', flexShrink: 0 } }, this.fmtPKR(p.balance)),
          );
        }),
      ) : null,
      topCreditors.length > 0 ? h('div', { style: { background: '#fdfcf8', borderRadius: 14, padding: '16px', border: '1px solid #ece8dc' } },
        h('div', { style: { fontWeight: 800, fontSize: 14, color: '#0f6b4b', marginBottom: 10 } }, 'You Owe / آپ پر واجب'),
        topCreditors.map((p, i) => h('div', { key: p.name, onClick: () => this.setState({ udharPerson: p.name, udharTab: 'parties' }), style: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < topCreditors.length - 1 ? '1px solid #ece8dc' : 'none' } },
          h('div', { style: { width: 22, height: 22, borderRadius: 6, background: '#f0fdf4', color: '#0f6b4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 } }, i + 1),
          h('div', { style: { flex: 1, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, p.name),
          h('div', { className: 'mono', style: { fontWeight: 800, fontSize: 14, color: '#0f6b4b', flexShrink: 0 } }, this.fmtPKR(Math.abs(p.balance))),
        )),
      ) : null,
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
        statCard('Total Parties', 'کل فریقین', parties.length, (parties.filter(p => p.balance > 0).length) + ' receivable, ' + (parties.filter(p => p.balance < 0).length) + ' payable', '#fdfcf8', '#3a4a3f'),
        statCard('Active', 'فعال', parties.filter(p => p.balance !== 0).length, parties.filter(p => p.balance === 0).length + ' settled', '#fdfcf8', '#3a4a3f'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 } },
        h('button', { onClick: () => this.exportUdharBook(), style: { padding: '12px', borderRadius: 12, background: '#1a2b1f', color: 'white', fontWeight: 700, fontSize: 12, border: 'none' } }, '📋 Copy'),
        h('button', { onClick: () => this.exportUdharCSV(), style: { padding: '12px', borderRadius: 12, background: '#334155', color: '#e2e8f0', fontWeight: 700, fontSize: 12, border: 'none' } }, '📊 CSV'),
        h('button', { onClick: () => this.shareUdharBookWhatsApp(), style: { padding: '12px', borderRadius: 12, background: '#25D366', color: 'white', fontWeight: 700, fontSize: 12, border: 'none' } }, '💬 Share'),
      ),
    );
  }

  renderUdharBook() {
    const h = this.h;
    if (this.state.invoiceView) return this.renderInvoiceView(this.state.invoiceView);
    const selectedPerson = this.state.udharPerson;
    if (selectedPerson) return this.renderUdharPersonDetail(selectedPerson);

    const parties = this._getUdharParties();
    const q = (this.state.udharSearch || '').toLowerCase();
    const sort = this.state.udharSort || 'recent';
    const filter = this.state.udharFilter || 'all';
    let filtered = q ? parties.filter(p => p.name.toLowerCase().includes(q)) : parties;
    if (filter === 'receivable') filtered = filtered.filter(p => p.balance > 0);
    else if (filter === 'payable') filtered = filtered.filter(p => p.balance < 0);
    else if (filter === 'settled') filtered = filtered.filter(p => p.balance === 0);
    const catFilter = this.state.udharCategoryFilter || '';
    if (catFilter) filtered = filtered.filter(p => { const m = this.getUdharMeta(p.name); return (m.category || '') === catFilter; });
    if (sort === 'balance') filtered.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    else if (sort === 'recent') filtered.sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));
    else if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else filtered.sort((a, b) => { const rd = (b.lastDate || '').localeCompare(a.lastDate || ''); if (rd !== 0) return rd; return b.entries.length - a.entries.length; });

    const totalReceivable = parties.reduce((s, p) => s + Math.max(0, p.balance), 0);
    const totalPayable = parties.reduce((s, p) => s + Math.max(0, -p.balance), 0);
    const receivableCount = parties.filter(p => p.balance > 0).length;
    const payableCount = parties.filter(p => p.balance < 0).length;

    const initials = (name) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const avatarColors = ['#b91c1c','#0f6b4b','#3b82f6','#a26a10','#7c3aed','#0891b2','#c2410c','#4338ca'];
    const getAvatarColor = (name) => avatarColors[Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];

    const ub = { bg: '#f4f6f3', card: '#fff', cardAlt: '#f8faf7', border: '#e6eae5', borderLight: '#f0f2ee', text: '#16211c', textMid: '#3d4a44', muted: '#8b978f', mutedLight: '#9aa69f', accent: '#0f6b4f', red: '#c0392b', green: '#0f6b4f', sectionBg: '#eef1ec' };

    const filterTab = (label, ur, val, count, totalAmt) => h('button', { key: val, onClick: () => this.setState({ udharFilter: val }), style: { flex: 1, padding: '10px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: filter === val ? '#0f6b4f' : 'transparent', color: filter === val ? '#fff' : '#8b978f', border: 'none', transition: 'all .15s', position: 'relative' } },
      h('div', {}, label),
      h('div', { className: 'ur', style: { fontSize: 10, marginTop: 1 } }, ur),
      totalAmt > 0 ? h('div', { className: 'mono', style: { fontSize: 10, marginTop: 2, fontWeight: 800, opacity: filter === val ? 1 : 0.7 } }, this.fmtPKR(totalAmt)) : null,
      count > 0 ? h('span', { style: { position: 'absolute', top: 4, right: 8, background: filter === val ? '#fff' : '#eef1ec', color: filter === val ? '#0f6b4f' : '#8b978f', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 10 } }, count) : null,
    );

    const sortBtn = (label, val) => h('button', { key: val, onClick: () => this.setState({ udharSort: val }), style: { padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: sort === val ? '#0f6b4f' : 'transparent', color: sort === val ? '#fff' : '#8b978f', border: sort === val ? 'none' : '1px solid #d8ded9' } }, label);

    const today = this.todayStr();
    const thisMonth = today.substring(0, 7);
    const monthEntries = this.activeUdpiEntries().filter(u => u.date && u.date.startsWith(thisMonth));
    const monthGave = monthEntries.filter(u => u.direction === 'lent').reduce((s, u) => s + u.amount, 0);
    const monthGot = monthEntries.filter(u => u.direction === 'borrowed').reduce((s, u) => s + u.amount, 0);
    const overdueParties = parties.filter(p => p.overdueCount > 0);

    const udharTab = this.state.udharTab || 'parties';
    const tabBtn = (label, icon, val) => h('button', { key: val, onClick: () => this.setState({ udharTab: val }), style: { flex: 1, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: udharTab === val ? '#0f6b4f' : 'transparent', color: udharTab === val ? '#fff' : '#8b978f', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .15s' } }, h('span', { style: { fontSize: 14 } }, icon), label);
    const pinnedNames = (this.state.settings || {}).udharPins || [];
    if (udharTab === 'parties') {
      const pinned = filtered.filter(p => pinnedNames.includes(p.name));
      const unpinned = filtered.filter(p => !pinnedNames.includes(p.name));
      filtered = [...pinned, ...unpinned];
    }

    return h('div', { style: { background: ub.card, padding: '0 0 150px' } },
      h('div', { style: { padding: '0' } },
      udharTab === 'activity' ? this.renderUdharActivity()
        : udharTab === 'reports' ? this.renderUdharReports()
        : h('div', {},
      overdueParties.length > 0 ? h('div', { style: { background: '#fff', padding: '12px 16px', borderBottom: '1px solid #e6eae5' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
          h('div', {},
            h('div', { style: { fontWeight: 700, fontSize: 13, color: '#c0392b' } }, '⚠ Overdue'),
            h('div', { style: { fontSize: 11, color: '#8b978f', marginTop: 2 } }, overdueParties.length + ' ' + (overdueParties.length === 1 ? 'person has' : 'people have') + ' overdue amounts'),
          ),
          h('button', { onClick: () => this.sendAutoReminders(), disabled: this.state.udharAutoSending, style: { padding: '6px 14px', borderRadius: 11, background: this.state.udharAutoSending ? '#d8ded9' : '#0f6b4f', color: 'white', fontWeight: 600, fontSize: 12, border: 'none', flexShrink: 0 } }, this.state.udharAutoSending ? '⏳ Sending...' : 'Remind All'),
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          overdueParties.slice(0, 3).map(p => h('div', { key: p.name, onClick: () => this.setState({ udharPerson: p.name }), style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f4f6f3', borderRadius: 10, cursor: 'pointer', fontSize: 12 } },
            h('div', { style: { width: 28, height: 28, borderRadius: 8, background: getAvatarColor(p.name) + '18', color: getAvatarColor(p.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0 } }, initials(p.name)),
            h('div', { style: { flex: 1, fontWeight: 600, color: '#16211c' } }, p.name),
            h('div', { className: 'mono', style: { fontWeight: 700, color: '#c0392b', fontSize: 13 } }, this.fmtPKR(p.balance)),
          )),
        ),
      ) : null,
      h('div', { style: { display: 'flex', background: '#eef1ec', borderRadius: 12, padding: 3, margin: '0 16px 12px', gap: 2 } },
        filterTab('All', 'سب', 'all', parties.length, 0),
        filterTab("You'll Get", 'وصولی', 'receivable', receivableCount, totalReceivable),
        filterTab("You'll Give", 'ادائیگی', 'payable', payableCount, totalPayable),
        filterTab('Settled', 'برابر', 'settled', parties.filter(p => p.balance === 0).length, 0),
      ),
      h('div', { style: { display: 'flex', gap: 8, margin: '0 16px 12px', alignItems: 'center' } },
        h('div', { style: { flex: 1, position: 'relative' } },
          h('span', { style: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9aa69f', pointerEvents: 'none' } }, '🔍'),
          h('input', { type: 'text', value: this.state.udharSearch || '', onChange: e => this.setState({ udharSearch: e.target.value }), placeholder: 'Search by name...', style: { width: '100%', border: '1.5px solid #d8ded9', borderRadius: 12, padding: '10px 14px 10px 36px', fontSize: 13, background: '#fff', color: '#16211c', outline: 'none' } }),
        ),
        sortBtn('Balance', 'balance'),
        sortBtn('Recent', 'recent'),
        sortBtn('A-Z', 'name'),
      ),
      h('div', { style: { display: 'flex', gap: 5, margin: '0 16px 12px', flexWrap: 'wrap' } },
        ...['', 'business', 'personal', 'family', 'emergency'].map(cat => {
          const labels = { '': '🏷 All', business: '💼 Biz', personal: '👤 Per', family: '👨‍👩‍👧 Fam', emergency: '🚨 Urg' };
          const active = catFilter === cat;
          return h('button', { key: cat, onClick: () => this.setState({ udharCategoryFilter: cat }), style: { padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: active ? '#0f6b4f15' : 'transparent', color: active ? '#0f6b4f' : '#8b978f', border: '1px solid ' + (active ? '#0f6b4f44' : '#d8ded9') } }, labels[cat]);
        }),
      ),
      filtered.length === 0
        ? h('div', { style: { textAlign: 'center', padding: '40px 20px', color: '#8b978f' } },
            parties.length === 0
              ? h('div', { style: { padding: '20px 0' } },
                  h('div', { style: { width: 80, height: 80, borderRadius: 22, background: '#eef3ef', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                    h('div', { style: { fontSize: 40 } }, '📖'),
                  ),
                  h('div', { style: { fontWeight: 700, fontSize: 18, color: '#16211c', marginBottom: 4 } }, 'Your Udhar Book is empty'),
                  h('div', { style: { fontSize: 13, color: '#8b978f', marginBottom: 20 } }, 'Start by recording your first transaction'),
                  h('button', { onClick: () => { this.openUdpiModal(); setTimeout(() => this.setState({ udpiModal: { ...this.state.udpiModal, direction: 'lent' } }), 50); }, style: { padding: '14px 28px', borderRadius: 14, background: '#0f6b4f', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', boxShadow: '0 6px 16px rgba(15,107,79,.28)', cursor: 'pointer' } }, '+ Record First Entry'),
                )
              : h('div', {},
                  h('div', { style: { fontSize: 14, fontWeight: 600, color: '#16211c' } }, 'No matching records'),
                  h('div', { style: { fontSize: 13, color: '#8b978f' } }, 'Try a different search'),
                ),
          )
        : h('div', { style: { } },
          filtered.map(p => {
            const isReceivable = p.balance > 0;
            const isPayable = p.balance < 0;
            const daysAgo = p.lastDate ? Math.round((new Date(this.todayStr()) - new Date(p.lastDate)) / 86400000) : null;
            const daysLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : daysAgo !== null ? daysAgo + 'd ago' : '';
            const ac = getAvatarColor(p.name);
            const hasOverdue = p.overdueCount > 0;
            const isPinned = this.isUdharPinned(p.name);
            const meta = this.getUdharMeta(p.name);
            return h('div', { key: p.name, onClick: () => this.setState({ udharPerson: p.name }), style: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid #f0f2ee', cursor: 'pointer', background: '#fff' } },
              h('div', { style: { width: 42, height: 42, borderRadius: 13, background: ac + '18', color: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 } }, initials(p.name)),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 15, fontWeight: 600, color: '#16211c' } },
                  isPinned ? '📌 ' : '',
                  p.name,
                ),
                h('div', { style: { fontSize: 12, fontWeight: 500, color: hasOverdue ? '#c0392b' : '#9aa69f', marginTop: 2 } },
                  hasOverdue ? '⚠ Overdue · ' : '',
                  daysLabel || (p.entries.length + (p.entries.length === 1 ? ' entry' : ' entries')),
                ),
              ),
              h('div', { style: { textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 } },
                p.balance !== 0
                  ? h('div', {},
                      h('div', { style: { fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isReceivable ? '#c0392b' : '#0f6b4f' } }, this.fmtPKR(Math.abs(p.balance))),
                      h('div', { style: { fontSize: 11, fontWeight: 600, color: '#9aa69f', marginTop: 2 } }, isReceivable ? 'you gave' : 'you got'),
                    )
                  : h('div', { style: { fontSize: 13, fontWeight: 600, color: '#0f6b4f' } }, '✓ Clear'),
                h('button', { onClick: (e) => { e.stopPropagation(); this.deleteAllUdpiForPerson(p.name); }, style: { padding: '6px', borderRadius: 8, background: '#fef2f2', color: '#c0392b', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1, flexShrink: 0 } }, '✕'),
              ),
            );
          }),
        ),
      ),
      ),
    );
  }

  renderUdharPersonDetail(personName) {
    const h = this.h;
    const entries = this.activeUdpiEntries().filter(u => u.person.trim().toLowerCase() === personName.toLowerCase());
    entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const accs = this.getAccounts();

    let lent = 0, borrowed = 0, totalEntries = entries.length;
    entries.forEach(u => {
      if (u.direction === 'lent' && !u.returned) lent += u.amount;
      else if (u.direction === 'borrowed' && !u.returned) borrowed += u.amount;
    });
    const balance = lent - borrowed;
    const isReceivable = balance > 0;

    const phone = (() => {
      const c = (this.state.customers || []).find(x => x.name.toLowerCase() === personName.toLowerCase());
      return c ? c.phone : null;
    })();

    const waMsg = encodeURIComponent(
      'السلام وعلیکم ' + personName + '! 🙏\n\n' +
      (this.state.settings.shopName || 'Shop') + ' کی طرف سے یاد دہانی:\n\n' +
      '💰 بقایا رقم: ' + this.fmtPKR(Math.abs(balance)) + '\n' +
      (isReceivable ? '📌 آپ کے ذمے ہے\n' : '📌 ہمارے ذمے ہے\n') +
      '\nبراہ کرم جلد ادائیگی کریں۔\nشکریہ 🙏'
    );

    const avatarColors = ['#b91c1c','#0f6b4b','#3b82f6','#a26a10','#7c3aed','#0891b2','#c2410c','#4338ca'];
    const ac = avatarColors[Math.abs(personName.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];
    const initials = personName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    let runBal = 0;
    const trust = this.getUdharTrust(personName);
    const meta = this.getUdharMeta(personName);
    const isPinned = this.isUdharPinned(personName);
    const creditLimit = meta.creditLimit || 0;
    const overLimit = creditLimit > 0 && balance > creditLimit;
    const totalGaveAll = entries.filter(u => u.direction === 'lent').reduce((s, u) => s + u.amount, 0);
    const totalGotAll = entries.filter(u => u.direction === 'borrowed').reduce((s, u) => s + u.amount, 0);
    const settledCount = entries.filter(u => u.returned).length;
    const avgAmount = totalEntries > 0 ? Math.round(entries.reduce((s, u) => s + u.amount, 0) / totalEntries) : 0;
    const firstDate = entries.length > 0 ? entries[entries.length - 1].date : null;

    return h('div', { style: { width: '100%', background: '#f4f6f3', padding: '0 0 150px', minHeight: '100vh' } },
      h('div', { style: { background: 'linear-gradient(135deg, #eef1ec 0%, #f4f6f3 100%)', padding: '18px 18px 14px', borderBottom: '1px solid #e6eae5' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 } },
          h('button', { onClick: () => this.setState({ udharPerson: null }), style: { padding: '8px 12px', borderRadius: 10, background: '#e6eae5', fontWeight: 700, fontSize: 16, color: '#16211c' } }, '‹'),
          h('div', { style: { width: 48, height: 48, borderRadius: 14, background: ac + '18', color: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 } }, initials),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
              isPinned ? h('span', { style: { fontSize: 11 } }, '📌') : null,
              h('span', { style: { fontWeight: 800, fontSize: 17, color: '#16211c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, personName),
            ),
            h('div', { style: { fontSize: 11, color: '#8b978f', marginTop: 1 } }, totalEntries + ' entries' + (phone ? ' · ' + phone : '')),
            trust.score > 0 ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 } },
              h('span', { style: { fontSize: 10, color: trust.color, fontWeight: 700 } }, '★'.repeat(Math.min(trust.score, 5))),
              h('span', { style: { fontSize: 10, color: trust.color, fontWeight: 600 } }, ' ' + trust.label),
              trust.rate !== undefined ? h('span', { style: { fontSize: 9, color: '#8b978f' } }, ' · ' + trust.rate + '% settled') : null,
            ) : null,
          ),
        ),
      ),
      h('div', { style: { padding: '12px 14px 0' } },
      h('div', { style: { display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' } },
        h('button', { onClick: () => this.toggleUdharPin(personName), style: { padding: '5px 10px', borderRadius: 8, background: isPinned ? '#fef3c7' : '#e6eae5', color: isPinned ? '#b45309' : '#8b978f', fontSize: 10, fontWeight: 700, border: 'none' } }, isPinned ? '📌 Unpin' : '📌 Pin'),
        phone ? h('a', { href: 'https://wa.me/' + phone.replace(/[^0-9]/g, '') + '?text=' + waMsg, target: '_blank', style: { padding: '5px 10px', borderRadius: 8, background: '#25D366', color: 'white', fontWeight: 700, fontSize: 10, textDecoration: 'none' } }, '💬 Manual') : h('button', { onClick: () => this.remindViaWhatsApp(personName), style: { padding: '5px 10px', borderRadius: 8, background: '#25D366', color: 'white', fontWeight: 700, fontSize: 10, border: 'none' } }, '💬 Manual'),
        h('button', { onClick: () => this.sendSingleReminder(personName), disabled: this.state.udharAutoSending, style: { padding: '5px 10px', borderRadius: 8, background: this.state.udharAutoSending ? '#e6eae5' : '#0f6b4f', color: this.state.udharAutoSending ? '#8b978f' : 'white', fontWeight: 700, fontSize: 10, border: 'none' } }, this.state.udharAutoSending ? '⏳...' : '🤖 Auto'),
        h('button', { onClick: () => this.copyStatement(personName), style: { padding: '5px 10px', borderRadius: 8, background: '#e6eae5', color: '#16211c', fontWeight: 700, fontSize: 10, border: 'none' } }, '📋 Statement'),
        h('button', { onClick: () => this.printUdharStatement(personName), style: { padding: '5px 10px', borderRadius: 8, background: '#e6eae5', color: '#16211c', fontWeight: 700, fontSize: 10, border: 'none' } }, '🖨 PDF'),
        h('button', { onClick: () => this.shareStatementWhatsApp(personName), style: { padding: '5px 10px', borderRadius: 8, background: '#e8f5e9', color: '#0f6b4f', fontWeight: 700, fontSize: 10, border: 'none' } }, '💬 Share'),
        h('button', { onClick: () => this.deleteAllUdpiForPerson(personName), style: { padding: '5px 10px', borderRadius: 8, background: '#fef2f2', color: '#c0392b', fontWeight: 700, fontSize: 10, border: 'none' } }, '🗑 Delete All'),
        h('button', { onClick: () => this.setUdharReminder(personName), style: { padding: '5px 10px', borderRadius: 8, background: meta.reminderDate ? '#fef3c7' : '#e6eae5', color: meta.reminderDate ? '#b45309' : '#8b978f', fontWeight: 700, fontSize: 10, border: 'none' } }, meta.reminderDate ? '⏰ ' + meta.reminderDate : '⏰ Reminder'),
        h('button', { onClick: () => {
          const cats = ['business', 'personal', 'family'];
          const cur = meta.category || '';
          const next = cats[(cats.indexOf(cur) + 1) % (cats.length + 1)] || '';
          this.setUdharMeta(personName, 'category', next);
        }, style: { padding: '5px 10px', borderRadius: 8, background: meta.category === 'business' ? '#dbeafe' : meta.category === 'family' ? '#ede9fe' : meta.category === 'personal' ? '#cffafe' : '#e6eae5', color: meta.category === 'business' ? '#2563eb' : meta.category === 'family' ? '#7c3aed' : meta.category === 'personal' ? '#0891b2' : '#8b978f', fontSize: 10, fontWeight: 700, border: 'none' } }, meta.category ? (meta.category === 'business' ? '💼 Business' : meta.category === 'family' ? '👨‍👩‍👧 Family' : '👤 Personal') : '🏷 Category'),
        h('button', { onClick: () => {
          const v = prompt('Set credit limit for ' + personName + '\nCurrent: ' + (creditLimit ? this.fmtPKR(creditLimit) : 'None') + '\n\nEnter amount (0 to remove):');
          if (v !== null) this.setUdharMeta(personName, 'creditLimit', Math.max(0, parseInt(v) || 0));
        }, style: { padding: '5px 10px', borderRadius: 8, background: overLimit ? '#fef3c7' : '#e6eae5', color: overLimit ? '#b45309' : '#8b978f', fontSize: 10, fontWeight: 700, border: 'none' } }, creditLimit ? '💳 Limit: ' + this.fmtPKR(creditLimit) : '💳 Set Limit'),
      ),
      h('div', { style: { background: balance > 0 ? '#fef2f2' : balance < 0 ? '#f0fdf4' : '#f4f1e6', borderRadius: 18, padding: '20px', textAlign: 'center', marginBottom: 14, borderLeft: '5px solid ' + (balance > 0 ? '#b91c1c' : balance < 0 ? '#0f6b4b' : '#7a7663') } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: balance > 0 ? '#b91c1c' : balance < 0 ? '#0f6b4b' : '#7a7663', textTransform: 'uppercase', letterSpacing: '0.08em' } }, balance > 0 ? 'You will get / آپ کو ملیں گے' : balance < 0 ? 'You will give / آپ نے دینے ہیں' : 'All clear / برابر ✓'),
        h('div', { className: 'mono', style: { fontSize: 36, fontWeight: 800, color: balance > 0 ? '#b91c1c' : balance < 0 ? '#0f6b4b' : '#0f6b4b', marginTop: 6 } }, this.fmtPKR(Math.abs(balance))),
        h('div', { style: { display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10, fontSize: 12, color: '#7a7663' } },
          h('span', {}, '↑ Gave: ', h('strong', { style: { color: '#b91c1c' } }, this.fmtPKR(lent))),
          h('span', {}, '↓ Got: ', h('strong', { style: { color: '#0f6b4b' } }, this.fmtPKR(borrowed))),
        ),
      ),
      overLimit ? h('div', { style: { background: '#fef3c7', borderRadius: 12, padding: '10px 14px', marginBottom: 10, border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: 8 } },
        h('span', { style: { fontSize: 16 } }, '⚠️'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontWeight: 700, fontSize: 12, color: '#b45309' } }, 'Credit limit exceeded!'),
          h('div', { style: { fontSize: 11, color: '#8b978f' } }, 'Limit: ' + this.fmtPKR(creditLimit) + ' · Over by ' + this.fmtPKR(balance - creditLimit)),
        ),
      ) : null,
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 12 } },
        h('div', { style: { background: '#fff', borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: '1px solid #e6eae5' } },
          h('div', { className: 'mono', style: { fontSize: 14, fontWeight: 800, color: '#c0392b' } }, this.fmtPKR(totalGaveAll)),
          h('div', { style: { fontSize: 8, color: '#8b978f', fontWeight: 600, marginTop: 2, textTransform: 'uppercase' } }, 'Total Gave'),
        ),
        h('div', { style: { background: '#fff', borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: '1px solid #e6eae5' } },
          h('div', { className: 'mono', style: { fontSize: 14, fontWeight: 800, color: '#0f6b4f' } }, this.fmtPKR(totalGotAll)),
          h('div', { style: { fontSize: 8, color: '#8b978f', fontWeight: 600, marginTop: 2, textTransform: 'uppercase' } }, 'Total Got'),
        ),
        h('div', { style: { background: '#fff', borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: '1px solid #e6eae5' } },
          h('div', { className: 'mono', style: { fontSize: 14, fontWeight: 800, color: '#16211c' } }, settledCount + '/' + totalEntries),
          h('div', { style: { fontSize: 8, color: '#8b978f', fontWeight: 600, marginTop: 2, textTransform: 'uppercase' } }, 'Settled'),
        ),
        h('div', { style: { background: '#fff', borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: '1px solid #e6eae5' } },
          h('div', { className: 'mono', style: { fontSize: 14, fontWeight: 800, color: '#16211c' } }, this.fmtPKR(avgAmount)),
          h('div', { style: { fontSize: 8, color: '#8b978f', fontWeight: 600, marginTop: 2, textTransform: 'uppercase' } }, 'Avg Txn'),
        ),
      ),
      firstDate ? h('div', { style: { fontSize: 11, color: '#8b978f', marginBottom: 12, textAlign: 'center' } },
        'Since ' + new Date(firstDate + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }),
      ) : null,
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 } },
        h('button', { onClick: () => { this.openUdpiModal(null, personName); setTimeout(() => this.setState({ udpiModal: { ...this.state.udpiModal, direction: 'lent' } }), 50); }, style: { padding: '12px 8px', borderRadius: 12, background: 'linear-gradient(135deg, #c0392b, #a93226)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', boxShadow: '0 4px 12px rgba(192,57,43,.25)' } }, '↑ Gave'),
        h('button', { onClick: () => { this.openUdpiModal(null, personName); setTimeout(() => this.setState({ udpiModal: { ...this.state.udpiModal, direction: 'borrowed' } }), 50); }, style: { padding: '12px 8px', borderRadius: 12, background: 'linear-gradient(135deg, #0f6b4f, #0a5a3f)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', boxShadow: '0 4px 12px rgba(15,107,79,.25)' } }, '↓ Got'),
        h('button', { onClick: () => this.openInvoiceModal(personName), style: { padding: '12px 8px', borderRadius: 12, background: '#e6eae5', color: '#16211c', fontWeight: 700, fontSize: 13, border: 'none' } }, '📄 Bill'),
      ),
      h('div', { style: { display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' } },
        entries.some(u => !u.returned) ? h('button', { onClick: () => this.bulkSettle(personName), style: { padding: '6px 12px', borderRadius: 8, background: '#e8f5e9', color: '#0f6b4f', fontWeight: 700, fontSize: 11, border: '1px solid #c8e6c9' } }, '✓ Settle All') : null,
        balance > 0 ? h('button', { onClick: () => this.calcUdharInterest(personName), style: { padding: '6px 12px', borderRadius: 8, background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: 11, border: '1px solid #fcd34d' } }, '📊 Interest') : null,
        h('button', { onClick: () => {
          const current = meta.notes || '';
          const v = prompt('Notes for ' + personName + ':\n' + personName + ' کے بارے میں نوٹس:', current);
          if (v !== null) this.setUdharMeta(personName, 'notes', v);
        }, style: { padding: '6px 12px', borderRadius: 8, background: meta.notes ? '#dbeafe' : '#e6eae5', color: meta.notes ? '#2563eb' : '#8b978f', fontWeight: 700, fontSize: 11, border: meta.notes ? '1px solid #93c5fd' : '1px solid #e6eae5' } }, meta.notes ? '📝 Notes ✓' : '📝 Add Note'),
      ),
      meta.notes ? h('div', { style: { background: '#dbeafe', borderRadius: 10, padding: '8px 12px', marginBottom: 12, border: '1px solid #93c5fd', fontSize: 12, color: '#2563eb', lineHeight: 1.5 } },
        h('span', { style: { fontWeight: 700 } }, '📝 '),
        meta.notes,
      ) : null,
      meta.reminderDate ? h('div', { style: { background: meta.reminderDate <= this.todayStr() ? '#fef2f2' : '#fef3c7', borderRadius: 10, padding: '8px 12px', marginBottom: 10, border: '1px solid ' + (meta.reminderDate <= this.todayStr() ? '#fecaca' : '#fcd34d'), display: 'flex', alignItems: 'center', gap: 8 } },
        h('span', { style: { fontSize: 16 } }, meta.reminderDate <= this.todayStr() ? '🔔' : '⏰'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontWeight: 700, fontSize: 11, color: meta.reminderDate <= this.todayStr() ? '#c0392b' : '#b45309' } }, meta.reminderDate <= this.todayStr() ? 'Reminder Due Today!' : 'Reminder on ' + meta.reminderDate),
          h('div', { className: 'ur', style: { fontSize: 10, color: '#8b978f' } }, meta.reminderDate <= this.todayStr() ? 'یاد دہانی آج ہے!' : 'یاد دہانی ' + meta.reminderDate + ' کو'),
        ),
        h('button', { onClick: () => { this.setUdharMeta(personName, 'reminderDate', ''); }, style: { padding: '4px 8px', borderRadius: 6, background: '#e6eae5', border: 'none', fontSize: 10, fontWeight: 600, color: '#8b978f' } }, '✕ Clear'),
      ) : null,
      (() => {
        const sorted = [...entries].sort((a, b) => a.date > b.date ? 1 : -1);
        if (sorted.length < 2) return null;
        let rb = 0;
        const points = sorted.map(u => {
          const amt = u.amount - (u.returnedAmount || 0);
          if (u.direction === 'lent') rb += amt; else rb -= amt;
          return { date: u.date, bal: rb };
        });
        const maxB = Math.max(...points.map(p => Math.abs(p.bal)), 1);
        const w = 100;
        const h2 = 40;
        const mid = h2 / 2;
        const step = w / Math.max(points.length - 1, 1);
        const pts = points.map((p, i) => (i * step).toFixed(1) + ',' + (mid - (p.bal / maxB) * (mid - 4)).toFixed(1));
        return h('div', { style: { marginBottom: 12, background: '#fff', borderRadius: 10, padding: '8px 12px', border: '1px solid #e6eae5' } },
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#8b978f', marginBottom: 4, textTransform: 'uppercase' } }, 'Balance Trend / بقایا رجحان'),
          h('svg', { viewBox: '0 0 ' + w + ' ' + h2, style: { width: '100%', height: 50 }, preserveAspectRatio: 'none' },
            h('line', { x1: 0, y1: mid, x2: w, y2: mid, stroke: '#e6eae5', strokeWidth: 0.5 }),
            h('polyline', { fill: 'none', stroke: points[points.length - 1].bal >= 0 ? '#c0392b' : '#0f6b4f', strokeWidth: 1.5, points: pts.join(' ') }),
            h('circle', { cx: (points.length - 1) * step, cy: mid - (points[points.length - 1].bal / maxB) * (mid - 4), r: 2, fill: points[points.length - 1].bal >= 0 ? '#c0392b' : '#0f6b4f' }),
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9aa69f', marginTop: 2 } },
            h('span', null, points[0].date),
            h('span', null, points[points.length - 1].date),
          ),
        );
      })(),
      h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 } },
        h('div', { style: { fontSize: 15, fontWeight: 700, color: '#16211c' } }, 'Transactions'),
        h('div', { className: 'ur', style: { fontSize: 12, color: '#8b978f' } }, 'لین دین'),
      ),
      h('div', { style: { display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' } },
        h('input', { type: 'date', value: this.state.udharDateFrom || '', onChange: e => this.setState({ udharDateFrom: e.target.value }), style: { flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid #e6eae5', fontSize: 11, background: '#fff', color: '#16211c', outline: 'none' }, placeholder: 'From' }),
        h('span', { style: { fontSize: 11, color: '#8b978f' } }, '→'),
        h('input', { type: 'date', value: this.state.udharDateTo || '', onChange: e => this.setState({ udharDateTo: e.target.value }), style: { flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid #e6eae5', fontSize: 11, background: '#fff', color: '#16211c', outline: 'none' }, placeholder: 'To' }),
        (this.state.udharDateFrom || this.state.udharDateTo) ? h('button', { onClick: () => this.setState({ udharDateFrom: '', udharDateTo: '' }), style: { padding: '6px 8px', borderRadius: 8, background: '#fef2f2', color: '#c0392b', fontSize: 10, fontWeight: 700, border: 'none', flexShrink: 0 } }, '✕') : null,
      ),
      (() => {
        let filteredEntries = entries;
        if (this.state.udharDateFrom) filteredEntries = filteredEntries.filter(u => u.date >= this.state.udharDateFrom);
        if (this.state.udharDateTo) filteredEntries = filteredEntries.filter(u => u.date <= this.state.udharDateTo);
        return filteredEntries.length === 0
        ? h('div', { style: { textAlign: 'center', padding: 30, color: '#8b978f' } }, 'No entries' + ((this.state.udharDateFrom || this.state.udharDateTo) ? ' in this date range' : ' yet'))
        : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          filteredEntries.slice().reverse().map((u, idx) => {
            const isLent = u.direction === 'lent';
            if (!u.returned) runBal += isLent ? u.amount : -u.amount;
            const acc = accs.find(a => a.id === u.accountId);
            const today = this.todayStr();
            const isOverdue = u.dueDate && !u.returned && u.dueDate < today;
            const hasPartial = (u.returnedAmount || 0) > 0 && !u.returned;
            const remaining = u.amount - (u.returnedAmount || 0);
            const partials = u.partialReturns || [];
            return h('div', { key: u.id, style: { display: 'flex', flexDirection: 'column', gap: 2 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: isOverdue ? '#fef2f2' : '#fff', borderRadius: 12, border: '1px solid ' + (isOverdue ? '#fecaca' : '#e6eae5'), borderLeft: '4px solid ' + (isLent ? '#c0392b' : '#0f6b4f') } },
                h('div', { style: { width: 32, height: 32, borderRadius: 8, background: isLent ? '#fef2f2' : '#f0fdf4', color: isLent ? '#c0392b' : '#0f6b4f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 } }, isLent ? '↑' : '↓'),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontSize: 13, fontWeight: 600, color: '#16211c' } }, u.note || (isLent ? 'Gave / دیا' : 'Got / لیا')),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8b978f', marginTop: 2, flexWrap: 'wrap' } },
                    new Date(u.date + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }) + (this._idTime(u.id) ? ' ' + this._idTime(u.id) : ''),
                    acc ? ' · ' + acc.emoji + ' ' + acc.name : '',
                    u.category ? h('span', { style: { fontSize: 9, fontWeight: 600, color: u.category === 'business' ? '#2563eb' : u.category === 'family' ? '#7c3aed' : u.category === 'emergency' ? '#b45309' : '#0891b2', background: u.category === 'business' ? '#dbeafe' : u.category === 'family' ? '#ede9fe' : u.category === 'emergency' ? '#fef3c7' : '#cffafe', padding: '1px 5px', borderRadius: 4 } }, u.category === 'business' ? '💼' : u.category === 'family' ? '👨‍👩‍👧' : u.category === 'emergency' ? '🚨' : '👤') : null,
                    u.photo ? h('span', { style: { fontSize: 9, fontWeight: 600, color: '#8b978f' } }, '📷') : null,
                  ),
                  u.dueDate ? h('div', { style: { fontSize: 10, marginTop: 3, color: isOverdue ? '#c0392b' : '#8b978f', fontWeight: isOverdue ? 700 : 400 } },
                    (isOverdue ? '⚠ OVERDUE · ' : '📅 Due: ') + new Date(u.dueDate + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })
                  ) : null,
                  hasPartial ? h('div', { style: { fontSize: 10, marginTop: 3, color: '#b45309', fontWeight: 600 } },
                    '⟳ Settled: ' + this.fmtPKR(u.returnedAmount) + ' of ' + this.fmtPKR(u.amount) + ' · Left: ' + this.fmtPKR(remaining)
                  ) : null,
                ),
                h('div', { style: { textAlign: 'right', flexShrink: 0 } },
                  h('div', { className: 'mono', style: { fontWeight: 800, fontSize: 14, color: isLent ? '#c0392b' : '#0f6b4f' } }, (isLent ? '-' : '+') + this.fmtPKR(u.amount)),
                  u.returned ? h('div', { style: { fontSize: 10, color: '#0f6b4f', fontWeight: 600 } }, '✓ Settled')
                    : h('div', { className: 'mono', style: { fontSize: 10, color: '#8b978f', marginTop: 1 } }, 'Bal: ' + this.fmtPKR(runBal)),
                ),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 } },
                  !u.returned ? h('button', { onClick: (e) => { e.stopPropagation(); this.markUdpiReturned(u.id); }, title: 'Settle amount', style: { padding: '4px 7px', borderRadius: 6, background: '#e8f5e9', color: '#0f6b4f', fontSize: 10, fontWeight: 700, border: 'none' } }, '₹') : null,
                  h('button', { onClick: (e) => { e.stopPropagation(); this.openUdpiModal(u.id); }, title: 'Edit', style: { padding: '4px 7px', borderRadius: 6, background: '#e6eae5', color: '#16211c', fontSize: 10, fontWeight: 700, border: 'none' } }, '✎'),
                  h('button', { onClick: (e) => { e.stopPropagation(); this.deleteUdpiEntry(u.id); }, title: 'Delete', style: { padding: '4px 7px', borderRadius: 6, background: '#fef2f2', color: '#c0392b', fontSize: 10, fontWeight: 700, border: 'none' } }, '🗑'),
                ),
              ),
              partials.length > 0 ? h('div', { style: { marginLeft: 46, paddingLeft: 10 } },
                ...partials.map((pr, pi) => h('div', { key: 'pr' + pi, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: '#f0fdf4', borderRadius: 8, borderLeft: '3px solid #0f6b4f', fontSize: 11, marginBottom: 2 } },
                  h('span', { style: { color: '#0f6b4f', fontWeight: 600 } }, '↩ ' + this.fmtPKR(pr.amount)),
                  h('span', { style: { color: '#8b978f' } }, ' · ' + new Date(pr.date + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short' })),
                ))
              ) : null,
              u.photo ? h('div', { style: { marginLeft: 46, marginBottom: 4 } },
                h('img', { src: u.photo, onClick: () => window.open(u.photo, '_blank'), style: { width: 80, height: 60, borderRadius: 8, objectFit: 'cover', border: '1px solid #e6eae5', cursor: 'pointer' } }),
              ) : null,
            );
          }),
        );
      })(),
      (() => {
        const personInvoices = (this.state.invoices || []).filter(inv => inv.person.toLowerCase() === personName.toLowerCase());
        if (personInvoices.length === 0) return null;
        return h('div', { style: { marginTop: 16 } },
          this.sectionHeader('Invoices / Bills', 'بلز'),
          ...personInvoices.map(inv => h('div', { key: inv.id, onClick: () => this.setState({ invoiceView: inv.id }), style: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 12, border: '1px solid #e6eae5', marginBottom: 4 } },
            h('div', { style: { width: 32, height: 32, borderRadius: 8, background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 } }, '📄'),
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontWeight: 700, fontSize: 13, color: '#16211c' } }, inv.number),
              h('div', { style: { fontSize: 11, color: '#8b978f', marginTop: 2 } }, new Date(inv.date + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + inv.items.length + ' items'),
            ),
            h('div', { className: 'mono', style: { fontWeight: 800, fontSize: 14, color: '#16211c' } }, this.fmtPKR(inv.total)),
            h('div', { style: { color: '#9aa69f', fontSize: 16 } }, '›'),
          )),
        );
      })(),
      ),
      this.renderUdpiModal(),
      this.renderInvoiceModal(),
    );
  }

  renderInvoiceModal() {
    const h = this.h;
    const m = this.state.invoiceModal;
    if (!m.open) return null;
    const inpStyle = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    const products = this.activeProducts();
    const total = m.items.reduce((s, it) => s + (parseFloat(it.price) || 0) * (parseInt(it.qty) || 1), 0);
    return h('div', { onClick: () => this.closeInvoiceModal(), style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', animation: 'slideIn .2s ease' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
          h('div', {},
            h('div', { style: { fontSize: 18, fontWeight: 800 } }, '📄 New Invoice'),
            h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, 'نیا بل'),
          ),
          h('button', { onClick: () => this.closeInvoiceModal(), style: { width: 34, height: 34, borderRadius: 9, background: '#f4f1e6', fontSize: 16 } }, '✕'),
        ),
        h('div', { style: { display: 'grid', gap: 12 } },
          h('div', {},
            h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Bill To / بل بنام'),
            h('input', { type: 'text', value: m.person, onChange: e => this.setState({ invoiceModal: { ...m, person: e.target.value } }), placeholder: 'Person name...', style: inpStyle }),
          ),
          h('div', {},
            h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Date / تاریخ'),
            h('input', { type: 'date', value: m.date, onChange: e => this.setState({ invoiceModal: { ...m, date: e.target.value } }), style: inpStyle }),
          ),
          h('div', { style: { fontSize: 12, fontWeight: 700, color: '#3a4a3f', marginBottom: 4 } }, 'Items / آئٹمز'),
          ...m.items.map((it, idx) => h('div', { key: idx, style: { display: 'flex', gap: 8, alignItems: 'flex-start', background: '#f9f6ee', padding: 10, borderRadius: 10 } },
            h('div', { style: { flex: 3, display: 'grid', gap: 6 } },
              products.length > 0 ? h('select', { value: it.productId || '', onChange: e => this.selectInvoiceProduct(idx, e.target.value), style: { ...inpStyle, fontSize: 12, padding: '6px 8px' } },
                h('option', { value: '' }, 'Pick product or type below…'),
                products.map(p => h('option', { key: p.id, value: p.id }, p.emoji + ' ' + p.name + ' — ' + this.fmtPKR(p.price))),
              ) : null,
              h('input', { type: 'text', value: it.desc, onChange: e => this.setInvoiceItem(idx, 'desc', e.target.value), placeholder: 'Item name', style: { ...inpStyle, fontSize: 12, padding: '6px 8px' } }),
            ),
            h('input', { type: 'number', value: it.qty, onChange: e => this.setInvoiceItem(idx, 'qty', e.target.value), placeholder: 'Qty', style: { ...inpStyle, width: 50, fontSize: 12, padding: '6px 8px', textAlign: 'center' } }),
            h('input', { type: 'number', value: it.price, onChange: e => this.setInvoiceItem(idx, 'price', e.target.value), placeholder: 'Price', style: { ...inpStyle, width: 90, fontSize: 12, padding: '6px 8px' } }),
            m.items.length > 1 ? h('button', { onClick: () => this.removeInvoiceItem(idx), style: { padding: '4px 8px', borderRadius: 6, background: '#fdecea', color: '#a4362b', fontSize: 12, fontWeight: 700, flexShrink: 0 } }, '✕') : null,
          )),
          h('button', { onClick: () => this.addInvoiceItem(), style: { padding: '8px', borderRadius: 8, background: '#f4f1e6', color: '#3a4a3f', fontSize: 12, fontWeight: 600 } }, '+ Add Item'),
          h('div', {},
            h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Note (optional)'),
            h('input', { type: 'text', value: m.note, onChange: e => this.setState({ invoiceModal: { ...m, note: e.target.value } }), placeholder: 'Any note...', style: inpStyle }),
          ),
          h('div', { style: { textAlign: 'right', paddingTop: 8, borderTop: '2px solid #ece8dc' } },
            h('span', { style: { fontSize: 12, color: '#7a7663' } }, 'Total: '),
            h('span', { className: 'mono', style: { fontSize: 22, fontWeight: 800, color: '#0f6b4b' } }, this.fmtPKR(total)),
          ),
        ),
        h('div', { style: { display: 'flex', gap: 10, marginTop: 16 } },
          h('button', { onClick: () => this.closeInvoiceModal(), style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600 } }, 'Cancel'),
          h('button', { onClick: () => this.saveInvoice(), style: { flex: 2, padding: 12, borderRadius: 10, background: '#3b82f6', color: 'white', fontWeight: 700 } }, '📄 Create Invoice'),
        ),
      ),
    );
  }

  renderInvoiceView(invId) {
    const h = this.h;
    const inv = (this.state.invoices || []).find(x => x.id === invId);
    if (!inv) return h('div', { style: { textAlign: 'center', padding: 40, color: '#7a7663' } }, 'Invoice not found');
    return h('div', { className: 'screen', style: { maxWidth: 720 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 } },
        h('button', { onClick: () => this.setState({ invoiceView: null }), style: { padding: '8px 14px', borderRadius: 10, background: '#f4f1e6', fontWeight: 700, fontSize: 16, color: '#3a4a3f' } }, '‹'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontWeight: 800, fontSize: 16 } }, inv.number),
          h('div', { style: { fontSize: 12, color: '#7a7663' } }, new Date(inv.date + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })),
        ),
        h('button', { onClick: () => this.shareInvoiceWhatsApp(inv), style: { padding: '8px 14px', borderRadius: 10, background: '#25D366', color: 'white', fontWeight: 700, fontSize: 12, textDecoration: 'none' } }, '💬 Share'),
      ),
      this.card([
        h('div', { style: { textAlign: 'center', paddingBottom: 12, borderBottom: '2px dashed #ece8dc', marginBottom: 12 } },
          h('div', { style: { fontSize: 16, fontWeight: 800 } }, inv.shopName || 'Shop'),
          h('div', { style: { fontSize: 12, color: '#7a7663', marginTop: 2 } }, inv.number),
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 } },
          h('div', {},
            h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase' } }, 'Bill To'),
            h('div', { style: { fontSize: 14, fontWeight: 700 } }, inv.person),
          ),
          h('div', { style: { textAlign: 'right' } },
            h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase' } }, 'Date'),
            h('div', { style: { fontSize: 14 } }, new Date(inv.date + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })),
          ),
        ),
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 } },
          h('thead', {},
            h('tr', { style: { borderBottom: '2px solid #ece8dc' } },
              h('th', { style: { textAlign: 'left', padding: '8px 4px', fontWeight: 700, color: '#7a7663', fontSize: 10, textTransform: 'uppercase' } }, '#'),
              h('th', { style: { textAlign: 'left', padding: '8px 4px', fontWeight: 700, color: '#7a7663', fontSize: 10, textTransform: 'uppercase' } }, 'Item'),
              h('th', { style: { textAlign: 'center', padding: '8px 4px', fontWeight: 700, color: '#7a7663', fontSize: 10, textTransform: 'uppercase' } }, 'Qty'),
              h('th', { style: { textAlign: 'right', padding: '8px 4px', fontWeight: 700, color: '#7a7663', fontSize: 10, textTransform: 'uppercase' } }, 'Price'),
              h('th', { style: { textAlign: 'right', padding: '8px 4px', fontWeight: 700, color: '#7a7663', fontSize: 10, textTransform: 'uppercase' } }, 'Total'),
            ),
          ),
          h('tbody', {},
            inv.items.map((it, i) => h('tr', { key: i, style: { borderBottom: '1px solid #f2eee2' } },
              h('td', { style: { padding: '8px 4px', color: '#7a7663' } }, i + 1),
              h('td', { style: { padding: '8px 4px', fontWeight: 600 } }, it.desc),
              h('td', { style: { padding: '8px 4px', textAlign: 'center' } }, it.qty),
              h('td', { className: 'mono', style: { padding: '8px 4px', textAlign: 'right' } }, this.fmtPKR(it.price)),
              h('td', { className: 'mono', style: { padding: '8px 4px', textAlign: 'right', fontWeight: 700 } }, this.fmtPKR(it.price * it.qty)),
            )),
          ),
        ),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', paddingTop: 12, borderTop: '2px solid #ece8dc', marginTop: 8 } },
          h('div', { style: { textAlign: 'right' } },
            h('span', { style: { fontSize: 13, color: '#7a7663', marginRight: 10 } }, 'Grand Total:'),
            h('span', { className: 'mono', style: { fontSize: 22, fontWeight: 800, color: '#0f6b4b' } }, this.fmtPKR(inv.total)),
          ),
        ),
        inv.note ? h('div', { style: { marginTop: 12, padding: '8px 12px', background: '#f9f6ee', borderRadius: 8, fontSize: 12, color: '#7a7663' } }, '📝 ' + inv.note) : null,
      ]),
    );
  }

  renderStaff() {
    const h = this.h;
    if (this.state.staffView) return this.renderStaffDetail(this.state.staffView);
    const allStaff = this.activeStaff();
    const totalSalary = allStaff.reduce((s, st) => s + (st.salary || 0), 0);
    const today = this.state.attendanceDate || this.todayStr();
    const present = allStaff.filter(s => (s.attendance || {})[today] === 'present').length;
    const absent = allStaff.filter(s => (s.attendance || {})[today] === 'absent').length;

    return h('div', { className: 'screen', style: { maxWidth: 720 } },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 14 } },
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Total Staff'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: '#1a2b1f', marginTop: 2 } }, allStaff.length),
        ]),
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Monthly Payroll'),
          h('div', { className: 'ur', style: { fontSize: 11, color: '#7a7663' } }, 'ماہانہ تنخواہ'),
          h('div', { className: 'mono', style: { fontSize: 16, fontWeight: 800, color: '#b91c1c', marginTop: 2 } }, this.fmtPKR(totalSalary)),
        ]),
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#0f6b4b', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Present Today'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: '#0f6b4b', marginTop: 2 } }, present + '/' + allStaff.length),
        ]),
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#7a7663' } }, 'Attendance Date:'),
          h('input', { type: 'date', value: today, onChange: e => this.setState({ attendanceDate: e.target.value }), style: { border: '1px solid #ece8dc', borderRadius: 8, padding: '6px 10px', fontSize: 13, background: '#fdfcf8' } }),
        ),
        h('button', { onClick: () => this.openStaffModal(), style: { padding: '10px 16px', borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700, fontSize: 13 } }, '+ Add Staff'),
      ),
      allStaff.length === 0
        ? this.card([h('div', { style: { textAlign: 'center', padding: 20, color: '#7a7663' } },
            h('div', { style: { fontSize: 32, marginBottom: 8 } }, '👷'),
            h('div', { style: { fontWeight: 600, fontSize: 14 } }, 'No staff members yet'),
            h('div', { className: 'ur', style: { fontSize: 13, marginTop: 4 } }, 'ابھی تک کوئی ملازم نہیں'),
          )])
        : h('div', {},
          allStaff.map(s => {
            const att = (s.attendance || {})[today];
            const attColor = att === 'present' ? '#0f6b4b' : att === 'absent' ? '#b91c1c' : att === 'half' ? '#a26a10' : '#7a7663';
            const attBg = att === 'present' ? '#eaf5ee' : att === 'absent' ? '#fdecea' : att === 'half' ? '#fdf2d9' : '#f4f1e6';
            const attLabel = att === 'present' ? 'P' : att === 'absent' ? 'A' : att === 'half' ? '½' : '—';
            const totalPaid = (s.salaryPayments || []).reduce((sum, p) => sum + p.net, 0);
            return this.card([
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } },
                h('div', { onClick: () => this.setState({ staffView: s.id }), style: { cursor: 'pointer', flex: 1 } },
                  h('div', { style: { fontWeight: 700, fontSize: 14, color: '#1a2b1f' } }, s.name),
                  h('div', { style: { fontSize: 11, color: '#7a7663', marginTop: 2 } },
                    (s.role || 'Staff') + ' · ' + this.fmtPKR(s.salary || 0) + '/mo',
                  ),
                ),
                h('div', { style: { display: 'flex', gap: 4, alignItems: 'center' } },
                  ['present', 'half', 'absent'].map(status => {
                    const label = status === 'present' ? 'P' : status === 'absent' ? 'A' : '½';
                    const c = status === 'present' ? '#0f6b4b' : status === 'absent' ? '#b91c1c' : '#a26a10';
                    const bg = status === 'present' ? '#eaf5ee' : status === 'absent' ? '#fdecea' : '#fdf2d9';
                    return h('button', { key: status, onClick: () => this.markAttendance(s.id, today, att === status ? null : status), style: { width: 32, height: 32, borderRadius: 8, fontWeight: 800, fontSize: 12, color: att === status ? 'white' : c, background: att === status ? c : bg, border: 'none' } }, label);
                  }),
                ),
              ),
            ]);
          }),
        ),
      this.renderStaffModal(),
    );
  }

  renderStaffModal() {
    const h = this.h;
    const m = this.state.staffModal;
    if (!m.open) return null;
    const inpStyle = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    return h('div', { onClick: () => this.closeStaffModal(), style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440, animation: 'slideIn .2s ease' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
          h('div', { style: { fontSize: 18, fontWeight: 800 } }, m.editId ? '✎ Edit Staff' : '+ Add Staff'),
          h('button', { onClick: () => this.closeStaffModal(), style: { width: 34, height: 34, borderRadius: 9, background: '#f4f1e6', fontSize: 16 } }, '✕'),
        ),
        h('div', { style: { display: 'grid', gap: 12 } },
          h('div', {},
            h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Name / نام *'),
            h('input', { type: 'text', value: m.name, onChange: e => this.setState({ staffModal: { ...m, name: e.target.value } }), placeholder: 'Staff name', style: inpStyle }),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            h('div', {},
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Phone / فون'),
              h('input', { type: 'tel', value: m.phone, onChange: e => this.setState({ staffModal: { ...m, phone: e.target.value } }), placeholder: '03xx', style: inpStyle }),
            ),
            h('div', {},
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Role / کردار'),
              h('input', { type: 'text', value: m.role, onChange: e => this.setState({ staffModal: { ...m, role: e.target.value } }), placeholder: 'e.g. Salesman', style: inpStyle }),
            ),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            h('div', {},
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Salary / تنخواہ (Rs)'),
              h('input', { type: 'number', value: m.salary, onChange: e => this.setState({ staffModal: { ...m, salary: e.target.value } }), placeholder: '0', style: inpStyle }),
            ),
            h('div', {},
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Join Date'),
              h('input', { type: 'date', value: m.joinDate, onChange: e => this.setState({ staffModal: { ...m, joinDate: e.target.value } }), style: inpStyle }),
            ),
          ),
        ),
        h('div', { style: { display: 'flex', gap: 10, marginTop: 20 } },
          m.editId ? h('button', { onClick: () => this.deleteStaff(m.editId), style: { padding: '12px 16px', borderRadius: 10, background: '#fdecea', color: '#a4362b', fontWeight: 600, fontSize: 13 } }, '🗑') : null,
          h('button', { onClick: () => this.closeStaffModal(), style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600 } }, 'Cancel'),
          h('button', { onClick: () => this.saveStaff(), style: { flex: 2, padding: 12, borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700 } }, m.editId ? '✓ Save' : '+ Add Staff'),
        ),
      ),
    );
  }

  renderStaffDetail(staffId) {
    const h = this.h;
    const s = this.activeStaff().find(x => x.id === staffId);
    if (!s) return h('div', { style: { textAlign: 'center', padding: 40, color: '#7a7663' } }, 'Staff not found');
    const payments = (s.salaryPayments || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const totalPaid = payments.reduce((sum, p) => sum + p.net, 0);
    const totalAdvance = payments.reduce((sum, p) => sum + (p.advance || 0), 0);
    const accs = this.getAccounts();

    const now = new Date();
    const curMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const attDays = Object.entries(s.attendance || {}).filter(([d]) => d.startsWith(curMonth));
    const presentDays = attDays.filter(([,v]) => v === 'present').length;
    const halfDays = attDays.filter(([,v]) => v === 'half').length;
    const absentDays = attDays.filter(([,v]) => v === 'absent').length;
    const workingDays = presentDays + halfDays * 0.5;

    const sm = this.state.salaryModal;

    return h('div', { className: 'screen', style: { maxWidth: 720 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 } },
        h('button', { onClick: () => this.setState({ staffView: null }), style: { padding: '8px 14px', borderRadius: 10, background: '#f4f1e6', fontWeight: 700, fontSize: 16, color: '#3a4a3f' } }, '‹'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontWeight: 800, fontSize: 18 } }, s.name),
          h('div', { style: { fontSize: 12, color: '#7a7663' } }, (s.role || 'Staff') + ' · ' + this.fmtPKR(s.salary || 0) + '/mo'),
        ),
        h('button', { onClick: () => this.openStaffModal(s.id), style: { padding: '8px 14px', borderRadius: 10, background: '#f4f1e6', fontWeight: 700, fontSize: 12, color: '#3a4a3f' } }, '✎ Edit'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 14 } },
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em' } }, monthNames[now.getMonth()] + ' Attendance'),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 4, fontSize: 13, fontWeight: 700 } },
            h('span', { style: { color: '#0f6b4b' } }, presentDays + 'P'),
            h('span', { style: { color: '#a26a10' } }, halfDays + '½'),
            h('span', { style: { color: '#b91c1c' } }, absentDays + 'A'),
          ),
        ]),
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Working Days'),
          h('div', { className: 'mono', style: { fontSize: 20, fontWeight: 800, color: '#1a2b1f', marginTop: 2 } }, workingDays),
        ]),
        this.card([
          h('div', { style: { fontSize: 10, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Total Paid'),
          h('div', { className: 'mono', style: { fontSize: 16, fontWeight: 800, color: '#b91c1c', marginTop: 2 } }, this.fmtPKR(totalPaid)),
        ]),
      ),
      h('button', { onClick: () => this.openSalaryModal(s.id), style: { width: '100%', padding: '12px', borderRadius: 10, background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 16 } }, '💰 Pay Salary / تنخواہ دیں'),
      this.sectionHeader('Salary History', 'تنخواہ کی تاریخ'),
      payments.length === 0
        ? h('div', { style: { textAlign: 'center', padding: 20, color: '#7a7663', fontSize: 13 } }, 'No salary payments yet')
        : h('div', {},
          payments.map((p, idx) => {
            const acc = accs.find(a => a.id === p.accountId);
            return h('div', { key: p.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: idx % 2 === 0 ? '#fdfcf8' : '#f9f6ee', borderRadius: 10, marginBottom: 4, borderLeft: '3px solid #3b82f6' } },
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontSize: 13, fontWeight: 600 } }, p.month + ' salary'),
                h('div', { style: { fontSize: 11, color: '#7a7663', marginTop: 2 } },
                  new Date(p.date + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }),
                  acc ? ' · ' + acc.emoji + ' ' + acc.name : '',
                ),
                p.note ? h('div', { style: { fontSize: 10, color: '#7a7663', marginTop: 1 } }, p.note) : null,
              ),
              h('div', { style: { textAlign: 'right' } },
                h('div', { className: 'mono', style: { fontWeight: 800, fontSize: 14, color: '#b91c1c' } }, this.fmtPKR(p.net)),
                p.advance > 0 ? h('div', { style: { fontSize: 10, color: '#a26a10' } }, 'Adv: -' + this.fmtPKR(p.advance)) : null,
              ),
            );
          }),
        ),
      s.phone ? h('div', { style: { marginTop: 16 } },
        h('div', { style: { fontSize: 11, color: '#7a7663' } }, '📞 ' + s.phone),
      ) : null,
      s.joinDate ? h('div', { style: { fontSize: 11, color: '#7a7663', marginTop: 4 } }, 'Joined: ' + new Date(s.joinDate + 'T00:00:00').toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })) : null,
      this.renderStaffModal(),
      sm.open ? this.renderSalaryModal() : null,
    );
  }

  renderSalaryModal() {
    const h = this.h;
    const m = this.state.salaryModal;
    const s = this.activeStaff().find(x => x.id === m.staffId);
    if (!s) return null;
    const accs = this.getAccounts();
    const inpStyle = { width: '100%', border: '1px solid #ece8dc', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fdfcf8', outline: 'none' };
    const gross = parseFloat(m.amount) || 0;
    const advance = parseFloat(m.advance) || 0;
    const net = Math.max(0, gross - advance);
    return h('div', { onClick: () => this.closeSalaryModal(), style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 } },
      h('div', { onClick: e => e.stopPropagation(), style: { background: '#ffffff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440, animation: 'slideIn .2s ease' } },
        h('div', { style: { fontSize: 18, fontWeight: 800, marginBottom: 16 } }, '💰 Pay Salary — ' + s.name),
        h('div', { style: { display: 'grid', gap: 12 } },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            h('div', {},
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Month'),
              h('input', { type: 'month', value: m.month, onChange: e => this.setState({ salaryModal: { ...m, month: e.target.value } }), style: inpStyle }),
            ),
            h('div', {},
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Account / اکاؤنٹ'),
              h('select', { value: m.accountId, onChange: e => this.setState({ salaryModal: { ...m, accountId: e.target.value } }), style: inpStyle },
                accs.map(a => h('option', { key: a.id, value: a.id }, a.emoji + ' ' + a.name)),
              ),
            ),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            h('div', {},
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Gross Salary / کل تنخواہ'),
              h('input', { type: 'number', value: m.amount, onChange: e => this.setState({ salaryModal: { ...m, amount: e.target.value } }), placeholder: '0', className: 'mono', style: inpStyle }),
            ),
            h('div', {},
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Advance Deduct / ایڈوانس'),
              h('input', { type: 'number', value: m.advance, onChange: e => this.setState({ salaryModal: { ...m, advance: e.target.value } }), placeholder: '0', className: 'mono', style: inpStyle }),
            ),
          ),
          h('div', {},
            h('div', { style: { fontSize: 12, fontWeight: 600, color: '#3a4a3f', marginBottom: 6 } }, 'Note (optional)'),
            h('input', { type: 'text', value: m.note, onChange: e => this.setState({ salaryModal: { ...m, note: e.target.value } }), placeholder: 'Any note...', style: inpStyle }),
          ),
          h('div', { style: { textAlign: 'right', paddingTop: 8, borderTop: '2px solid #ece8dc' } },
            advance > 0 ? h('div', { style: { fontSize: 12, color: '#a26a10', marginBottom: 4 } }, 'Gross: ' + this.fmtPKR(gross) + ' − Advance: ' + this.fmtPKR(advance)) : null,
            h('span', { style: { fontSize: 12, color: '#7a7663' } }, 'Net Pay: '),
            h('span', { className: 'mono', style: { fontSize: 22, fontWeight: 800, color: '#0f6b4b' } }, this.fmtPKR(net)),
          ),
        ),
        h('div', { style: { display: 'flex', gap: 10, marginTop: 16 } },
          h('button', { onClick: () => this.closeSalaryModal(), style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600 } }, 'Cancel'),
          h('button', { onClick: () => this.paySalary(), style: { flex: 2, padding: 12, borderRadius: 10, background: '#3b82f6', color: 'white', fontWeight: 700 } }, '💰 Pay ' + this.fmtPKR(net)),
        ),
      ),
    );
  }

  renderDayBook() {
    const h = this.h;
    const accs = this.getAccounts();
    const selIds = this.getReportAccounts();
    const allSelected = !this.state.reportAccounts;
    const dateStr = this.state.dayBookDate || this.todayStr();
    const allTx = this._buildTxList();
    const dayTx = allTx.filter(tx => tx.date === dateStr && (allSelected || selIds.includes(tx.accountId)));
    const dayTxNoUdhar = dayTx.filter(tx => tx.source !== 'udpi' && !(tx.source === 'ledger' && (tx.ledgerEntry.udpiRef || tx.ledgerEntry.category === 'Udhar' || tx.ledgerEntry.category === 'Udhar Return')));
    const dbs = this.state.dayBookSection || 'all';
    const filteredDayTx = dbs === 'all' ? dayTxNoUdhar : dbs === 'expenses' ? dayTxNoUdhar.filter(tx => tx.source === 'ledger' && tx.ledgerEntry.category !== 'Product Cost' && tx.ledgerEntry.category !== 'Down Payment') : dayTxNoUdhar.filter(tx => tx.source === 'plan' || (tx.source === 'ledger' && (tx.ledgerEntry.category === 'Product Cost' || tx.ledgerEntry.category === 'Down Payment')));

    let totalIn = 0, totalOut = 0;
    filteredDayTx.forEach(tx => {
      if (tx.source === 'plan') { totalIn += tx.amount; }
      else if (tx.source === 'ledger') {
        if (tx.ledgerEntry.type === 'income') totalIn += tx.amount;
        else totalOut += tx.amount;
      }
    });
    const net = totalIn - totalOut;

    const shiftDay = (offset) => {
      const d = new Date(dateStr + 'T00:00:00');
      d.setDate(d.getDate() + offset);
      this.setState({ dayBookDate: this._localDateStr(d) });
    };
    const isToday = dateStr === this.todayStr();
    const dayLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

    return h('div', { className: 'screen', style: { maxWidth: 720 } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 } },
        h('button', { onClick: () => shiftDay(-1), style: { padding: '8px 14px', borderRadius: 10, background: '#f4f1e6', fontWeight: 700, fontSize: 16, color: '#3a4a3f' } }, '‹'),
        h('div', { style: { textAlign: 'center', flex: 1 } },
          h('div', { style: { fontWeight: 700, fontSize: 15 } }, dayLabel),
          h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, isToday ? 'آج' : ''),
        ),
        h('button', { onClick: () => shiftDay(1), style: { padding: '8px 14px', borderRadius: 10, background: '#f4f1e6', fontWeight: 700, fontSize: 16, color: '#3a4a3f' } }, '›'),
        !isToday ? h('button', { onClick: () => this.setState({ dayBookDate: this.todayStr() }), style: { padding: '8px 12px', borderRadius: 10, background: '#eaf5ee', fontWeight: 600, fontSize: 12, color: '#0f6b4b' } }, 'Today') : null,
      ),
      h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' } },
        h('span', { style: { fontSize: 11, color: '#7a7663', fontWeight: 600 } }, 'Accounts:'),
        ...accs.map(acc => {
          const active = selIds.includes(acc.id);
          return h('button', { key: acc.id, onClick: () => this.toggleReportAccount(acc.id), style: { padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: active ? '#eaf5ee' : '#f4f1e6', color: active ? '#0f6b4b' : '#7a7663', border: '1px solid ' + (active ? '#0f6b4b' : '#ece8dc') } }, acc.emoji + ' ' + acc.name);
        }),
        allSelected ? null : h('button', { onClick: () => this.setState({ reportAccounts: null }), style: { padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: '#fff', color: '#7a7663', border: '1px solid #ece8dc' } }, '✕ Reset'),
        h('button', { onClick: () => this.downloadReportPDF('daily'), style: { marginLeft: 'auto', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#0f6b4b', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 } }, '⬇ PDF'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 } },
        h('div', { style: { background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 12, padding: 14, textAlign: 'center' } },
          h('div', { style: { fontSize: 10, fontWeight: 600, color: '#7a7663', textTransform: 'uppercase' } }, 'Money In'),
          h('div', { className: 'ur', style: { fontSize: 10, color: '#7a7663' } }, 'آمد'),
          h('div', { className: 'mono', style: { fontSize: 18, fontWeight: 800, color: '#0f6b4b', marginTop: 4 } }, this.fmtPKR(totalIn)),
        ),
        h('div', { style: { background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 12, padding: 14, textAlign: 'center' } },
          h('div', { style: { fontSize: 10, fontWeight: 600, color: '#7a7663', textTransform: 'uppercase' } }, 'Money Out'),
          h('div', { className: 'ur', style: { fontSize: 10, color: '#7a7663' } }, 'خرچ'),
          h('div', { className: 'mono', style: { fontSize: 18, fontWeight: 800, color: '#b91c1c', marginTop: 4 } }, this.fmtPKR(totalOut)),
        ),
        h('div', { style: { background: '#ffffff', border: '1px solid #ece8dc', borderRadius: 12, padding: 14, textAlign: 'center' } },
          h('div', { style: { fontSize: 10, fontWeight: 600, color: '#7a7663', textTransform: 'uppercase' } }, 'Net'),
          h('div', { className: 'ur', style: { fontSize: 10, color: '#7a7663' } }, 'خالص'),
          h('div', { className: 'mono', style: { fontSize: 18, fontWeight: 800, color: net >= 0 ? '#0f6b4b' : '#b91c1c', marginTop: 4 } }, (net >= 0 ? '+' : '-') + this.fmtPKR(Math.abs(net))),
        ),
      ),
      h('div', { style: { display: 'flex', gap: 4, marginBottom: 14 } },
        ...[['All', 'سب', 'all', '📊'], ['Expenses', 'اخراجات', 'expenses', '💰'], ['Plans', 'قسطیں', 'plans', '📋']].map(([label, ur, val, icon]) =>
          h('button', { key: val, onClick: () => this.setState({ dayBookSection: val }), style: { flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: dbs === val ? '#0f6b4b' : '#fdfcf8', color: dbs === val ? 'white' : '#3a4a3f', border: '1px solid ' + (dbs === val ? '#0f6b4b' : '#ece8dc'), textAlign: 'center' } },
            h('div', {}, icon + ' ' + label),
            h('div', { className: 'ur', style: { fontSize: 9, marginTop: 1, opacity: 0.8 } }, ur),
          ),
        ),
      ),
      this.card([
        this.sectionHeader('Transactions', 'لین دین', h('span', { style: { fontSize: 12, color: '#7a7663' } }, filteredDayTx.length + ' entries')),
        filteredDayTx.length === 0
          ? h('div', { style: { padding: '24px 0', textAlign: 'center', color: '#7a7663', fontSize: 14 } },
              h('div', { style: { fontSize: 32, marginBottom: 8 } }, '📭'),
              h('div', { style: { fontWeight: 600 } }, 'No transactions this day'),
              h('div', { className: 'ur', style: { fontSize: 12, marginTop: 4 } }, 'آج کوئی لین دین نہیں'),
            )
          : this._renderTxList(filteredDayTx, accs, true),
      ]),
    );
  }

  renderPnL() {
    const h = this.h;
    const now = new Date();
    const selMonth = this.state.pnlMonth || (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'));
    const accs = this.getAccounts();
    const selIds = this.getReportAccounts();
    const allSelected = !this.state.reportAccounts;

    const profitOf = (pl) => {
      const financed = Math.max(0, pl.total - (pl.down || 0));
      const scheduleTotal = (pl.schedule || []).reduce((s, x) => s + x.amount, 0);
      return Math.max(0, scheduleTotal - financed);
    };

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }

    const buildMonth = (mKey) => {
      let instCollected = 0, instProfit = 0, downPayments = 0, productCost = 0;
      this.activePlans().forEach(pl => {
        const profit = profitOf(pl);
        const scheduleTotal = pl.schedule.reduce((s, x) => s + x.amount, 0) || 1;
        const profitPerRupee = profit / scheduleTotal;
        const idPart = (pl.id || '').replace(/^pl_/, '');
        const createdMs = parseInt(idPart, 36);
        const createdDate = isFinite(createdMs) && createdMs > 0 ? new Date(createdMs) : (pl.startDate ? new Date(pl.startDate) : null);
        const createdKey = createdDate ? createdDate.getFullYear() + '-' + String(createdDate.getMonth() + 1).padStart(2, '0') : '';
        if (createdKey === mKey && selIds.includes(pl.accountId)) {
          downPayments += (pl.down || 0);
          productCost += (pl.total || 0);
        }
        pl.schedule.forEach(s => {
          if (s.paid && s.paidDate && s.paidDate.slice(0, 7) === mKey && selIds.includes(s.accountId)) {
            instCollected += (s.amountPaid || s.amount);
            instProfit += (s.amountPaid || s.amount) * profitPerRupee;
          }
        });
      });

      // Exclude plan-related ledger entries — they're counted from plan records above.
      const mLedger = this.activeLedger().filter(le => le.date && le.date.slice(0, 7) === mKey && selIds.includes(le.accountId) && !le.udpiRef && le.category !== 'Udhar' && le.category !== 'Udhar Return' && !this._isPlanLedgerEntry(le));
      const ledgerIncome = mLedger.filter(le => le.type === 'income').reduce((s, le) => s + le.amount, 0);
      const ledgerExpense = mLedger.filter(le => le.type === 'expense').reduce((s, le) => s + le.amount, 0);

      const totalIncome = instCollected + downPayments + ledgerIncome;
      const totalExpense = ledgerExpense + productCost;
      const grossProfit = instProfit;
      const netPnL = totalIncome - totalExpense;

      return { instCollected, instProfit: Math.round(instProfit), downPayments, productCost, ledgerIncome, ledgerExpense, totalIncome, totalExpense, grossProfit: Math.round(grossProfit), netPnL };
    };

    const data = buildMonth(selMonth);
    const monthLabel = new Date(selMonth + '-01T00:00:00').toLocaleDateString('en', { month: 'long', year: 'numeric' });

    const trendData = months.map(m => ({ key: m, ...buildMonth(m) }));
    const maxNet = Math.max(...trendData.map(t => Math.abs(t.netPnL)), 1);

    const row = (label, ur, value, color, bold) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #f2eee2', alignItems: 'center' } },
      h('div', {},
        h('div', { style: { fontSize: 13, fontWeight: bold ? 700 : 500 } }, label),
        h('div', { className: 'ur', style: { fontSize: 11, color: '#7a7663' } }, ur),
      ),
      h('div', { className: 'mono', style: { fontSize: 15, fontWeight: 700, color: color || '#1a2b1f' } }, this.fmtPKR(value)),
    );

    return h('div', { className: 'screen', style: { maxWidth: 720 } },
      h('div', { style: { display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10, paddingBottom: 4 } },
        months.map(m => {
          const ml = new Date(m + '-01T00:00:00').toLocaleDateString('en', { month: 'short' });
          const isSel = m === selMonth;
          return h('button', { key: m, onClick: () => this.setState({ pnlMonth: m }), style: { padding: '8px 14px', borderRadius: 10, background: isSel ? '#0f6b4b' : '#f4f1e6', color: isSel ? '#fff' : '#3a4a3f', fontWeight: isSel ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 } }, ml);
        }),
      ),
      h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' } },
        h('span', { style: { fontSize: 11, color: '#7a7663', fontWeight: 600 } }, 'Accounts:'),
        ...accs.map(acc => {
          const active = selIds.includes(acc.id);
          return h('button', { key: acc.id, onClick: () => this.toggleReportAccount(acc.id), style: { padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: active ? '#eaf5ee' : '#f4f1e6', color: active ? '#0f6b4b' : '#7a7663', border: '1px solid ' + (active ? '#0f6b4b' : '#ece8dc') } }, acc.emoji + ' ' + acc.name);
        }),
        allSelected ? null : h('button', { onClick: () => this.setState({ reportAccounts: null }), style: { padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: '#fff', color: '#7a7663', border: '1px solid #ece8dc' } }, '✕ Reset'),
        h('button', { onClick: () => this.downloadReportPDF('monthly'), style: { marginLeft: 'auto', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#0f6b4b', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 } }, '⬇ PDF'),
      ),
      h('div', { style: { textAlign: 'center', marginBottom: 16 } },
        h('div', { style: { fontSize: 12, fontWeight: 600, color: '#7a7663', textTransform: 'uppercase' } }, monthLabel),
        h('div', { className: 'mono', style: { fontSize: 32, fontWeight: 800, color: data.netPnL >= 0 ? '#0f6b4b' : '#b91c1c', marginTop: 4 } }, (data.netPnL >= 0 ? '+' : '-') + this.fmtPKR(Math.abs(data.netPnL))),
        h('div', { className: 'ur', style: { fontSize: 13, color: '#7a7663', marginTop: 2 } }, data.netPnL >= 0 ? 'خالص منافع' : 'خالص نقصان'),
      ),
      this.card([
        this.sectionHeader('Income', 'آمدنی'),
        row('Installments Collected', 'اقساط وصول', data.instCollected, '#0f6b4b'),
        row('Down Payments', 'ایڈوانس', data.downPayments, '#0f6b4b'),
        row('Other Income (Ledger)', 'دیگر آمدنی', data.ledgerIncome, '#0f6b4b'),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #ece8dc', alignItems: 'center' } },
          h('div', { style: { fontWeight: 800, fontSize: 14 } }, 'Total Income'),
          h('div', { className: 'mono', style: { fontWeight: 800, fontSize: 17, color: '#0f6b4b' } }, this.fmtPKR(data.totalIncome)),
        ),
      ]),
      h('div', { style: { height: 12 } }),
      this.card([
        this.sectionHeader('Expenses', 'اخراجات'),
        row('Product Cost (Plans)', 'پلانز کی لاگت', data.productCost, '#b91c1c'),
        row('Expenses (Ledger)', 'لیجر اخراجات', data.ledgerExpense, '#b91c1c'),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #ece8dc', alignItems: 'center' } },
          h('div', { style: { fontWeight: 800, fontSize: 14 } }, 'Total Expenses'),
          h('div', { className: 'mono', style: { fontWeight: 800, fontSize: 17, color: '#b91c1c' } }, this.fmtPKR(data.totalExpense)),
        ),
      ]),
      h('div', { style: { height: 12 } }),
      this.card([
        this.sectionHeader('Profitability', 'منافع'),
        row('Installment Markup Earned', 'قسط کا منافع', data.instProfit, '#a26a10'),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #ece8dc', alignItems: 'center' } },
          h('div', {},
            h('div', { style: { fontWeight: 800, fontSize: 14 } }, 'Net P&L'),
            h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, 'خالص نفع نقصان'),
          ),
          h('div', { className: 'mono', style: { fontWeight: 800, fontSize: 20, color: data.netPnL >= 0 ? '#0f6b4b' : '#b91c1c' } }, (data.netPnL >= 0 ? '+' : '-') + this.fmtPKR(Math.abs(data.netPnL))),
        ),
      ]),
      h('div', { style: { height: 12 } }),
      this.card([
        this.sectionHeader('6-Month Trend', 'چھ ماہ کا رجحان'),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', height: 160, paddingTop: 12 } },
          trendData.map(t => {
            const isSel = t.key === selMonth;
            const isPositive = t.netPnL >= 0;
            const barH = Math.max(4, Math.abs(t.netPnL) / maxNet * 120);
            const ml = new Date(t.key + '-01T00:00:00').toLocaleDateString('en', { month: 'short' });
            return h('div', { key: t.key, onClick: () => this.setState({ pnlMonth: t.key }), style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' } },
              h('div', { className: 'mono', style: { fontSize: 10, color: '#5a6a5f', fontWeight: 600 } }, t.netPnL >= 1000 || t.netPnL <= -1000 ? Math.round(t.netPnL / 1000) + 'k' : t.netPnL),
              h('div', { style: { width: '100%', maxWidth: 36, borderRadius: '6px 6px 0 0', height: barH + 'px', background: isPositive ? (isSel ? 'linear-gradient(180deg,#14a374,#0f6b4b)' : '#b6e2cc') : (isSel ? 'linear-gradient(180deg,#ef4444,#b91c1c)' : '#fca5a5'), transition: 'height .3s' } }),
              h('div', { style: { fontSize: 11, fontWeight: isSel ? 700 : 500, color: isSel ? '#0f6b4b' : '#7a7663' } }, ml),
            );
          }),
        ),
      ]),
    );
  }

  renderAccounts() {
    const h = this.h;
    const accs = this.getAccounts();
    const allTx = this._buildTxList();
    const sel = this.state.selectedAccountId;
    const selAcc = sel ? accs.find(a => a.id === sel) : null;
    const selTx = sel ? allTx.filter(tx => tx.accountId === sel) : [];

    const accIds = new Set(accs.map(a => a.id));
    const noUdharLedger = this.activeLedger().filter(le => !le.udpiRef && le.category !== 'Udhar' && le.category !== 'Udhar Return' && !this._isPlanLedgerEntry(le));
    const gIncome = noUdharLedger.filter(le => le.type === 'income').reduce((s, le) => s + le.amount, 0);
    const gExpense = noUdharLedger.filter(le => le.type === 'expense').reduce((s, le) => s + le.amount, 0);
    const gExpNet = gIncome - gExpense;
    const planLedger = this.activeLedger().filter(le => this._isPlanLedgerEntry(le));
    const gPlanLedgerNet = planLedger.reduce((s, le) => s + (le.type === 'income' ? le.amount : -le.amount), 0);
    const allPaidSch = [];
    this.activePlans().forEach(pl => { (pl.schedule || []).forEach(s => { if (s.paid) allPaidSch.push(s); }); });
    const gPlanCollected = allPaidSch.reduce((s, x) => s + (x.amountPaid || x.amount || 0), 0) + gPlanLedgerNet;
    const unassignedPlan = allPaidSch.filter(s => !s.accountId || !accIds.has(s.accountId)).reduce((s, x) => s + (x.amountPaid || x.amount || 0), 0);
    const allUdpiActive = this.activeUdpiEntries().filter(u => !u.returned);
    const gLent = allUdpiActive.filter(u => u.direction === 'lent').reduce((s, u) => s + u.amount, 0);
    const gBorrowed = allUdpiActive.filter(u => u.direction === 'borrowed').reduce((s, u) => s + u.amount, 0);

    return h('div', { className: 'screen', style: { maxWidth: 720 } },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 } },
        this.card([
          h('div', { style: { textAlign: 'center', padding: '4px 0' } },
            h('div', { style: { fontSize: 20, marginBottom: 2 } }, '💰'),
            h('div', { style: { fontSize: 9, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.04em' } }, 'Expenses'),
            h('div', { className: 'ur', style: { fontSize: 9, color: '#7a7663' } }, 'خرچے / آمدنی'),
            h('div', { className: 'mono', style: { fontSize: 17, fontWeight: 800, color: gExpNet >= 0 ? '#0f6b4b' : '#b91c1c', marginTop: 3 } }, (gExpNet >= 0 ? '+' : '') + this.fmtPKR(gExpNet)),
            h('div', { style: { fontSize: 8, color: '#7a7663', marginTop: 2 } }, 'In: ' + this.fmtPKR(gIncome)),
            h('div', { style: { fontSize: 8, color: '#7a7663' } }, 'Out: ' + this.fmtPKR(gExpense)),
          ),
        ]),
        this.card([
          h('div', { style: { textAlign: 'center', padding: '4px 0' } },
            h('div', { style: { fontSize: 20, marginBottom: 2 } }, '📋'),
            h('div', { style: { fontSize: 9, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.04em' } }, 'Plans'),
            h('div', { className: 'ur', style: { fontSize: 9, color: '#7a7663' } }, 'قسطیں وصول'),
            h('div', { className: 'mono', style: { fontSize: 17, fontWeight: 800, color: '#0f6b4b', marginTop: 3 } }, this.fmtPKR(gPlanCollected)),
            h('div', { style: { fontSize: 8, color: '#7a7663', marginTop: 2 } }, allPaidSch.length + ' payments'),
            unassignedPlan > 0 ? h('div', { style: { fontSize: 8, color: '#b45309' } }, this.fmtPKR(unassignedPlan) + ' unassigned') : null,
          ),
        ]),
        this.card([
          h('div', { style: { textAlign: 'center', padding: '4px 0' } },
            h('div', { style: { fontSize: 20, marginBottom: 2 } }, '🤝'),
            h('div', { style: { fontSize: 9, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.04em' } }, 'Udhar'),
            h('div', { className: 'ur', style: { fontSize: 9, color: '#7a7663' } }, 'ادھار بیلنس'),
            h('div', { className: 'mono', style: { fontSize: 17, fontWeight: 800, color: gLent > gBorrowed ? '#b91c1c' : '#0f6b4b', marginTop: 3 } }, this.fmtPKR(Math.abs(gBorrowed - gLent))),
            h('div', { style: { fontSize: 8, color: '#b91c1c', marginTop: 2 } }, 'Lent: ' + this.fmtPKR(gLent)),
            h('div', { style: { fontSize: 8, color: '#3b82f6' } }, 'Got: ' + this.fmtPKR(gBorrowed)),
          ),
        ]),
      ),
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 } },
        h('div', {},
          h('div', { style: { fontWeight: 700, fontSize: 14, color: '#1a2b1f' } }, 'Accounts'),
          h('div', { className: 'ur', style: { fontSize: 11, color: '#7a7663' } }, 'اکاؤنٹس'),
        ),
        h('div', { style: { fontSize: 11, color: '#7a7663' } }, accs.length + ' accounts'),
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 } },
        ...accs.map(acc => {
          const eBal = this.accExpenseBal(acc.id);
          const pBal = this.accPlanBal(acc.id);
          const uBal = this.accUdharBal(acc.id);
          const isSelected = sel === acc.id;
          const hasAny = eBal !== 0 || pBal !== 0 || uBal !== 0;
          const balCard = (icon, label, amt, color, sub) => h('div', { style: { flex: 1, textAlign: 'center', padding: '6px 4px', background: '#fdfcf8', borderRadius: 8, border: '1px solid #f2eee2' } },
            h('div', { style: { fontSize: 14, marginBottom: 1 } }, icon),
            h('div', { style: { fontSize: 8, fontWeight: 700, color: '#7a7663', textTransform: 'uppercase', letterSpacing: '0.03em' } }, label),
            h('div', { className: 'mono', style: { fontSize: 13, fontWeight: 800, color, marginTop: 2 } }, this.fmtPKR(amt)),
            sub ? h('div', { style: { fontSize: 7, color: '#7a7663', marginTop: 1 } }, sub) : null,
          );
          return h('div', { key: acc.id, onClick: () => this.setState({ selectedAccountId: isSelected ? null : acc.id }), style: { cursor: 'pointer' } },
            this.card([
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('div', { style: { fontSize: 24, width: 40, height: 40, borderRadius: 10, background: isSelected ? '#0f6b4b' : '#eaf5ee', color: isSelected ? 'white' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' } }, acc.emoji),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontWeight: 700, fontSize: 14 } }, acc.name),
                  acc.nameUr ? h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, acc.nameUr) : null,
                ),
                isSelected ? h('div', { style: { fontSize: 11, color: '#0f6b4b', fontWeight: 600 } }, '▾ History') : h('div', { style: { fontSize: 11, color: '#7a7663' } }, '▸ Tap'),
              ),
              hasAny ? h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
                balCard('💰', 'Expenses', eBal, eBal >= 0 ? '#0f6b4b' : '#b91c1c'),
                balCard('📋', 'Plans', pBal, '#0f6b4b'),
                balCard('🤝', 'Udhar', uBal, uBal >= 0 ? '#3b82f6' : '#b91c1c'),
              ) : h('div', { style: { fontSize: 11, color: '#b5a78a', padding: '4px 0 8px', textAlign: 'center' } }, 'No transactions assigned'),
              h('div', { style: { display: 'flex', gap: 6, paddingTop: 8, borderTop: '1px solid #f2eee2' } },
                h('button', { onClick: (e) => { e.stopPropagation(); this.setState({ ledgerModal: { open: true, type: 'income', amount: '', accountId: acc.id, category: '', note: '', date: this.todayStr(), editId: null } }); }, style: { flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#eaf5ee', color: '#0f6b4b', border: '1px solid #d3e9dd' } }, '+ Add Money'),
                h('button', { onClick: (e) => { e.stopPropagation(); this.setState({ ledgerModal: { open: true, type: 'expense', amount: '', accountId: acc.id, category: '', note: '', date: this.todayStr(), editId: null } }); }, style: { flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' } }, '- Withdraw'),
              ),
            ], isSelected ? { border: '2px solid #0f6b4b' } : {}),
          );
        }),
      ),
      selAcc ? h('div', { style: { marginTop: 12 } },
        this.card([
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { fontSize: 20 } }, selAcc.emoji),
              h('div', {},
                h('div', { style: { fontWeight: 700, fontSize: 15 } }, selAcc.name + ' History'),
                h('div', { className: 'ur', style: { fontSize: 12, color: '#7a7663' } }, 'لین دین کی تاریخ'),
              ),
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { className: 'mono', style: { fontSize: 13, fontWeight: 700, color: '#0f6b4b' } }, selTx.length + ' payments'),
              h('button', { type: 'button', onClick: e => { e.stopPropagation(); this.setState({ selectedAccountId: null }); }, style: { padding: '4px 10px', borderRadius: 6, background: '#f4f1e6', fontSize: 12, fontWeight: 600, color: '#3a4a3f' } }, '✕ Close'),
            ),
          ),
          ...this._renderTxList(selTx, accs, false),
        ]),
      ) : null,
      h('div', { style: { height: 12 } }),
      this.card([
        this.sectionHeader('All Transactions', 'تمام لین دین', h('span', { style: { fontSize: 12, color: '#7a7663' } }, allTx.length + ' total')),
        ...this._renderTxList(allTx.slice(0, 20), accs, true),
      ]),
      h('div', { style: { textAlign: 'center', padding: '16px 0' } },
        h('button', { type: 'button', onClick: () => this.go('settings'), style: { padding: '10px 20px', borderRadius: 10, background: '#f4f1e6', fontWeight: 600, fontSize: 13, color: '#3a4a3f' } }, '⚙ Manage Accounts in Settings'),
      ),
      this.renderLedgerModal(),
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
          field('City', 'شہر', this.cityField(nc.city, v => set('city', v), inp)),
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
          field('City', 'شہر', this.cityField(ec.city, v => set('city', v), inp)),
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
    const categories = ['Mobile', 'Car', 'Motorcycle', 'Rickshaw', 'Loader', 'Television', 'Refrigerator', 'Appliance', 'Air Conditioner', 'Laptop', 'Tablet', 'Other'];
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
            field('Sale Price (Rs) *', h('input', { type: 'number', value: np.price, onChange: e => set('price', e.target.value), placeholder: '0', style: inp })),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            field('Cost Price (Rs)', h('input', { type: 'number', value: np.costPrice, onChange: e => set('costPrice', e.target.value), placeholder: 'Purchase price', style: inp })),
            field('Opening Stock', h('input', { type: 'number', value: np.stock, onChange: e => set('stock', e.target.value), placeholder: '0', style: inp })),
          ),
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
    const categories = ['Mobile', 'Car', 'Motorcycle', 'Rickshaw', 'Loader', 'Television', 'Refrigerator', 'Appliance', 'Air Conditioner', 'Laptop', 'Tablet', 'Other'];
    const emojis = ['📱','🏍️','📺','❄️','🧺','💻','📦','⚡','🔌','🎮','📷','🖨️'];
    const sold = this.activePlans().filter(pl => pl.productId === ep.id).length;
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
            field('Sale Price (Rs) *', 'فروخت قیمت', h('input', { type: 'number', value: ep.price, onChange: e => set('price', e.target.value), placeholder: '0', className: 'mono', style: inp })),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            field('Cost Price (Rs)', 'خرید قیمت', h('input', { type: 'number', value: ep.costPrice, onChange: e => set('costPrice', e.target.value), placeholder: 'Purchase price', className: 'mono', style: inp })),
            field('Stock', 'اسٹاک', h('input', { type: 'number', value: ep.stock, onChange: e => set('stock', e.target.value), placeholder: '0', className: 'mono', style: inp })),
          ),
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
                h('div', { className: 'mono', style: { fontSize: 10, color: '#7a7663', marginTop: 2 } }, '📋 ' + this.fmtPKR(this.accPlanBal(acc.id))),
              ); }),
            )
          : h('div', { style: { padding: '12px 0', marginBottom: 20, color: '#7a7663', fontSize: 12 } }, 'No accounts set up. Add them in Settings → Payment Accounts.');
        })(),
        h('div', { style: { display: 'flex', gap: 10 } },
          h('button', { onClick: this.closePayment, style: { flex: 1, padding: 12, borderRadius: 10, background: '#f4f1e6', fontWeight: 600, color: '#3a4a3f' } }, 'Cancel'),
          h('button', { onClick: this.confirmPayment, style: { flex: 2, padding: 12, borderRadius: 10, background: '#0f6b4b', color: 'white', fontWeight: 700 } }, ctx.isEdit ? '✓ Update Payment' : '✓ Confirm Payment'),
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
    const isMobile = p && this.isPhoneCat(p.category);
    const isVehicle = p && this.isVehicleCat(p.category);
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
          h('div', { style: { display: 'grid', gridTemplateColumns: isMobile || isVehicle ? '1fr 1fr' : '1fr', gap: 10 } },
            h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Start Date ', h('span', { className: 'ur', style: { fontWeight: 400, color: '#7a7663', textTransform: 'none', letterSpacing: 0 } }, 'آغاز')),
              h('input', { type: 'date', value: em.draftStartDate, onChange: e => setDraft('draftStartDate', e.target.value), style: { ...inpStyle, width: '100%' } }),
            ),
            isMobile ? h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'IMEI Number'),
              h('input', { value: em.draftImei, onChange: e => setDraft('draftImei', e.target.value), placeholder: '15-digit IMEI', style: { ...inpStyle, width: '100%', fontFamily: 'monospace' } }),
            ) : null,
            isVehicle ? h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Chassis No.'),
              h('input', { value: em.draftChassisNo, onChange: e => setDraft('draftChassisNo', e.target.value), placeholder: 'Chassis number', style: { ...inpStyle, width: '100%', fontFamily: 'monospace' } }),
            ) : null,
            isVehicle ? h('div', {},
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3a4a3f', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Engine No.'),
              h('input', { value: em.draftEngineNo, onChange: e => setDraft('draftEngineNo', e.target.value), placeholder: 'Engine number', style: { ...inpStyle, width: '100%', fontFamily: 'monospace' } }),
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
    const { route } = this.state;
    const plans = this.activePlans();
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
      ledger:     ['Ledger',     'لیجر',      'Income & expenses'],
      daybook:    ['Daily Book', 'روزنامچہ',  'Day-by-day cash register'],
      pnl:        ['Profit & Loss', 'نفع نقصان', 'Monthly P&L report'],
      accounts:   ['Accounts',  'اکاؤنٹس',  'Payment accounts & balances'],
      udharbook:  ['Udhar Book', 'اُدھار بک', 'Lent & borrowed tracking'],
      staff:      ['Staff',      'ملازمین',   'Payroll & attendance'],
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
      { key: 'ledger',    label: 'Ledger',     icon: '📒', go: () => this.go('ledger') },
      { key: 'daybook',   label: 'Daily Book', icon: '📅', go: () => this.go('daybook') },
      { key: 'pnl',       label: 'P&L',        icon: '📈', go: () => this.go('pnl') },
      { key: 'accounts',  label: 'Accounts',   icon: '💰', go: () => this.go('accounts') },
      { key: 'udharbook', label: 'Udhar Book', icon: '🤝', go: () => this.go('udharbook') },
      { key: 'staff',     label: 'Staff',       icon: '👷', go: () => this.go('staff') },
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

    if (route === 'udharbook') {
      const udharTab = this.state.udharTab || 'parties';
      const ubParties = this._getUdharParties();
      const ubReceivable = ubParties.reduce((s, p) => s + Math.max(0, p.balance), 0);
      const ubPayable = ubParties.reduce((s, p) => s + Math.max(0, -p.balance), 0);
      const ubNet = ubReceivable - ubPayable;
      return (
        <div style={{ minHeight: '100vh', background: '#f4f6f3', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
          <Head>
            <title>Udhar Book — Hisaab Kitaab</title>
            <meta name="description" content="Digital udhar tracking — lent & borrowed" />
            <meta name="theme-color" content="#0f6b4f" />
          </Head>

          {this._isDemo && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'linear-gradient(90deg, #0f6b4f, #14a374)', color: '#fff', textAlign: 'center', padding: '6px 12px', fontSize: 12, fontWeight: 700, letterSpacing: '.5px' }}>
            DEMO MODE — Sample data · <a href="https://wa.me/923001234567?text=I%20want%20Udhar%20Book" style={{ color: '#fef3c7', textDecoration: 'underline' }}>Get Started →</a>
          </div>}

          {/* Green Header */}
          <div style={{ background: '#0f6b4f', color: '#fff', position: 'sticky', top: 0, zIndex: 40 }}>
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '10px 14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden', background: 'rgba(255,255,255,.16)', flexShrink: 0 }}>
                  <img src="/pfp.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px' }}>{this.state.settings.businessName || 'Udhar Book'}</div>
                  <div style={{ fontSize: 10.5, opacity: .72, fontWeight: 500 }}>Hisaab Kitaab</div>
                </div>
                <button onClick={() => { if (this.state.waStatus === 'ready') this.setState({ waModal: true }); else this.connectWhatsApp(); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 16, background: 'rgba(255,255,255,.16)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: this.state.waStatus === 'ready' ? '#4ade80' : '#fbbf24' }} />
                  WA
                </button>
                <button onClick={() => this.go('dashboard')} style={{ padding: '6px 12px', borderRadius: 16, background: 'rgba(255,255,255,.16)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600 }}>← Aqsat</button>
              </div>
              <div style={{ display: 'flex', marginTop: 10, background: 'rgba(255,255,255,.12)', borderRadius: 11, overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: '8px 12px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 600, opacity: .72, letterSpacing: '.3px' }}>YOU WILL GET</div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{this.fmtPKR(ubReceivable)}</div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,.18)' }} />
                <div style={{ flex: 1, padding: '8px 12px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 600, opacity: .72, letterSpacing: '.3px' }}>YOU WILL GIVE</div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{this.fmtPKR(ubPayable)}</div>
                </div>
              </div>
              <div style={{ marginTop: 6, background: 'rgba(255,255,255,.18)', borderRadius: 10, padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, opacity: .82 }}>NET BALANCE / بقایا</div>
                <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: ubNet >= 0 ? '#4ade80' : '#fca5a5' }}>{ubNet >= 0 ? '+' : '-'} {this.fmtPKR(Math.abs(ubNet))}</div>
              </div>
            </div>
          </div>

          {/* Tab Chips */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 14px 7px', background: '#fff', borderBottom: '1px solid #e6eae5', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', display: 'flex', gap: 6 }}>
              {[
                { key: 'parties',  label: 'Khata' },
                { key: 'activity', label: 'Activity' },
                { key: 'reports',  label: 'Reports' },
              ].map(t => (
                <button key={t.key} onClick={() => this.setState({ udharTab: t.key, udharPerson: null, invoiceView: null })} style={{ padding: '5px 11px', borderRadius: 14, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', background: udharTab === t.key ? '#0f6b4f' : '#fff', color: udharTab === t.key ? '#fff' : '#3d4a44', border: udharTab === t.key ? 'none' : '1px solid #d8ded9', transition: 'all .15s' }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, maxWidth: 900, margin: '0 auto', width: '100%', background: '#fff', zoom: 0.82 }}>
            {this.renderUdharBook()}
          </div>

          {/* Floating Action Buttons */}
          <div style={{ position: 'fixed', bottom: 52, left: 0, right: 0, zIndex: 25, background: 'linear-gradient(180deg, rgba(255,255,255,0), #fff 40%)' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 8, padding: '8px 14px' }}>
              <button onClick={() => { this.openUdpiModal(); setTimeout(() => this.setState({ udpiModal: { ...this.state.udpiModal, direction: 'lent' } }), 50); }} style={{ flex: 1, height: 40, borderRadius: 11, background: '#c0392b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(192,57,43,.28)' }}>＋ Udhaar</button>
              <button onClick={() => { this.openUdpiModal(); setTimeout(() => this.setState({ udpiModal: { ...this.state.udpiModal, direction: 'borrowed' } }), 50); }} style={{ flex: 1, height: 40, borderRadius: 11, background: '#0f6b4f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,107,79,.28)' }}>＋ Payment</button>
            </div>
          </div>

          {/* Bottom Tab Bar */}
          <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 52, background: '#fff', borderTop: '1px solid #e6eae5', display: 'flex', alignItems: 'stretch', paddingBottom: 4, zIndex: 30 }}>
            <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'stretch' }}>
              {[
                { key: 'parties',  icon: '📒', label: 'Khata' },
                { key: 'activity', icon: '📋', label: 'Activity' },
                { key: 'reports',  icon: '📊', label: 'Reports' },
                { key: 'more',     icon: '⋯',  label: 'More' },
              ].map(item => (
                <button key={item.key} onClick={() => item.key === 'more' ? this.go('dashboard') : this.setState({ udharTab: item.key, udharPerson: null, invoiceView: null })} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none', cursor: 'pointer', background: 'transparent', color: udharTab === item.key ? '#0f6b4f' : '#9aa69f', transition: 'all .15s' }}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1px' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* WA Modal */}
          {this.state.waModal ? this.h('div', { onClick: (e) => { if (e.target === e.currentTarget) { this.setState({ waModal: false }); this.stopWAPolling(); } }, style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(20,32,27,.42)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
            this.h('div', { style: { background: '#fff', borderRadius: 22, padding: 20, maxWidth: 360, width: '100%', textAlign: 'center', border: '1px solid #e6eae5' } },
              this.h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
                this.h('div', { style: { fontSize: 16, fontWeight: 700, color: '#16211c' } }, 'WhatsApp Connection'),
                this.h('button', { onClick: () => { this.setState({ waModal: false }); this.stopWAPolling(); }, style: { background: 'none', border: 'none', color: '#8b978f', fontSize: 18, cursor: 'pointer', padding: 4 } }, '✕'),
              ),
              this.h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 } },
                this.h('div', { style: { width: 10, height: 10, borderRadius: '50%', background: this.state.waStatus === 'ready' ? '#0f6b4f' : this.state.waStatus === 'qr' ? '#f59e0b' : '#c0392b' } }),
                this.h('div', { style: { fontSize: 13, fontWeight: 700, color: this.state.waStatus === 'ready' ? '#0f6b4f' : '#16211c' } },
                  this.state.waStatus === 'ready' ? 'Connected' : this.state.waStatus === 'qr' ? 'Scan QR Code' : this.state.waStatus === 'authenticated' ? 'Loading...' : 'Disconnected'),
              ),
              this.state.waStatus === 'qr' && this.state.waQR ? this.h('div', { style: { marginBottom: 16 } },
                this.h('img', { src: this.state.waQR, alt: 'QR Code', style: { width: 220, height: 220, borderRadius: 12, background: 'white', padding: 8 } }),
                this.h('div', { style: { fontSize: 11, color: '#8b978f', marginTop: 8 } }, 'WhatsApp → Linked Devices → Link'),
              ) : null,
              this.state.waStatus === 'disconnected' ? this.h('button', { onClick: () => this.connectWhatsApp(), style: { width: '100%', padding: '12px', borderRadius: 14, background: '#25D366', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', marginTop: 8, cursor: 'pointer' } }, 'Connect WhatsApp') : null,
              this.state.waStatus === 'ready' ? this.h('div', { style: { marginTop: 12, borderTop: '1px solid #e6eae5', paddingTop: 12, textAlign: 'left' } },
                this.h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
                  this.h('div', {},
                    this.h('div', { style: { fontSize: 13, fontWeight: 700, color: '#16211c' } }, 'Auto-Reply Bot'),
                    this.h('div', { style: { fontSize: 11, color: '#8b978f' } }, 'خودکار جواب'),
                  ),
                  this.h('button', { onClick: () => this.toggleWABot(), style: { padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', background: this.state.waBotEnabled ? '#0f6b4f' : '#f4f6f3', color: this.state.waBotEnabled ? '#fff' : '#8b978f' } }, this.state.waBotEnabled ? 'ON' : 'OFF'),
                ),
                this.h('button', { onClick: () => this.sendWAReminders(), disabled: this.state.waReminding, style: { width: '100%', padding: '10px', borderRadius: 10, background: '#eaf5ee', color: '#0f6b4f', fontWeight: 700, fontSize: 13, border: '1px solid #d3e9dd', cursor: 'pointer', marginBottom: 8 } }, this.state.waReminding ? 'Sending...' : '📢 Send Reminders / یاد دہانی'),
                this.h('button', { onClick: () => this.fetchBotLog(), style: { width: '100%', padding: '8px', borderRadius: 10, background: '#f4f6f3', color: '#3d4a44', fontWeight: 600, fontSize: 12, border: '1px solid #e6eae5', cursor: 'pointer', marginBottom: 8 } }, '📋 View Bot Log'),
                this.state.waBotLog.length > 0 ? this.h('div', { style: { maxHeight: 150, overflowY: 'auto', fontSize: 11, color: '#3d4a44', background: '#f8faf7', borderRadius: 8, padding: 8, border: '1px solid #e6eae5' } },
                  this.state.waBotLog.map(function(log, i) { return React.createElement('div', { key: i, style: { padding: '3px 0', borderBottom: i < 10 ? '1px solid #eef1ec' : 'none' } }, log.time + ' · ' + log.from + ' → ' + log.action); }),
                ) : null,
                this.h('div', { style: { marginTop: 10 } },
                  this.h('button', { onClick: () => this.disconnectWhatsApp(), style: { width: '100%', padding: '10px', borderRadius: 12, background: '#fff', color: '#c0392b', fontWeight: 700, fontSize: 12, border: '1.5px solid #c0392b', cursor: 'pointer' } }, 'Disconnect'),
                ),
              ) : null,
            ),
          ) : null}

          {this.renderUdpiModal()}
          {this.renderInvoiceModal()}
          {this.state.pinModal.open && this.renderPinModal()}
        </div>
      );
    }

    return (
      <div className={this.state.darkMode ? 'app dark' : 'app'} style={{ minHeight: '100vh', display: 'flex', background: '#f7f5ef' }}>
        <Head>
          <title>Aqsat — Installment Manager</title>
          <meta name="description" content="Installment management for electronics & appliance shops" />
        </Head>

        {this._isDemo && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'linear-gradient(90deg, #0f6b4f, #14a374)', color: '#fff', textAlign: 'center', padding: '6px 12px', fontSize: 12, fontWeight: 700, letterSpacing: '.5px' }}>
          DEMO MODE — Sample data shown · <a href="https://wa.me/923001234567?text=I%20want%20Aqsat%20Manager" style={{ color: '#fef3c7', textDecoration: 'underline' }}>Get Started →</a>
        </div>}

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
            {route === 'ledger'     && this.renderLedger()}
            {route === 'daybook'    && this.renderDayBook()}
            {route === 'pnl'        && this.renderPnL()}
            {route === 'accounts'   && this.renderAccounts()}

            {route === 'staff'      && this.renderStaff()}
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
                  { icon: '📒', label: 'Ledger',    go: 'ledger' },
                  { icon: '📅', label: 'Daily Book', go: 'daybook' },
                  { icon: '📈', label: 'P&L',       go: 'pnl' },
                  { icon: '💰', label: 'Accounts',  go: 'accounts' },
                  { icon: '🤝', label: 'Udhar Book', go: 'udharbook' },
                  { icon: '👷', label: 'Staff',      go: 'staff' },
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
