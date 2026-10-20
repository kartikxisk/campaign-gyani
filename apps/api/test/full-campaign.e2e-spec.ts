import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

/** The whole product loop over HTTP: build → launch → simulate events → report. */
describe('full campaign loop (e2e)', () => {
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

  it('drives build → launch → open/click/submit/report → funnel + public report + csv', async () => {
    const h = (body: unknown) => body;
    const tpl = (await agent.post('/api/templates').set('x-csrf-token', csrf).send(h({ name: 'Full ' + Math.random(), envelopeSender: 'IT <it@b.com>', subject: 'Hello {{.FirstName}}', htmlBody: '<p>Hi {{.FirstName}} <a href="https://bank.test">verify</a></p>', attachments: [] }))).body;
    const page = (await agent.post('/api/landing-pages').set('x-csrf-token', csrf).send({ name: 'Full L', html: '<form><input name="username"/><input name="password" type="password"/></form>', redirectUrl: 'https://real.example.com', captureData: true, capturePasswords: false })).body;
    const smtp = (await agent.post('/api/sending-profiles').set('x-csrf-token', csrf).send({ name: 'Full P', provider: 'custom', fromAddress: 'it@b.com', host: 'h', port: 587, username: 'u', password: 'p', rateLimit: 10, maxConnections: 5, maxMessages: 100, pool: true, ignoreCertErrors: false, headers: [] })).body;
    const group = (await agent.post('/api/groups').set('x-csrf-token', csrf).send({ name: 'Full G ' + Math.random() })).body;
    await agent.post(`/api/groups/${group.id}/targets`).set('x-csrf-token', csrf).send({ email: 'ada@corp.com', firstName: 'Ada' });

    const campaign = (await agent.post('/api/campaigns').set('x-csrf-token', csrf).send({
      name: 'Full loop', sendByDate: new Date(Date.now() - 1000).toISOString(),
      templateIds: [tpl.id], pageId: page.id, smtpId: smtp.id, groupIds: [group.id],
    })).body;
    await agent.post(`/api/campaigns/${campaign.id}/launch`).set('x-csrf-token', csrf);

    const results = (await agent.get(`/api/campaigns/${campaign.id}/results`)).body;
    expect(results).toHaveLength(1);
    const rid = results[0].rid;

    // Simulate the victim journey (public, unauthenticated).
    expect((await request(app.getHttpServer()).get(`/api/t/o/${rid}`)).status).toBe(200);
    expect((await request(app.getHttpServer()).get(`/api/t/c/${rid}`).redirects(0)).status).toBe(302);
    const view = await request(app.getHttpServer()).get(`/api/t/view/${rid}`);
    expect(view.body.html).toContain(`/api/t/s/${rid}`);
    expect((await request(app.getHttpServer()).post(`/api/t/s/${rid}`).type('form').send({ username: 'ada', password: 'hunter2' }).redirects(0)).status).toBe(302);

    // Before the recipient reports it: a full catch.
    const before = (await agent.get(`/api/campaigns/${campaign.id}/report`)).body;
    expect(before.opened).toBe(1);
    expect(before.clicked).toBe(1);
    expect(before.submitted).toBe(1);
    expect(before.reported).toBe(0);
    expect(before.successRate).toBe(100);

    // The campaigns LIST shows the same event-based counts as the report.
    const list = (await agent.get('/api/campaigns?query=Full%20loop&limit=50')).body;
    const listed = list.rows.find((c: { id: string }) => c.id === campaign.id);
    expect(listed.counts.OPENED).toBe(1);
    expect(listed.counts.CLICKED).toBe(1);
    expect(listed.counts.SUBMITTED).toBe(1);

    // Reporting the mail cancels the catch.
    expect((await request(app.getHttpServer()).get(`/api/t/r/${rid}`)).status).toBe(200);
    const report = (await agent.get(`/api/campaigns/${campaign.id}/report`)).body;
    expect(report.reported).toBe(1);
    expect(report.successRate).toBe(0);

    // Public report enabled → reachable, anonymized.
    await agent.patch(`/api/campaigns/${campaign.id}/visibility`).set('x-csrf-token', csrf).send({ enabled: true });
    const code = (await agent.get(`/api/campaigns/${campaign.id}`)).body.publicCode;
    const pub = await request(app.getHttpServer()).get(`/api/public/campaigns/${code}`);
    expect(pub.body.counts.submitted).toBe(1);
    const pubResults = await request(app.getHttpServer()).get(`/api/public/campaigns/${code}/results`);
    expect(JSON.stringify(pubResults.body)).not.toContain('ada@corp.com');

    // CSV export has the recipient row; the password was never captured.
    const csvResults = await agent.get(`/api/campaigns/${campaign.id}/export/results.csv`);
    expect(csvResults.text).toContain('ada@corp.com');
    const timeline = await agent.get(`/api/campaigns/${campaign.id}/timeline`);
    const submitted = timeline.body.find((e: { type: string }) => e.type === 'SUBMITTED');
    expect(submitted.payload.username).toBe('ada');
    expect(submitted.payload.password).toBeUndefined();
  });
});
