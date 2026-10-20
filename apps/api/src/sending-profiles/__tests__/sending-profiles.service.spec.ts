import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { SendingProfilesService } from '../sending-profiles.service';

const KEY = '0123456789abcdef0123456789abcdef';
const base = {
  name: 'P', provider: 'custom' as const, fromAddress: 'a@b.com', host: 'smtp.x.com', port: 587,
  username: 'u', password: 'plaintext-secret', rateLimit: 10, maxConnections: 5, maxMessages: 100,
  pool: true, ignoreCertErrors: false, headers: [],
};

describe('SendingProfilesService', () => {
  const prisma = new PrismaService();
  const service = new SendingProfilesService(prisma, { SMTP_ENC_KEY: KEY } as any);

  beforeAll(async () => { await prisma.$connect(); });
  afterEach(async () => { await prisma.sendingProfile.deleteMany(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it('stores the password encrypted, never in plaintext', async () => {
    const created = await service.create(base);
    const raw = await prisma.sendingProfile.findUniqueOrThrow({ where: { id: created.id } });
    expect(raw.passwordEnc).not.toContain('plaintext-secret');
    expect(raw.passwordEnc.split('.')).toHaveLength(3);
  });

  it('never returns the password in read results', async () => {
    const created = await service.create(base);
    expect((created as any).passwordEnc).toBeUndefined();
    expect((created as any).password).toBeUndefined();
    expect(created.hasPassword).toBe(true);
    const fetched = await service.findOne(created.id);
    expect((fetched as any).passwordEnc).toBeUndefined();
  });

  it('keeps the stored password when update passes an empty password', async () => {
    const created = await service.create(base);
    const before = await prisma.sendingProfile.findUniqueOrThrow({ where: { id: created.id } });
    await service.update(created.id, { ...base, password: '' });
    const after = await prisma.sendingProfile.findUniqueOrThrow({ where: { id: created.id } });
    expect(after.passwordEnc).toBe(before.passwordEnc);
  });
});
