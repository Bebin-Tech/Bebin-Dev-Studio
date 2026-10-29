import {useEffect, useState} from 'react';
import {api} from './api.js';
import {initialFieldValue, recordValues} from './record-values.js';

function RecordEditor({module, record, onSave, onCancel, notify}) {
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const values = recordValues(module.fields, raw);
    setBusy(true);
    try { await api('/api/records/' + module.name + (record?.id ? '/' + record.id : ''), record?.id ? 'PUT' : 'POST', values); onSave(); }
    catch (error) { notify(error.message, true); }
    finally { setBusy(false); }
  }
  return <form className="record-form" onSubmit={submit}>
    <h3 className="full">{record?.id ? 'Edit' : 'Add'} {module.label}</h3>
    {module.fields.map(field => <label key={field.name}>{field.label}
      {field.type === 'select' || field.type === 'boolean' ? <select name={field.name} required={field.required} defaultValue={initialFieldValue(field, record?.[field.name])}>
        {!field.required ? <option value="">Not set</option> : null}
        {(field.type === 'boolean' ? ['true', 'false'] : field.options).map(option => <option key={option} value={option}>{field.type === 'boolean' ? option === 'true' ? 'Yes' : 'No' : option}</option>)}
      </select> : field.type === 'text' && /content|notes|description|message/.test(field.name) ? <textarea name={field.name} maxLength={2000} required={field.required} defaultValue={record?.[field.name] ?? ''} /> : <input name={field.name} type={['email','number','date'].includes(field.type) ? field.type : 'text'} step={field.type === 'number' ? 'any' : undefined} maxLength={2000} required={field.required} defaultValue={record?.[field.name] ?? ''} />}
    </label>)}
    <div className="full"><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save record'}</button> <button type="button" className="quiet" disabled={busy} onClick={onCancel}>Cancel</button></div>
  </form>;
}

const systemFields = {
  orders: [{name:'status',label:'Status'},{name:'totalMinor',label:'Amount (minor units)'},{name:'delivery',label:'Delivery'}],
  submissions: [{name:'name',label:'Name'},{name:'email',label:'Email'},{name:'message',label:'Message'},{name:'notification',label:'Notification'}],
  ai_history: [{name:'prompt',label:'Prompt'},{name:'answer',label:'Answer'}]
};
const text = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);

export default function Records({module, moduleName, notify, version, onChanged}) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({items:[], total:0, pageSize:25});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  useEffect(() => { const timer = setTimeout(() => { setSearch(query); setPage(1); }, 250); return () => clearTimeout(timer); }, [query]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api('/api/records/' + moduleName + '?page=' + page + '&q=' + encodeURIComponent(search)).then(data => {
      if (!active) return;
      if (!data.items.length && data.total > 0 && page > 1) setPage(value => value - 1);
      else setResult(data);
    }).catch(problem => { if (active) setError(problem.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [moduleName, page, search, refresh, version]);
  const fields = module?.fields || systemFields[moduleName] || [];
  function saved() { setEditing(null); setRefresh(value => value + 1); onChanged(); notify('Record saved to the database.'); }
  async function remove(record) {
    if (!confirm('Delete this record permanently?')) return;
    setBusyId(record.id);
    try { await api('/api/records/' + moduleName + '/' + record.id, 'DELETE'); setRefresh(value => value + 1); onChanged(); notify('Record deleted.'); }
    catch (problem) { notify(problem.message, true); }
    finally { setBusyId(null); }
  }
  return <>
    <div className="module-toolbar"><label className="search-label">Search records<input type="search" maxLength={100} placeholder="Search this module…" value={query} onChange={event => setQuery(event.target.value)} /></label>{module ? <button className="primary" onClick={() => setEditing({})}>Add record</button> : null}</div>
    {editing ? <RecordEditor key={editing.id || 'new'} module={module} record={editing} onSave={saved} onCancel={() => setEditing(null)} notify={notify} /> : null}
    <div id="record-list" aria-live="polite" aria-busy={loading}>
      {error ? <p role="alert">{error} <button onClick={() => setRefresh(value => value + 1)}>Retry</button></p> : loading ? <p>Loading records…</p> : result.items.length ? <div className="table-scroll"><table><thead><tr>{fields.map(field => <th key={field.name}>{field.label}</th>)}<th>Updated</th>{module ? <th>Actions</th> : null}</tr></thead><tbody>{result.items.map(record => <tr key={record.id}>{fields.map(field => <td key={field.name}>{text(record[field.name])}</td>)}<td>{new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(record.updated))}</td>{module ? <td><div className="row-actions"><button onClick={() => setEditing(record)}>Edit</button><button className="danger" disabled={busyId === record.id} onClick={() => remove(record)}>Delete</button></div></td> : null}</tr>)}</tbody></table></div> : <div className="empty-state"><h3>No records yet</h3><p>Add your first record. Data is saved on the server.</p></div>}
    </div>
    <div className="pagination"><span>{result.total} records · Page {page}</span><div><button disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button><button disabled={page * result.pageSize >= result.total || loading} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
  </>;
}
