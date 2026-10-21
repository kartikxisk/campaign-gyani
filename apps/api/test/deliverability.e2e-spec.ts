import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

describe('deliverability (e2e)', () => {
  let app: INestApplication;
  let agent: TestAgent;
  let csrf: string;
  beforeAll(async () => {
    app = await createTestApp();
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: 'admin@test.local', password: 'testpass123' });
    csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  });
  afterAll(async () => { await app?.close(); });

  it('requires auth', async () => {
    expect((await request(app.getHttpServer()).post('/api/deliverability/content').send({})).status).toBe(401);
  });

  it('scores spammy content higher than clean content', async () => {
    const clean = await agent.post('/api/deliverability/content').set('x-csrf-token', csrf)
      .send({ subject: 'Monthly report', html: '<p>Hi {{.FirstName}}. {{.UnsubscribeURL}}</p>', text: 'Hi' });
    const spammy = await agent.post('/api/deliverability/content').set('x-csrf-token', csrf)
      .send({ subject: 'WINNER ACT NOW', html: '<p>CLICK HERE for your FREE prize</p>', text: '' });
    expect(clean.body.level).toBe('low');
    expect(spammy.body.score).toBeGreaterThan(clean.body.score);
    expect(Array.isArray(spammy.body.reasons)).toBe(true);
  });

  it('rejects a malformed domain', async () => {
    const res = await agent.post('/api/deliverability/domain').set('x-csrf-token', csrf).send({ domain: 'not a domain' });
    expect(res.status).toBe(400);
  });
});
