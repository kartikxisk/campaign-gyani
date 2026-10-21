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

// Validation errors arrive as zod issues ({ path, message }), not strings.
type Issue = { path?: string; message?: string };
const issueText = (i: string | Issue): string =>
  typeof i === 'string' ? i : i.path ? `${i.path}: ${i.message ?? 'invalid'}` : (i.message ?? 'invalid');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (MUTATING.has(method)) {
    // The CSRF token requires a session; before login there is none, and login
    // is CSRF-exempt — so a failed pre-flight must not block the request.
    if (!csrfToken) { try { await fetchCsrf(); } catch { /* not authenticated yet */ } }
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
  // Session expired mid-use: bounce to login (except for the auth endpoints,
  // which handle their own 401s — login errors, the /me probe).
  if (res.status === 401 && !path.startsWith('/auth/') && typeof window !== 'undefined') {
    csrfToken = null;
    // Drop the (now invalid) session cookie server-side so /login doesn't loop.
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => {
      window.location.href = '/login';
    });
  }
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = undefined; }
    const msg = (body as { message?: string | Array<string | Issue> } | undefined)?.message;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.map(issueText).join(', ') : (msg ?? res.statusText), body);
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
