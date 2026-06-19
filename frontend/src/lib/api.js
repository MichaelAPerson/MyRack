const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin', // send the session cookie - explicit in case this is ever served cross-origin
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // auth
  getMe: () => request('/auth/me'),
  setup: (username, password) => request('/auth/setup', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getVersion: () => request('/version'),

  getDevices: () => request('/devices'),
  createDevice: (name) => request('/devices', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteDevice: (id) => request(`/devices/${id}`, { method: 'DELETE' }),
  rotateKey: (id) => request(`/devices/${id}/rotate-key`, { method: 'POST' }),
  getMetrics: (id, limit = 60) => request(`/devices/${id}/metrics?limit=${limit}`),

  getWidgets: () => request('/widgets'),
  createWidget: (widget) => request('/widgets', { method: 'POST', body: JSON.stringify(widget) }),
  updateWidget: (id, patch) => request(`/widgets/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteWidget: (id) => request(`/widgets/${id}`, { method: 'DELETE' }),
};
