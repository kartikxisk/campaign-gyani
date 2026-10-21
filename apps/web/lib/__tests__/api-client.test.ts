import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, ApiError } from '../api-client';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

afterEach(() => vi.unstubAllGlobals());

describe('api error messages', () => {
  it('formats zod issue objects instead of "[object Object]"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(400, {
      statusCode: 400, error: 'Bad Request',
      message: [{ path: 'email', message: 'Invalid email' }, { path: '', message: 'Required' }],
    })));
    const err = await api.get('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('email: Invalid email, Required');
  });

  it('keeps plain string and string-array messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(400, { message: ['a', 'b'] })));
    expect(((await api.get('/x').catch((e: unknown) => e)) as ApiError).message).toBe('a, b');
    vi.stubGlobal('fetch', vi.fn(async () => json(409, { message: 'Already exists' })));
    expect(((await api.get('/x').catch((e: unknown) => e)) as ApiError).message).toBe('Already exists');
  });
});
