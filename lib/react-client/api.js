/** Same transport for the isolated Studio preview and the standalone Node app. */
export const embedded = location.pathname.endsWith('/preview') && window.parent !== window;
const pending = new Map();
if (embedded) window.addEventListener('message', event => {
  if (event.source !== window.parent || event.origin !== location.origin || event.data?.kind !== 'bebin-runtime-response') return;
  const request = pending.get(event.data.id);
  if (!request) return;
  pending.delete(event.data.id);
  clearTimeout(request.timer);
  event.data.error ? request.reject(Error(event.data.error)) : request.resolve(event.data.data);
});

export async function api(path, method = 'GET', body) {
  if (embedded) return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => { pending.delete(id); reject(Error('The preview backend did not respond. Please retry.')); }, 45000);
    pending.set(id, {resolve, reject, timer});
    window.parent.postMessage({kind: 'bebin-runtime-request', id, path, method, body}, location.origin);
  });
  const response = await fetch(path, {
    method, credentials: 'same-origin',
    headers: {'Content-Type': 'application/json', 'X-App-Request': '1'},
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let data;
  try { data = await response.json(); } catch { throw Error('The server returned an invalid response. Please retry.'); }
  if (!response.ok) throw Error(data.error || 'Request failed');
  return data;
}
