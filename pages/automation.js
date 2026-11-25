import React from 'react';
import { C } from '../lib/ui/AuthGate';
import { supabase, SHOP_ID } from '../lib/supabase';
import { buildQueue, pkDate } from '../lib/waAutomation';

const KINDS = { receipt: 'Receipt', due3: 'Due in 3 days', due0: 'Due today', late3: '3 days late', monthly: 'Monthly statement', owner: 'Owner summary' };

export class Automation extends React.Component {
  state = { cfg: null, saving: false, msg: '', bot: null, preview: null, open: null };

  componentDidMount() { this.load(); }

  load = async () => {
    try {
      const { config } = await this.props.api('/api/automation');
      this.setState({ cfg: config });
      this.preview(config);
    } catch (e) { this.setState({ msg: e.message }); }
    try { this.setState({ bot: await this.props.api('/api/whatsapp-status', { method: 'POST', body: { action: 'auto-status' } }) }); } catch (e) { this.setState({ bot: { error: e.message } }); }
  };

  // What a run would send today, ignoring what already went out.
  preview = async (cfg) => {
    const { data } = await supabase.from('shops').select('data').eq('id', SHOP_ID).maybeSingle();
    const shop = (data && data.data) || {};
    const today = pkDate(Date.now());
    const at = Date.parse(today + 'T00:00:00Z') - 5 * 3600000 + Math.max(cfg.reminderHour, cfg.summaryHour) * 3600000;
    const { messages, pending } = buildQueue({ ...shop, settings: { ...(shop.settings || {}), waAuto: { ...cfg, enabled: true, maxPerRun: 500 } } }, { baseline: true, sent: {} }, at);
    this.setState({ preview: { messages, pending } });
  };

  set = (k, v) => this.setState(s => ({ cfg: { ...s.cfg, [k]: v }, msg: '' }));

  save = async () => {
    this.setState({ saving: true, msg: '' });
    try {
      const { config } = await this.props.api('/api/automation', { method: 'POST', body: this.state.cfg });
      this.setState({ cfg: config, msg: 'Saved. The shop PC picks it up within 5 minutes.' });
      this.preview(config);
    } catch (e) { this.setState({ msg: e.message }); }
    this.setState({ saving: false });
  };

  runNow = async () => {
    try {
      const r = await this.props.api('/api/whatsapp-status', { method: 'POST', body: { action: 'auto-run' } });
      this.setState({ bot: { ...this.state.bot, last: r.last }, msg: r.last ? `Sent ${r.last.sent}, failed ${r.last.failed}` : 'Nothing to send (or WhatsApp not connected)' });
    } catch (e) { this.setState({ msg: e.message }); }
  };

