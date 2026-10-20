import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, encryptSecret, decryptSecret } from '../crypto.util';

const KEY = '0123456789abcdef0123456789abcdef';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const h = await hashPassword('s3cret-pass');
    expect(await verifyPassword(h, 's3cret-pass')).toBe(true);
  });
  it('rejects a wrong password', async () => {
    const h = await hashPassword('s3cret-pass');
    expect(await verifyPassword(h, 'wrong')).toBe(false);
  });
});

describe('secret encryption', () => {
  it('round-trips a secret', () => {
    const ct = encryptSecret('smtp-password', KEY);
    expect(ct).not.toContain('smtp-password');
    expect(decryptSecret(ct, KEY)).toBe('smtp-password');
  });
  it('produces different ciphertext each time (random IV)', () => {
    expect(encryptSecret('x', KEY)).not.toBe(encryptSecret('x', KEY));
  });
});
