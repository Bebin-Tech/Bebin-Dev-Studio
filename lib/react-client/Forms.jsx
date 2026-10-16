import {useState} from 'react';
import {api} from './api.js';

export function Contact({emailConfigured, notify, onChanged}) {
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    try {
      const result = await api('/api/contact', 'POST', values);
      form.reset(); onChanged();
      notify(result.message + (result.notification === 'failed' ? ' Email notification failed; your inquiry is saved.' : ''));
    } catch (error) { notify(error.message, true); }
    finally { setBusy(false); }
  }
  return <section id="contact" className="workspace-card"><p className="eyebrow">GET IN TOUCH</p><h2>Start a conversation</h2><p>Your inquiry is saved to the database.{emailConfigured ? ' Email notifications are configured.' : ''}</p>
    <form id="contact-form" className="record-form" onSubmit={submit}>
      <label>Name<input name="name" required maxLength={80} autoComplete="name" /></label>
      <label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label className="full">Message<textarea name="message" required maxLength={2000} /></label>
      <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Send message'}</button>
    </form></section>;
}

export function Assistant({enabled, user, notify, onChanged}) {
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const prompt = new FormData(event.currentTarget).get('prompt');
    setBusy(true);
    try { const result = await api('/api/ai', 'POST', {prompt}); setAnswer(result.answer); onChanged(); }
    catch (error) { notify(error.message, true); }
    finally { setBusy(false); }
  }
  return <section className="workspace-card"><h2>AI assistant</h2><p>{enabled ? 'Backend integration is configured.' : 'Set GROQ_API_KEY on the downloaded app server to enable AI.'}</p><form onSubmit={submit}>
    <label>Your question<textarea name="prompt" minLength={3} maxLength={4000} required /></label>
    <button className="primary" disabled={!enabled || !user || busy}>{busy ? 'Thinking…' : 'Ask assistant'}</button>
  </form><p className="answer" aria-live="polite">{answer}</p></section>;
}
