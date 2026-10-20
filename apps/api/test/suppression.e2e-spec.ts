import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';
import { PrismaService } from '../src/prisma/prisma.service';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

describe('suppression + unsubscribe (email mode, e2e)', () => {
  let app: INestApplication;
  let agent: TestAgent;
  let csrf: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await prisma.appSetting.deleteMany();
    await prisma.suppression.deleteMany();
    await prisma.appSetting.create({ data: { id: 'app', mode: 'email', setAt: new Date() } });
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  });
  afterAll(async () => {
    await prisma.appSetting.deleteMany();
    await prisma.suppression.deleteMany();
    await app?.close();
  });

  it('adds, lists and removes a suppression', async () => {
    const add = await agent.post('/api/suppressions').set('x-csrf-token', csrf).send({ email: 'Bob@Corp.com' });
    expect(add.status).toBe(201);
    expect(add.body.email).toBe('bob@corp.com'); // normalized
    const list = await agent.get('/api/suppressions');
    expect(list.body.rows.some((r: { email: string }) => r.email === 'bob@corp.com')).toBe(true);
    await agent.delete(`/api/suppressions/${add.body.id}`).set('x-csrf-token', csrf);
    const list2 = await agent.get('/api/suppressions');
    expect(list2.body.rows.some((r: { email: string }) => r.email === 'bob@corp.com')).toBe(false);
  });

  it('skips suppressed recipients at launch and unsubscribe adds to the list', async () => {
    const tpl = (await agent.post('/api/templates').set('x-csrf-token', csrf).send({ name: 'E' + Math.random(), envelopeSender: 'a@b.com', subject: 'S', htmlBody: '<p>hi</p>', attachments: [] })).body;
    const smtp = (await agent.post('/api/sending-profiles').set('x-csrf-token', csrf).send({ name: 'P', provider: 'custom', fromAddress: 'a@b.com', host: 'h', port: 587, username: 'u', password: 'p', rateLimit: 10, maxConnections: 5, maxMessages: 100, pool: true, ignoreCertErrors: false, headers: [] })).body;
    const group = (await agent.post('/api/groups').set('x-csrf-token', csrf).send({ name: 'G' + Math.random() })).body;
    await agent.post(`/api/groups/${group.id}/targets`).set('x-csrf-token', csrf).send({ email: 'keep@corp.com', firstName: 'K' });
    await agent.post(`/api/groups/${group.id}/targets`).set('x-csrf-token', csrf).send({ email: 'drop@corp.com', firstName: 'D' });
    // suppress one
    await agent.post('/api/suppressions').set('x-csrf-token', csrf).send({ email: 'drop@corp.com' });

    const campaign = (await agent.post('/api/campaigns').set('x-csrf-token', csrf).send({
      name: 'Email send', sendByDate: new Date(Date.now() - 1000).toISOString(),
      templateIds: [tpl.id], smtpId: smtp.id, groupIds: [group.id],
    })).body;
    expect(campaign.status).toBe('DRAFT'); // no landing required in email mode
    await agent.post(`/api/campaigns/${campaign.id}/launch`).set('x-csrf-token', csrf);
    const results = (await agent.get(`/api/campaigns/${campaign.id}/results`)).body;
    expect(results).toHaveLength(1);
    expect(results[0].email).toBe('keep@corp.com');

    // unsubscribe via the public link adds the email to suppression
    const rid = results[0].rid;
    const unsub = await request(app.getHttpServer()).get(`/api/t/u/${rid}`);
    expect(unsub.status).toBe(200);
    expect(unsub.text).toContain('unsubscribed');
    const supp = await prisma.suppression.findUnique({ where: { email: 'keep@corp.com' } });
    expect(supp?.reason).toBe('unsubscribe');
  });
});
