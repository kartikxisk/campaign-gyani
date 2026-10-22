import { describe, it, expect } from 'vitest';
import { ConfigStoreService } from '../config.service';

function svc(stored: Record<string, unknown> | null, envUrl: string) {
  const prisma = { appSetting: { findUnique: async () => (stored ? { config: stored } : null) } };
  return new ConfigStoreService(prisma as any, { PUBLIC_BASE_URL: envUrl } as any);
}

describe('publicBaseUrl resolver', () => {
  it('falls back to the env default when no override is set', async () => {
    expect(await svc(null, 'https://env.example.com').publicBaseUrl()).toBe('https://env.example.com');
    expect(await svc({ publicBaseUrl: '' }, 'https://env.example.com').publicBaseUrl()).toBe('https://env.example.com');
  });

  it('uses the admin override when set', async () => {
    expect(await svc({ publicBaseUrl: 'https://sim.yourco.com' }, 'https://env.example.com').publicBaseUrl()).toBe('https://sim.yourco.com');
  });

  it('strips a trailing slash', async () => {
    expect(await svc({ publicBaseUrl: 'https://sim.yourco.com/' }, 'https://env.example.com').publicBaseUrl()).toBe('https://sim.yourco.com');
  });
});
