'use client';
import { useEffect, useState } from 'react';
export default function OwnerSignIn() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const value = fragment.get('token');
    if (value) {
      window.history.replaceState(null, '', window.location.pathname);
      if (/^[A-Za-z0-9_-]{40,128}$/.test(value)) setToken(value);
      else setError('This sign-in link is invalid. Generate a new owner link.');
    }
  }, []);
  async function signIn() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/owner/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), signal: AbortSignal.timeout(10000) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || 'Sign-in failed.'); setBusy(false); return; }
      setToken(''); window.location.replace('/owner');
    } catch { setError('Sign-in service unavailable. Please retry.'); setBusy(false); }
  }
  return <div className="owner-signin">
    {token ? <button type="button" disabled={busy} onClick={signIn}>{busy?'Signing in…':'Continue →'}</button> : <><h2>Sign in</h2><p>Open <strong>Open-Owner.ps1</strong> on your computer to continue.</p></>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