  render() {
    const { cfg, bot, preview } = this.state;
    if (!cfg) return <div style={{ color: C.mut }}>{this.state.msg || 'Loading…'}</div>;
    const card = { background: '#fff', border: '1px solid ' + C.line, borderRadius: 16, padding: 16, marginBottom: 14 };
    const row = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid ' + C.line };
    const toggle = (k, label, ur) => (
      <label style={row}><input type="checkbox" checked={!!cfg[k]} onChange={e => this.set(k, e.target.checked)} style={{ width: 20, height: 20 }} />
        <span style={{ flex: 1, fontWeight: 600 }}>{label}<span style={{ display: 'block', fontSize: 13, color: C.mut, fontWeight: 400, direction: 'rtl', textAlign: 'left' }}>{ur}</span></span></label>
    );
    const counts = {};
    (preview ? preview.messages : []).forEach(m => { counts[m.kind] = (counts[m.kind] || 0) + 1; });
    const botLine = !bot ? 'Checking…' : bot.error ? 'Bot not reachable from here — it runs on the shop PC (START.bat).'
      : bot.running ? `Running on this server. Last run: ${bot.last ? new Date(bot.last.at).toLocaleString() + ` — sent ${bot.last.sent}, failed ${bot.last.failed}${bot.last.waiting ? `, ${bot.last.waiting} waiting for next run` : ''}` : 'not yet'}`
      : 'Not running here. It starts on the shop PC once WhatsApp is connected.';
    return (
      <div>
        <div style={card}>
          <label style={{ ...row, borderBottom: 'none' }}>
            <input type="checkbox" checked={!!cfg.enabled} onChange={e => this.set('enabled', e.target.checked)} style={{ width: 22, height: 22 }} />
            <span style={{ flex: 1, fontSize: 17, fontWeight: 800 }}>Automatic WhatsApp messages {cfg.enabled ? 'ON' : 'OFF'}</span>
          </label>
          <div style={{ fontSize: 13, color: C.mut }}>{botLine}</div>
        </div>
        <div style={card}>
          {toggle('reminders', 'Due reminders — 3 days before, on the day, 3 days late', 'قسط کی یاد دہانی')}
          {toggle('receipts', 'Receipt when an installment is marked paid', 'ادائیگی کی رسید')}
          {toggle('monthly', 'Monthly statement on the 1st to every active customer', 'ماہانہ حساب')}
          {toggle('ownerSummary', 'Nightly summary to the owner', 'مالک کو روزانہ خلاصہ')}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 12 }}>
            <label style={{ flex: '1 1 200px' }}><div style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>Owner WhatsApp number</div>
              <input value={cfg.ownerPhone} onChange={e => this.set('ownerPhone', e.target.value)} placeholder="03xx xxxxxxx" style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid ' + C.line, boxSizing: 'border-box' }} /></label>
            <label><div style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>Reminders from</div>
              <select value={cfg.reminderHour} onChange={e => this.set('reminderHour', +e.target.value)} style={{ padding: 10, borderRadius: 10 }}>{[8, 9, 10, 11, 12, 14, 16, 18].map(h => <option key={h} value={h}>{h}:00</option>)}</select></label>
            <label><div style={{ fontSize: 12, color: C.mut, fontWeight: 700 }}>Summary at</div>
              <select value={cfg.summaryHour} onChange={e => this.set('summaryHour', +e.target.value)} style={{ padding: 10, borderRadius: 10 }}>{[18, 19, 20, 21, 22, 23].map(h => <option key={h} value={h}>{h}:00</option>)}</select></label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={this.save} disabled={this.state.saving} style={{ padding: '11px 18px', borderRadius: 10, background: C.green, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}>{this.state.saving ? 'Saving…' : 'Save'}</button>
            {bot && bot.running ? <button onClick={this.runNow} style={{ padding: '11px 18px', borderRadius: 10, background: '#fff', border: '1px solid ' + C.line, fontWeight: 700, cursor: 'pointer' }}>Run now</button> : null}
            <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{this.state.msg}</span>
          </div>
        </div>
        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Today's messages (preview)</div>
          <div style={{ fontSize: 12, color: C.mut, marginBottom: 10 }}>What a run today would send with these settings. Ones already sent are skipped by the bot.</div>
          {!preview ? 'Loading…' : !preview.messages.length ? <div style={{ color: C.mut }}>Nothing due today.</div> : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {Object.entries(counts).map(([k, n]) => <span key={k} style={{ background: C.soft, color: C.green, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>{KINDS[k]}: {n}</span>)}
              </div>
              {preview.messages.map(m => (
                <div key={m.key} onClick={() => this.setState({ open: this.state.open === m.key ? null : m.key })} style={{ borderTop: '1px solid ' + C.line, padding: '8px 0', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13 }}><b>{KINDS[m.kind]}</b> → {m.phone}</div>
                  {this.state.open === m.key ? <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, background: '#f4fbf6', padding: 10, borderRadius: 10, marginTop: 6 }}>{m.text}</pre> : null}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }
}

export default function AutomationPage() {
  React.useEffect(() => { window.location.replace('/?r=automation'); }, []);
  return null;
}
