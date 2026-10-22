import { describe, it, expect } from 'vitest';
import { ConfigStoreService } from '../config.service';

function svc(stored: Record<string, unknown> | null) {
  const prisma = { appSetting: { findUnique: async () => (stored ? { config: stored } : null) } };
  return new ConfigStoreService(prisma as any);
}

describe('publicBaseUrl resolver', () => {
  it('throws when it is not configured', async () => {
    await expect(svc(null).publicBaseUrl()).rejects.toThrow(/not configured/i);
    await expect(svc({ publicBaseUrl: '' }).publicBaseUrl()).rejects.toThrow(/not configured/i);
    await expect(svc({ publicBaseUrl: '   ' }).publicBaseUrl()).rejects.toThrow(/not configured/i);
  });

  it('returns the admin-configured URL without a trailing slash', async () => {
    expect(await svc({ publicBaseUrl: 'https://sim.yourco.com' }).publicBaseUrl()).toBe('https://sim.yourco.com');
    expect(await svc({ publicBaseUrl: 'https://sim.yourco.com/' }).publicBaseUrl()).toBe('https://sim.yourco.com');
  });
});
