// PostgreSQL API client.
// Uses httpOnly cookies via credentials:'include'; falls back to localStorage
// token + x-physio-token header for environments that block third-party cookies.
import { apiEndpoint, apiToken } from './backend';

const ENDPOINT = apiEndpoint;
const TOKEN_KEY = 'physio_token_fallback';

export function getStoredToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function storeToken(t: string) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures; cookie auth may still work.
  }
}

export async function api<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
      ...(token ? { 'x-physio-token': token } : {}),
    },
    body: JSON.stringify({ action, ...payload, ...(token ? { _token: token } : {}) }),
  });
  const data = await res.json().catch(() => ({ error: 'Invalid response' }));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  if (data?.token) storeToken(data.token);
  return data as T;
}

export function clearToken() { storeToken(''); }
