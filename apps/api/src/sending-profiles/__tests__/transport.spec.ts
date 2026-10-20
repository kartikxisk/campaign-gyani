import { describe, it, expect } from 'vitest';
import { buildTransport, PROVIDER_PRESETS } from '../../mail/transport.factory';
import { encryptSecret } from '../../auth/crypto.util';

const KEY = '0123456789abcdef0123456789abcdef';

describe('transport factory', () => {
  it('exposes provider presets matching the spec', () => {
    expect(PROVIDER_PRESETS.gmail).toMatchObject({ port: 587, rateLimit: 5, maxConnections: 5, maxMessages: 100 });
    expect(PROVIDER_PRESETS.ses).toMatchObject({ rateLimit: 14, maxConnections: 10 });
    expect(PROVIDER_PRESETS.sendgrid.rateLimit).toBe(50);
  });

  it('builds a pooled transport with the profile limits and decrypted password', () => {
    const profile = {
      host: 'smtp.example.com',
      port: 587,
      username: 'user',
      passwordEnc: encryptSecret('smtp-secret', KEY),
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 10,
      ignoreCertErrors: true,
    };
    const t = buildTransport(profile, KEY);
    const opts = t.options as Record<string, any>;
    expect(opts.pool).toBe(true);
    expect(opts.maxConnections).toBe(5);
    expect(opts.maxMessages).toBe(100);
    expect(opts.host).toBe('smtp.example.com');
    expect(opts.auth.user).toBe('user');
    expect(opts.auth.pass).toBe('smtp-secret');
    expect(opts.tls.rejectUnauthorized).toBe(false);
  });
});
