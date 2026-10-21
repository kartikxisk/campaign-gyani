import { describe, it, expect } from 'vitest';
import { AiService } from '../ai.service';

const env = { SMTP_ENC_KEY: '0123456789abcdef0123456789abcdef' };

function service(row: unknown) {
  const prisma = { appSetting: { findUnique: async () => row, upsert: async () => undefined } };
  return new AiService(prisma as any, env as any);
}

describe('AiService without a key', () => {
  it('reports no key and defaults to Claude', async () => {
    const cfg = await service(null).getConfig();
    expect(cfg.provider).toBe('anthropic');
    expect(cfg.hasKey).toBe(false);
  });

  it('refuses to generate before a key is configured', async () => {
    await expect(service(null).generateTemplate('a password reset email')).rejects.toThrow(/API key/i);
  });
});
