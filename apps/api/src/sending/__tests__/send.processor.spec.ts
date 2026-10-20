import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { RenderService } from '../../render/render.service';
import { SendProcessor } from '../send.processor';
import { Circuit } from '../circuit';
import type { Mailer, OutgoingMessage } from '../mailer';
import type { SendingProfile } from '@prisma/client';

class FakeMailer implements Mailer {
  public sent: OutgoingMessage[] = [];
  constructor(private readonly behavior: 'ok' | 'fail') {}
  async send(_profile: SendingProfile, msg: OutgoingMessage): Promise<{ messageId: string }> {
    if (this.behavior === 'fail') throw new Error('connection refused');
    this.sent.push(msg);
    return { messageId: 'mid-1' };
  }
}

describe('SendProcessor.deliver', () => {
  const prisma = new PrismaService();
  const render = new RenderService({ PUBLIC_BASE_URL: 'https://pub.example.com', SESSION_SECRET: 'test-secret-session-key-123456' } as never);

  beforeAll(async () => { await prisma.$connect(); });
  afterEach(async () => {
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

  async function makeResult() {
    const tpl = await prisma.emailTemplate.create({ data: { name: 'T', envelopeSender: 'IT <it@b.com>', subject: 'Hi {{.FirstName}}', htmlBody: '<p>Hi {{.FirstName}} <a href="https://bank.test">go</a></p>' } });
    const smtp = await prisma.sendingProfile.create({ data: { name: 'P', provider: 'custom', fromAddress: 'it@b.com', host: 'smtp.sender.test', port: 587, username: 'u', passwordEnc: 'e' } });
    const page = await prisma.landingPage.create({ data: { name: 'L', html: '<form></form>', redirectUrl: 'https://x.com' } });
    const campaign = await prisma.campaign.create({ data: { name: 'C', status: 'RUNNING', sendByDate: new Date(), sendingProfileId: smtp.id, landingPageId: page.id, templates: { create: [{ templateId: tpl.id }] } } });
    const result = await prisma.campaignResult.create({ data: { campaignId: campaign.id, templateId: tpl.id, email: 'ada@corp.com', firstName: 'Ada', rid: 'RID1' } });
    return { result, smtp };
  }

  it('sends and marks the result SENT with a SENT event', async () => {
    const mailer = new FakeMailer('ok');
    const proc = new SendProcessor(prisma, render, mailer, new Circuit());
    const { result } = await makeResult();
    await proc.deliver(result.id, 1, 3);
    const after = await prisma.campaignResult.findUniqueOrThrow({ where: { id: result.id }, include: { events: true } });
    expect(after.status).toBe('SENT');
    expect(after.events.some((e) => e.type === 'SENT')).toBe(true);
    expect(mailer.sent[0]?.html).toContain('Hi Ada');
    expect(mailer.sent[0]?.html).toContain('/api/t/c/RID1'); // link rewritten
    expect(mailer.sent[0]?.html).toContain('/api/t/o/RID1'); // pixel injected
  });

  it('marks the result ERROR on the final attempt when sending fails', async () => {
    const proc = new SendProcessor(prisma, render, new FakeMailer('fail'), new Circuit());
    const { result } = await makeResult();
    await proc.deliver(result.id, 3, 3); // final attempt
    const after = await prisma.campaignResult.findUniqueOrThrow({ where: { id: result.id } });
    expect(after.status).toBe('ERROR');
    expect(after.error).toContain('connection refused');
  });

  it('rethrows (for retry) on a non-final failed attempt without marking ERROR', async () => {
    const proc = new SendProcessor(prisma, render, new FakeMailer('fail'), new Circuit());
    const { result } = await makeResult();
    await expect(proc.deliver(result.id, 1, 3)).rejects.toThrow();
    const after = await prisma.campaignResult.findUniqueOrThrow({ where: { id: result.id } });
    expect(after.status).not.toBe('ERROR');
  });

  it('does not send for a completed campaign', async () => {
    const mailer = new FakeMailer('ok');
    const proc = new SendProcessor(prisma, render, mailer, new Circuit());
    const { result } = await makeResult();
    await prisma.campaign.updateMany({ data: { status: 'COMPLETE' } });
    await proc.deliver(result.id, 1, 3);
    expect(mailer.sent).toHaveLength(0);
    const after = await prisma.campaignResult.findUniqueOrThrow({ where: { id: result.id } });
    expect(after.status).toBe('SCHEDULED');
  });

  it('skips sending when the host breaker is open', async () => {
    const circuit = new Circuit({ threshold: 1, cooldownMs: 60_000 });
    circuit.recordFailure('smtp.sender.test');
    const mailer = new FakeMailer('ok');
    const proc = new SendProcessor(prisma, render, mailer, circuit);
    const { result } = await makeResult();
    await expect(proc.deliver(result.id, 1, 3)).rejects.toThrow();
    expect(mailer.sent).toHaveLength(0);
  });
});
