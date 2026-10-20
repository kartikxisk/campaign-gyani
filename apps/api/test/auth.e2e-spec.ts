import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

describe('auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email: EMAIL, password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('rejects /me without a session', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('logs in, reads /me, and blocks a mutation without a csrf token', async () => {
    const agent: TestAgent = request.agent(app.getHttpServer());
    const login = await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.email).toBe(EMAIL);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(EMAIL);

    const noCsrf = await agent.post('/api/auth/change-password').send({ currentPassword: PASSWORD, newPassword: 'whatever123' });
    expect(noCsrf.status).toBe(403);
  });

  it('changes the password with a csrf token, then the old password fails and the new one works', async () => {
    const agent: TestAgent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    const csrf = await agent.get('/api/auth/csrf');
    const token = csrf.body.csrfToken as string;
    expect(token).toBeTruthy();

    const changed = await agent
      .post('/api/auth/change-password')
      .set('x-csrf-token', token)
      .send({ currentPassword: PASSWORD, newPassword: 'newpass456' });
    expect(changed.status).toBe(200);

    const oldFails = await request(app.getHttpServer()).post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    expect(oldFails.status).toBe(401);
    const newWorks = await request(app.getHttpServer()).post('/api/auth/login').send({ email: EMAIL, password: 'newpass456' });
    expect(newWorks.status).toBe(200);

    // restore for idempotent reruns
    const agent2: TestAgent = request.agent(app.getHttpServer());
    await agent2.post('/api/auth/login').send({ email: EMAIL, password: 'newpass456' });
    const csrf2 = await agent2.get('/api/auth/csrf');
    await agent2
      .post('/api/auth/change-password')
      .set('x-csrf-token', csrf2.body.csrfToken as string)
      .send({ currentPassword: 'newpass456', newPassword: PASSWORD });
  });
});
