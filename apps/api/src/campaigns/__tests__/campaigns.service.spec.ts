import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignsService } from '../campaigns.service';
import type { SendJob, SendQueue } from '../../sending/send-queue.port';

class FakeQueue implements SendQueue {
  jobs: SendJob[] = [];
  async enqueue(jobs: SendJob[]): Promise<void> {
    this.jobs.push(...jobs);
  }
}

describe('CampaignsService.launch', () => {
  const prisma = new PrismaService();
  const queue = new FakeQueue();
  const service = new CampaignsService(prisma, queue, { getMode: async () => 'phishing' } as any);

  beforeAll(async () => { await prisma.$connect(); });
  afterEach(async () => {
    queue.jobs = [];
    await prisma.campaignEvent.deleteMany();
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

  async function fixture() {
    const tpl = await prisma.emailTemplate.create({ data: { name: 'T', envelopeSender: 'a@b.com', subject: 'S' } });
    const page = await prisma.landingPage.create({ data: { name: 'L', html: '<form></form>', redirectUrl: 'https://x.com' } });
    const smtp = await prisma.sendingProfile.create({ data: { name: 'P', provider: 'custom', fromAddress: 'a@b.com', host: 'h', port: 587, username: 'u', passwordEnc: 'e' } });
    const group = await prisma.targetGroup.create({ data: { name: 'G' } });
    await prisma.target.createMany({ data: [
      { groupId: group.id, email: 'a@corp.com', firstName: 'A' },
      { groupId: group.id, email: 'b@corp.com', firstName: 'B' },
    ] });
    return { tpl, page, smtp, group };
  }

  it('snapshots one result + enqueues one job per unique target and transitions status', async () => {
    const { tpl, page, smtp, group } = await fixture();
    const campaign = await service.create({
      name: 'C', sendByDate: new Date(Date.now() - 1000).toISOString(),
      templateIds: [tpl.id], pageId: page.id, smtpId: smtp.id, groupIds: [group.id],
    });
    expect(campaign.status).toBe('DRAFT');

    const launched = await service.launch(campaign.id);
    expect(launched.status).toBe('RUNNING'); // sendByDate in the past
    const results = await prisma.campaignResult.findMany({ where: { campaignId: campaign.id } });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.templateId === tpl.id)).toBe(true);
    expect(results.every((r) => r.rid.length > 10)).toBe(true);
    expect(queue.jobs).toHaveLength(2);
  });

  it('refuses to launch a campaign twice', async () => {
    const { tpl, page, smtp, group } = await fixture();
    const campaign = await service.create({
      name: 'C', sendByDate: new Date(Date.now() - 1000).toISOString(),
      templateIds: [tpl.id], pageId: page.id, smtpId: smtp.id, groupIds: [group.id],
    });
    await service.launch(campaign.id);
    await expect(service.launch(campaign.id)).rejects.toThrow();
  });

  it('schedules a future campaign without marking it running', async () => {
    const { tpl, page, smtp, group } = await fixture();
    const campaign = await service.create({
      name: 'C', sendByDate: new Date(Date.now() + 3_600_000).toISOString(),
      templateIds: [tpl.id], pageId: page.id, smtpId: smtp.id, groupIds: [group.id],
    });
    const launched = await service.launch(campaign.id);
    expect(launched.status).toBe('SCHEDULED');
  });

  it('toggles a public code on and off', async () => {
    const { tpl, page, smtp, group } = await fixture();
    const campaign = await service.create({
      name: 'C', sendByDate: new Date().toISOString(),
      templateIds: [tpl.id], pageId: page.id, smtpId: smtp.id, groupIds: [group.id],
    });
    const on = await service.setVisibility(campaign.id, true);
    expect(on.publicCode).toBeTruthy();
    const off = await service.setVisibility(campaign.id, false);
    expect(off.publicCode).toBeNull();
  });
});
