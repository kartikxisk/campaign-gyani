import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

describe('campaigns (e2e)', () => {
  let app: INestApplication;
  let agent: TestAgent;
  let csrf: string;

  beforeAll(async () => {
    app = await createTestApp();
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  });
  afterAll(async () => { await app?.close(); });

  async function buildDeps() {
    const tpl = (await agent.post('/api/templates').set('x-csrf-token', csrf)
      .send({ name: 'T' + Math.random(), envelopeSender: 'a@b.com', subject: 'S', htmlBody: '<p>hi</p>', attachments: [] })).body;
    const page = (await agent.post('/api/landing-pages').set('x-csrf-token', csrf)
      .send({ name: 'L', html: '<form></form>', redirectUrl: 'https://x.com', captureData: false, capturePasswords: false })).body;
    const smtp = (await agent.post('/api/sending-profiles').set('x-csrf-token', csrf)
      .send({ name: 'P', provider: 'custom', fromAddress: 'a@b.com', host: 'h', port: 587, username: 'u', password: 'p', rateLimit: 10, maxConnections: 5, maxMessages: 100, pool: true, ignoreCertErrors: false, headers: [] })).body;
    const group = (await agent.post('/api/groups').set('x-csrf-token', csrf).send({ name: 'G' + Math.random() })).body;
    await agent.post(`/api/groups/${group.id}/targets`).set('x-csrf-token', csrf).send({ email: `t${Math.random()}@corp.com`, firstName: 'T' });
    return { tpl, page, smtp, group };
  }

  it('requires auth', async () => {
    expect((await request(app.getHttpServer()).get('/api/campaigns')).status).toBe(401);
  });

  it('creates, launches, reads results, completes, and toggles the public link', async () => {
    const { tpl, page, smtp, group } = await buildDeps();
    const created = await agent.post('/api/campaigns').set('x-csrf-token', csrf).send({
      name: 'Q4 sim', sendByDate: new Date(Date.now() - 1000).toISOString(),
      templateIds: [tpl.id], pageId: page.id, smtpId: smtp.id, groupIds: [group.id],
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('DRAFT');
    const id = created.body.id;

    const launched = await agent.post(`/api/campaigns/${id}/launch`).set('x-csrf-token', csrf);
    expect(launched.status).toBe(201);
    expect(launched.body.status).toBe('RUNNING');

    const results = await agent.get(`/api/campaigns/${id}/results`);
    expect(results.body.length).toBe(1);

    const dupLaunch = await agent.post(`/api/campaigns/${id}/launch`).set('x-csrf-token', csrf);
    expect(dupLaunch.status).toBe(409);

    const vis = await agent.patch(`/api/campaigns/${id}/visibility`).set('x-csrf-token', csrf).send({ enabled: true });
    expect(vis.body.publicCode).toBeTruthy();

    const done = await agent.post(`/api/campaigns/${id}/complete`).set('x-csrf-token', csrf);
    expect(done.body.status).toBe('COMPLETE');

    expect((await agent.get(`/api/campaigns/${id}/timeline`)).status).toBe(200);
    expect((await agent.delete(`/api/campaigns/${id}`).set('x-csrf-token', csrf)).status).toBe(200);
  });

  it('launches a large campaign without the transaction timing out', async () => {
    const { tpl, page, smtp } = await buildDeps();
    const group = (await agent.post('/api/groups').set('x-csrf-token', csrf).send({ name: 'Big' + Math.random() })).body;
    const N = 8000;
    let csv = 'firstName,lastName,email,position\n';
    for (let i = 0; i < N; i++) csv += `F${i},L${i},scale${i}@load.test,R\n`;
    const imp = await agent.post(`/api/groups/${group.id}/targets/csv`).set('x-csrf-token', csrf)
      .attach('file', Buffer.from(csv), 'targets.csv');
    expect(imp.body.inserted).toBe(N);

    const created = await agent.post('/api/campaigns').set('x-csrf-token', csrf).send({
      name: 'Scale', type: 'email', sendByDate: new Date(Date.now() - 1000).toISOString(),
      templateIds: [tpl.id], pageId: page.id, smtpId: smtp.id, groupIds: [group.id],
    });
    const id = created.body.id;

    const launched = await agent.post(`/api/campaigns/${id}/launch`).set('x-csrf-token', csrf);
    expect(launched.status).toBe(201);
    expect(launched.body.status).toBe('RUNNING');

    const results = await agent.get(`/api/campaigns/${id}/results`);
    expect(results.body.length).toBe(N);

    await agent.delete(`/api/campaigns/${id}`).set('x-csrf-token', csrf);
  }, 30_000);

  it('rejects a multi-template campaign without a shuffle choice', async () => {
    const { tpl, page, smtp, group } = await buildDeps();
    const tpl2 = (await agent.post('/api/templates').set('x-csrf-token', csrf)
      .send({ name: 'T2' + Math.random(), envelopeSender: 'a@b.com', subject: 'S', htmlBody: '<p>hi</p>', attachments: [] })).body;
    const res = await agent.post('/api/campaigns').set('x-csrf-token', csrf).send({
      name: 'multi', sendByDate: new Date().toISOString(),
      templateIds: [tpl.id, tpl2.id], pageId: page.id, smtpId: smtp.id, groupIds: [group.id],
    });
    expect(res.status).toBe(400);
  });
});
