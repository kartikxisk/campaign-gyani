import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

describe('tracking (e2e, public)', () => {
  let app: INestApplication;
  let agent: TestAgent;
  let csrf: string;
  let rid: string;
  let campaignId: string;

  beforeAll(async () => {
    app = await createTestApp();
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;

    const tpl = (await agent.post('/api/templates').set('x-csrf-token', csrf)
      .send({ name: 'T' + Math.random(), envelopeSender: 'a@b.com', subject: 'S', htmlBody: '<p>hi</p>', attachments: [] })).body;
    const page = (await agent.post('/api/landing-pages').set('x-csrf-token', csrf)
      .send({ name: 'L', html: '<form><input name="username"/><input name="password" type="password"/></form>', redirectUrl: 'https://real.example.com', captureData: true, capturePasswords: false })).body;
    const smtp = (await agent.post('/api/sending-profiles').set('x-csrf-token', csrf)
      .send({ name: 'P', provider: 'custom', fromAddress: 'a@b.com', host: 'h', port: 587, username: 'u', password: 'p', rateLimit: 10, maxConnections: 5, maxMessages: 100, pool: true, ignoreCertErrors: false, headers: [] })).body;
    const group = (await agent.post('/api/groups').set('x-csrf-token', csrf).send({ name: 'G' + Math.random() })).body;
    await agent.post(`/api/groups/${group.id}/targets`).set('x-csrf-token', csrf).send({ email: 'victim@corp.com', firstName: 'Vic' });
    campaignId = (await agent.post('/api/campaigns').set('x-csrf-token', csrf).send({
      name: 'track', sendByDate: new Date(Date.now() - 1000).toISOString(),
      templateIds: [tpl.id], pageId: page.id, smtpId: smtp.id, groupIds: [group.id],
    })).body.id;
    await agent.post(`/api/campaigns/${campaignId}/launch`).set('x-csrf-token', csrf);
    rid = (await agent.get(`/api/campaigns/${campaignId}/results`)).body[0].rid;
  });
  afterAll(async () => { await app?.close(); });

  it('returns a pixel for an unknown rid without leaking or erroring', async () => {
    const res = await request(app.getHttpServer()).get('/api/t/o/nonexistent');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/gif');
  });

  it('404s click/submit/report for an unknown rid', async () => {
    expect((await request(app.getHttpServer()).get('/api/t/c/nope')).status).toBe(404);
    expect((await request(app.getHttpServer()).post('/api/t/s/nope').send({ a: 1 })).status).toBe(404);
    expect((await request(app.getHttpServer()).get('/api/t/r/nope')).status).toBe(404);
  });

  it('records open, click, submit (dropping the password) and report, no auth needed', async () => {
    expect((await request(app.getHttpServer()).get(`/api/t/o/${rid}`)).status).toBe(200);

    const click = await request(app.getHttpServer()).get(`/api/t/c/${rid}`).redirects(0);
    expect(click.status).toBe(302);
    expect(click.headers.location).toContain(`/v/${rid}`);

    const view = await request(app.getHttpServer()).get(`/api/t/view/${rid}`);
    expect(view.body.html).toContain(`/api/t/s/${rid}`); // form points at submit

    const submit = await request(app.getHttpServer()).post(`/api/t/s/${rid}`).type('form').send({ username: 'vic', password: 'hunter2' }).redirects(0);
    expect(submit.status).toBe(302);
    expect(submit.headers.location).toBe('https://real.example.com');

    expect((await request(app.getHttpServer()).get(`/api/t/r/${rid}`)).status).toBe(200);

    // verify via admin timeline: SUBMITTED event has username but not password
    const timeline = await agent.get(`/api/campaigns/${campaignId}/timeline`);
    const submitted = timeline.body.find((e: { type: string }) => e.type === 'SUBMITTED');
    expect(submitted.payload.username).toBe('vic');
    expect(submitted.payload.password).toBeUndefined();
    expect(timeline.body.some((e: { type: string }) => e.type === 'OPENED')).toBe(true);
    expect(timeline.body.some((e: { type: string }) => e.type === 'CLICKED')).toBe(true);
    expect(timeline.body.some((e: { type: string }) => e.type === 'REPORTED')).toBe(true);
  });

  it('rejects an oversized submit body (capture endpoint is unauthenticated)', async () => {
    const big = 'x'.repeat(70 * 1024);
    const res = await request(app.getHttpServer()).post(`/api/t/s/${rid}`)
      .set('content-type', 'application/json').send({ username: big }).redirects(0);
    expect(res.status).toBe(413);
  });

  it('bounds the number of captured fields a forged submit can persist', async () => {
    const body: Record<string, string> = {};
    for (let i = 0; i < 200; i++) body[`field${i}`] = 'v';
    const res = await request(app.getHttpServer()).post(`/api/t/s/${rid}`).type('form').send(body).redirects(0);
    expect(res.status).toBe(302);
    const timeline = await agent.get(`/api/campaigns/${campaignId}/timeline`);
    const submits = timeline.body.filter((e: { type: string }) => e.type === 'SUBMITTED');
    const latest = submits[submits.length - 1];
    expect(Object.keys(latest.payload).length).toBeLessThanOrEqual(50);
  });
});
