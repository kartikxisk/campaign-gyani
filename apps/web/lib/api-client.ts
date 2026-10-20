export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

let csrfToken: string | null = null;

async function fetchCsrf(): Promise<string> {
  const res = await fetch('/api/auth/csrf', { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, 'Not authenticated');
  const data = (await res.json()) as { csrfToken: string };
  csrfToken = data.csrfToken;
  return data.csrfToken;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (MUTATING.has(method)) {
    if (!csrfToken) await fetchCsrf();
    if (csrfToken) headers.set('x-csrf-token', csrfToken);
    if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  }
  let res = await fetch(`/api${path}`, { ...init, method, headers, credentials: 'include' });
  // One retry on a stale CSRF token.
  if (res.status === 403 && MUTATING.has(method)) {
    await fetchCsrf();
    if (csrfToken) headers.set('x-csrf-token', csrfToken);
    res = await fetch(`/api${path}`, { ...init, method, headers, credentials: 'include' });
  }
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = undefined; }
    const msg = (body as { message?: string | string[] } | undefined)?.message;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : (msg ?? res.statusText), body);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  return (ct.includes('application/json') ? await res.json() : await res.text()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  clearCsrf: () => { csrfToken = null; },
};
