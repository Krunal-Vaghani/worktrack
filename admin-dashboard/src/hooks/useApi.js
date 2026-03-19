// src/hooks/useApi.js
// Centralised fetch wrapper with JWT auth

const BASE = '/api';

function getToken() {
  return localStorage.getItem('wt_token') || '';
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('wt_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    (path, body)   => apiFetch(path, { method: 'PUT',   body: JSON.stringify(body) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),

  // Auth — uses userId not email (consistent with EXE)
  login: (userId, password) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    }).then(r => r.json()),
};

export default api;
