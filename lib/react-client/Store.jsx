import {useEffect, useState} from 'react';
import {api} from './api.js';

export default function Store({currency, user, notify, version, onChanged}) {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api('/api/products').then(data => { if (active) setProducts(data.items); }).catch(problem => { if (active) setError(problem.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version, retry]);
  const money = value => new Intl.NumberFormat(undefined,{style:'currency',currency}).format(value);
  const items = products.filter(product => cart[product.id]).map(product => ({product, quantity:cart[product.id]}));
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const delivery = new FormData(event.currentTarget).get('delivery');
    setBusy(true);
    try {
      const result = await api('/api/orders', 'POST', {items:items.map(({product,quantity}) => ({id:product.id,quantity})),delivery});
      setCart({}); onChanged(); notify('Order ' + result.id.slice(0,8) + ' saved. Payment remains unpaid.');
    } catch (problem) { notify(problem.message, true); }
    finally { setBusy(false); }
  }
  return <section id="store" className="workspace-card"><p className="eyebrow">COLLECTION</p><h2>Shop the collection</h2>
    <label>Filter products<input type="search" placeholder="Search products or category" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {error ? <p role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></p> : loading ? <p>Loading catalog…</p> : <div className="product-grid">{products.filter(product => [product.name,product.description,product.category].join(' ').toLowerCase().includes(query.toLowerCase())).map(product => <article className="product" key={product.id}>
      <span className="product-art" aria-hidden="true">◈</span><p className="eyebrow">{product.category || 'Collection'}</p><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price)}</strong>
      <button className="primary" disabled={busy} onClick={() => { if ((cart[product.id] || 0) >= 99) return notify('Maximum quantity reached',true); setCart(value => ({...value,[product.id]:(value[product.id] || 0) + 1})); notify('Added to cart.'); }}>Add to cart</button>
    </article>)}</div>}
    {!loading && !error && !products.length ? <p>{user?.role === 'admin' ? 'Your catalog is empty. Open Manage app, select Products, and add your first product.' : 'No products are available yet.'}</p> : null}
    <div className="cart"><h3>Your cart</h3>{items.map(({product,quantity}) => <p key={product.id}>{product.name} × {quantity} <button className="quiet" onClick={() => setCart(value => { const next = {...value}; delete next[product.id]; return next; })}>Remove</button></p>)}<strong>{money(total)}</strong><p>Orders are saved to the database. Online payments are not configured.</p>
      <form onSubmit={submit}><label>Delivery instructions<textarea name="delivery" minLength={5} maxLength={1000} required /></label><button className="primary" disabled={!items.length || !user || busy}>{busy ? 'Submitting…' : 'Submit unpaid order'}</button></form>{!user ? <p>Sign in through Manage app to submit an order.</p> : null}
    </div>
  </section>;
}
