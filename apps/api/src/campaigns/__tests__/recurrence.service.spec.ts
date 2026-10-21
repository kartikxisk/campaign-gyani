import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignsService } from '../campaigns.service';
import { RecurrenceService } from '../recurrence.service';

describe('RecurrenceService.runDue', () => {
  const prisma = new PrismaService();
  const campaigns = new CampaignsService(
    prisma,
    { enqueue: async () => undefined } as any,
    { suppressedSet: async () => new Set<string>() } as any,
  );
  const recurrence = new RecurrenceService(prisma, campaigns);

  beforeAll(async () => { await prisma.$connect(); });
  afterEach(async () => {
    await prisma.campaignResult.deleteMany();
    await prisma.campaignTemplate.deleteMany();
    await prisma.campaignGroup.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.target.deleteMany();
    await prisma.targetGroup.deleteMany();
    await prisma.emailTemplate.deleteMany();
    await prisma.landingPage.deleteMany();
    await prisma.sendingProfile.deleteMany();
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('clones + launches a due recurring campaign and advances its next run', async () => {
    const tpl = await prisma.emailTemplate.create({ data: { name: 'T', envelopeSender: 'a@b.com', subject: 'S' } });
    const page = await prisma.landingPage.create({ data: { name: 'L', html: '<form></form>', redirectUrl: 'https://x.com' } });
    const smtp = await prisma.sendingProfile.create({ data: { name: 'P', provider: 'custom', fromAddress: 'a@b.com', host: 'h', port: 587, username: 'u', passwordEnc: 'e' } });
    const group = await prisma.targetGroup.create({ data: { name: 'G' } });
    await prisma.target.create({ data: { groupId: group.id, email: 'a@corp.com' } });
    const past = new Date(Date.now() - 1000);
    const parent = await prisma.campaign.create({
      data: {
        name: 'Weekly drill', status: 'RUNNING', sendByDate: past, repeat: 'WEEKLY', nextRunAt: past,
        landingPageId: page.id, sendingProfileId: smtp.id,
        templates: { create: [{ templateId: tpl.id }] }, groups: { create: [{ groupId: group.id }] },
      },
    });

    const count = await recurrence.runDue(new Date());
    expect(count).toBe(1);

    const children = await prisma.campaign.findMany({ where: { parentId: parent.id } });
    expect(children).toHaveLength(1);
    expect(children[0]!.status).toBe('RUNNING');
    expect(children[0]!.repeat).toBe('NONE');
    const results = await prisma.campaignResult.findMany({ where: { campaignId: children[0]!.id } });
    expect(results).toHaveLength(1);

    // A second immediate run does nothing (nextRunAt already advanced to the future).
    expect(await recurrence.runDue(new Date())).toBe(0);

    const advanced = await prisma.campaign.findUniqueOrThrow({ where: { id: parent.id } });
    expect(advanced.nextRunAt!.getTime()).toBeGreaterThan(past.getTime());
  });
});
