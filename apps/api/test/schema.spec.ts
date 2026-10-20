import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';

describe('prisma schema', () => {
  const prisma = new PrismaService();

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.campaignEvent.deleteMany();
    await prisma.campaignResult.deleteMany();
    await prisma.campaignTemplate.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.target.deleteMany();
    await prisma.targetGroup.deleteMany();
    await prisma.emailTemplate.deleteMany();
    await prisma.landingPage.deleteMany();
    await prisma.sendingProfile.deleteMany();
    await prisma.asset.deleteMany();
  });

  it('creates a full campaign graph and reads it back', async () => {
    const profile = await prisma.sendingProfile.create({
      data: { name: 'P', provider: 'custom', fromAddress: 'a@b.com', host: 'h', port: 587, username: 'u', passwordEnc: 'enc' },
    });
    const template = await prisma.emailTemplate.create({
      data: { name: 'T', envelopeSender: 'A <a@b.com>', subject: 'S' },
    });
    const landing = await prisma.landingPage.create({
      data: { name: 'L', html: '<form></form>', redirectUrl: 'https://x.com' },
    });
    const group = await prisma.targetGroup.create({ data: { name: 'G' } });
    const target = await prisma.target.create({
      data: { groupId: group.id, email: 't@b.com', firstName: 'T', lastName: 'B', position: 'Dev' },
    });
    const campaign = await prisma.campaign.create({
      data: {
        name: 'C',
        sendByDate: new Date(),
        landingPageId: landing.id,
        sendingProfileId: profile.id,
        templates: { create: [{ templateId: template.id }] },
      },
    });
    const result = await prisma.campaignResult.create({
      data: { campaignId: campaign.id, targetId: target.id, email: target.email, rid: 'rid-1' },
    });
    await prisma.campaignEvent.create({ data: { resultId: result.id, type: 'SENT' } });

    const loaded = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaign.id },
      include: { templates: true, results: { include: { events: true } }, landingPage: true, sendingProfile: true },
    });
    expect(loaded.status).toBe('DRAFT');
    expect(loaded.templates).toHaveLength(1);
    expect(loaded.results[0]?.events[0]?.type).toBe('SENT');
    expect(loaded.landingPage?.id).toBe(landing.id);
  });

  it('enforces unique email per group but allows the same email in another group', async () => {
    const g1 = await prisma.targetGroup.create({ data: { name: 'G1' } });
    const g2 = await prisma.targetGroup.create({ data: { name: 'G2' } });
    await prisma.target.create({ data: { groupId: g1.id, email: 'dup@b.com' } });
    await expect(
      prisma.target.create({ data: { groupId: g1.id, email: 'dup@b.com' } }),
    ).rejects.toThrow();
    const ok = await prisma.target.create({ data: { groupId: g2.id, email: 'dup@b.com' } });
    expect(ok.id).toBeTruthy();
  });
});
