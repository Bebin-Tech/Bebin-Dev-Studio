import {useState} from 'react';
import {api} from './api.js';

export default function Account({name, signup, onSignedIn, notify}) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    try { const result = await api('/api/auth/' + (register ? 'register' : 'login'), 'POST', values); onSignedIn(result.user); }
    catch (error) { notify(error.message, true); }
    finally { setBusy(false); }
  }
  return <section className="auth-card">
    <p className="eyebrow">YOUR ACCOUNT</p><h2>Welcome to {name}</h2><p>Sign in to securely manage your data.</p>
    <form id="account-form" onSubmit={submit}>
      {register ? <label>Name<input name="name" autoComplete="name" maxLength={80} required /></label> : null}
      <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={12} maxLength={128} required /></label>
      <button className="primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
    </form>
    {signup ? <button className="quiet" disabled={busy} onClick={() => setRegister(value => !value)}>{register ? 'I already have an account' : 'Create an account'}</button> : null}
    <p className="small">Passwords are hashed on the server. Sessions use protected cookies in the downloaded app.</p>
  </section>;
}
