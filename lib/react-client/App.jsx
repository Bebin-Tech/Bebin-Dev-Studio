import {useEffect, useState} from 'react';
import {api, embedded} from './api.js';
import Account from './Account.jsx';
import Records from './Records.jsx';
import Store from './Store.jsx';
import {Contact, Assistant} from './Forms.jsx';

export default function App() {
  const [spec, setSpec] = useState(() => JSON.parse(document.getElementById('application-spec').textContent));
  const [configuration, setConfiguration] = useState(null);
  const [user, setUser] = useState(null);
  const [startupError, setStartupError] = useState('');
  const [retry, setRetry] = useState(0);
  const [activeModule, setActiveModule] = useState('');
  const [notice, setNotice] = useState({message:'',error:false});
  const [version, setVersion] = useState(0);
  const [managementOpen, setManagementOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const notify = (message,error = false) => setNotice({message,error});
  const changed = () => setVersion(value => value + 1);
  useEffect(() => {
    let active = true;
    setStartupError('');
    Promise.all([api('/api/config'),api('/api/auth/me')]).then(([config,account]) => {
      if (!active) return;
      const model = config.spec || spec;
      setSpec(model); setConfiguration(config); setUser(account.user);
      setActiveModule(account.user?.role !== 'admin' && model.type === 'storefront' ? 'orders' : model.collections[0].name);
    }).catch(error => { if (active) setStartupError(error.message); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => { document.title = spec.name; document.documentElement.style.setProperty('--accent',spec.accent); }, [spec.name,spec.accent]);
  if (startupError) return <main><h1>Unable to connect to the backend</h1><p role="alert">{startupError}</p><button onClick={() => setRetry(value => value + 1)}>Retry</button></main>;
  if (!configuration) return <main><p role="status">Connecting to your application…</p></main>;
  const modules = [...spec.collections.filter(module => module.name !== 'products' || user?.role === 'admin'),...(user?.role === 'admin' ? [{name:'submissions',label:'Inquiries'}] : []),...(spec.type === 'storefront' ? [{name:'orders',label:'Orders'}] : []),...(spec.integrations.includes('ai') ? [{name:'ai_history',label:'AI history'}] : [])];
  function signedIn(account) {
    setUser(account); setActiveModule(account.role === 'admin' ? spec.collections[0].name : spec.collections.find(module => module.name !== 'products')?.name || 'orders'); notify('Signed in securely.');
  }
  async function signOut() {
    setSigningOut(true);
    try { await api('/api/auth/logout','POST',{}); setUser(null); notify('Signed out.'); }
    catch (error) { notify(error.message,true); }
    finally { setSigningOut(false); }
  }
  const workspace = <section id="workspace" className="workspace-card">{user ? <>
    <div className="workspace-header"><div><p className="eyebrow">{user.role} WORKSPACE</p><h2>Hello, {user.name}</h2></div><span className="state">● Connected</span></div>
    <div className="module-nav" role="group" aria-label="Data modules">{modules.map(module => <button key={module.name} aria-pressed={module.name === activeModule} onClick={() => setActiveModule(module.name)}>{module.label}</button>)}</div>
    <Records key={activeModule} moduleName={activeModule} module={spec.collections.find(module => module.name === activeModule)} notify={notify} version={version} onChanged={changed} />
  </> : <Account name={spec.name} signup={configuration.signup} onSignedIn={signedIn} notify={notify} />}</section>;
  return <>
    <header className="app-header"><a href="#home" className="brand"><span className="brand-symbol" aria-hidden="true">◈</span>{spec.name}</a><nav>
      <a href="#workspace" onClick={() => setManagementOpen(true)}>{spec.type === 'web app' ? 'Workspace' : 'Manage app'}</a>{spec.type === 'storefront' ? <a href="#store">Store</a> : null}<a href="#contact">Contact</a>{user ? <button className="quiet" disabled={signingOut} onClick={signOut}>Sign out</button> : null}
    </nav></header>
    <main id="home"><section className="app-hero"><p className="eyebrow">{spec.type} · REACT + DATABASE CONNECTED</p><h1>{spec.name}</h1><p>{spec.description}</p><div className="capabilities"><span>React frontend</span><span>Persistent data</span><span>Secure accounts</span><span>Server APIs</span></div></section>
      <p id="app-notice" role="status" aria-live="polite" data-error={notice.error}>{notice.message}</p>
      {spec.type === 'storefront' ? <Store currency={spec.currency} user={user} notify={notify} version={version} onChanged={changed} /> : null}
      {spec.type === 'web app' ? workspace : <details id="management" className="management-panel" open={managementOpen} onToggle={event => setManagementOpen(event.currentTarget.open)}><summary>Manage application</summary>{workspace}</details>}
      {spec.integrations.includes('ai') ? <Assistant enabled={configuration.integrations.ai} user={user} notify={notify} onChanged={changed} /> : null}
      <Contact emailConfigured={configuration.integrations.email} notify={notify} onChanged={changed} />
      <footer>{spec.name} · Independent React application{embedded ? ' · Isolated backend preview' : ''}</footer>
    </main>
  </>;
}
