import React from 'react';
import Head from 'next/head';
import { supabase, getSessionSafe } from '../supabase';

export const C = { green: '#0f6b4b', red: '#b91c1c', amber: '#b45309', ink: '#1a2b1f', mut: '#7a7663', line: '#ece8dc', bg: '#f7f5ef', soft: '#eaf5ee' };

// Shared shell for the add-on pages: same username login as the main app, then
// renders children(api) where api(path, {method, body}) calls our API with the token.
export default class AuthGate extends React.Component {
  state = { user: undefined, u: '', p: '', err: '', busy: false };

  async componentDidMount() {
    const { data: { session } } = await getSessionSafe();
    this.setState({ user: session ? session.user : null });
  }

  api = async (path, { method = 'GET', body } = {}) => {
    const { data: { session } } = await getSessionSafe();
    const r = await fetch(path, {
      method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session ? session.access_token : '') },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Request failed (' + r.status + ')');
    return j;
  };

  signIn = async () => {
    const u = this.state.u.trim().toLowerCase();
    if (!u || !this.state.p) { this.setState({ err: 'Enter username and password' }); return; }
    this.setState({ busy: true, err: '' });
    const email = u.includes('@') ? u : u + '@aqsaat.local';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: this.state.p + '.Aqsat9' });
    if (error) { this.setState({ busy: false, err: 'Wrong username or password' }); return; }
    this.setState({ busy: false, p: '', user: data.user });
  };

  signOut = async () => { await supabase.auth.signOut(); this.setState({ user: null }); };

  render() {
    const { title } = this.props;
    const { user } = this.state;
    const inp = { width: '100%', border: '1.5px solid ' + C.line, borderRadius: 12, padding: '12px 14px', fontSize: 15, background: '#fdfcf8', outline: 'none', boxSizing: 'border-box', marginBottom: 10 };
    const onKey = e => { if (e.key === 'Enter') this.signIn(); };
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.ink, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <Head><title>{title}</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
        {user === undefined ? <div style={{ padding: 40, textAlign: 'center', color: C.mut }}>Loading…</div>
          : user === null ? (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 20, padding: 24, border: '1px solid ' + C.line }}>
                <div style={{ fontSize: 20, fontWeight: 800, textAlign: 'center' }}>{title}</div>
                <div style={{ fontSize: 13, color: C.mut, textAlign: 'center', marginBottom: 20 }}>Sign in with your shop account</div>
                <input type="text" autoCapitalize="none" autoCorrect="off" placeholder="Username" value={this.state.u} onChange={e => this.setState({ u: e.target.value, err: '' })} onKeyDown={onKey} style={inp} />
                <input type="password" placeholder="Password" value={this.state.p} onChange={e => this.setState({ p: e.target.value, err: '' })} onKeyDown={onKey} style={inp} />
                {this.state.err ? <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 10, textAlign: 'center' }}>{this.state.err}</div> : null}
                <button onClick={this.signIn} disabled={this.state.busy} style={{ width: '100%', padding: 13, borderRadius: 12, background: this.state.busy ? C.mut : C.green, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>{this.state.busy ? 'Signing in…' : 'Sign in'}</button>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <a href="/" style={{ color: C.green, fontWeight: 700, textDecoration: 'none' }}>← Aqsaat</a>
                <div style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>{title}</div>
                <button onClick={this.signOut} style={{ background: 'none', border: '1px solid ' + C.line, borderRadius: 8, padding: '6px 10px', color: C.mut, cursor: 'pointer' }}>Sign out</button>
              </div>
              {this.props.children(this.api, user)}
            </div>
          )}
      </div>
    );
  }
}
