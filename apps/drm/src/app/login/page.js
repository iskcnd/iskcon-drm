'use client';

import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // An empty or non-JSON body means the server crashed, or the request never
      // reached it (wrong domain, DNS, proxy). Say so instead of leaking a
      // confusing JSON.parse error.
      const text = await r.text();
      let j;
      try {
        j = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned ${r.status} with no readable response. `
          + 'Check the deploy logs, and confirm you are on the correct domain.');
      }
      if (!r.ok) throw new Error(j.error || `Sign in failed (${r.status})`);
      const next = new URLSearchParams(window.location.search).get('next') || '/';
      window.location.href = next;
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <div className="loginwrap">
      <form className="loginbox" onSubmit={submit}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ISKCON Chennai" className="login-logo" width={344} height={338} />
        <h1>Devotee Relationship Management</h1>
        <p className="s">Sign in to continue</p>
        {err && <div className="errbox">{err}</div>}
        <div className="fg">
          <label>Email</label>
          <input
            type="email"
            value={email}
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="fg">
          <label>Password</label>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="p" style={{ width: '100%', padding: '9px' }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
