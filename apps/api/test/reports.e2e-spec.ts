import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

describe('reports (e2e)', () => {
  let app: INestApplication;
  let agent: TestAgent;
  let csrf: string;
  let campaignId: string;
  let rid: string;

  beforeAll(async () => {
    app = await createTestApp();
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;

    const tpl = (await agent.post('/api/templates').set('x-csrf-token', csrf).send({ name: 'T' + Math.random(), envelopeSender: 'a@b.com', subject: 'S', htmlBody: '<p>hi</p>', attachments: [] })).body;
    const page = (await agent.post('/api/landing-pages').set('x-csrf-token', csrf).send({ name: 'L', html: '<form></form>', redirectUrl: 'https://x.com', captureData: true, capturePasswords: false })).body;
    const smtp = (await agent.post('/api/sending-profiles').set('x-csrf-token', csrf).send({ name: 'P', provider: 'custom', fromAddress: 'a@b.com', host: 'h', port: 587, username: 'u', password: 'p', rateLimit: 10, maxConnections: 5, maxMessages: 100, pool: true, ignoreCertErrors: false, headers: [] })).body;
    const group = (await agent.post('/api/groups').set('x-csrf-token', csrf).send({ name: 'G' + Math.random() })).body;
    await agent.post(`/api/groups/${group.id}/targets`).set('x-csrf-token', csrf).send({ email: 'r@corp.com', firstName: 'R' });
    campaignId = (await agent.post('/api/campaigns').set('x-csrf-token', csrf).send({ name: 'rep', sendByDate: new Date(Date.now() - 1000).toISOString(), templateIds: [tpl.id], pageId: page.id, smtpId: smtp.id, groupIds: [group.id] })).body.id;
    await agent.post(`/api/campaigns/${campaignId}/launch`).set('x-csrf-token', csrf);
    rid = (await agent.get(`/api/campaigns/${campaignId}/results`)).body.rows[0].rid;
    // simulate open + click
    await request(app.getHttpServer()).get(`/api/t/o/${rid}`);
    await request(app.getHttpServer()).get(`/api/t/c/${rid}`).redirects(0);
  });
  afterAll(async () => { await app?.close(); });

  it('requires auth for the dashboard', async () => {
    expect((await request(app.getHttpServer()).get('/api/reports/dashboard')).status).toBe(401);
  });

  it('returns dashboard totals and event counts', async () => {
    const res = await agent.get('/api/reports/dashboard');
    expect(res.body.totals.campaigns).toBeGreaterThanOrEqual(1);
    expect(res.body.phishing.opened).toBeGreaterThanOrEqual(1);
    expect(res.body.phishing.clicked).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.phishing.successRate).toBe('number');
    expect(typeof res.body.email.openRate).toBe('number');
  });

  it('exports results and events CSV with headers and one data row', async () => {
    const results = await agent.get(`/api/campaigns/${campaignId}/export/results.csv`);
    expect(results.headers['content-type']).toContain('text/csv');
    expect(results.text.split('\n')[0]).toContain('Email');
    expect(results.text.trimEnd().split('\n')).toHaveLength(2); // header + 1 target
    const events = await agent.get(`/api/campaigns/${campaignId}/export/events.csv`);
    expect(events.text.split('\n')[0]).toContain('Type');
  });

  it('exports a campaigns summary CSV', async () => {
    const res = await agent.get('/api/reports/campaigns.csv');
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text.split('\n')[0]).toContain('Success %');
    expect(res.text).toContain('rep');
  });

  it('serves a public report by code without admin fields, 404 on a bad code', async () => {
    await agent.patch(`/api/campaigns/${campaignId}/visibility`).set('x-csrf-token', csrf).send({ enabled: true });
    const code = (await agent.get(`/api/campaigns/${campaignId}`)).body.publicCode;
    const pub = await request(app.getHttpServer()).get(`/api/public/campaigns/${code}`);
    expect(pub.status).toBe(200);
    expect(pub.body.name).toBe('rep');
    expect(pub.body.mode).toBeDefined();
    expect(pub.body.counts.opened).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(pub.body)).not.toContain('passwordEnc');

    const pubResults = await request(app.getHttpServer()).get(`/api/public/campaigns/${code}/results`);
    expect(JSON.stringify(pubResults.body)).not.toContain('@corp.com'); // no email leak

    expect((await request(app.getHttpServer()).get('/api/public/campaigns/wrong-code')).status).toBe(404);
  });
});
