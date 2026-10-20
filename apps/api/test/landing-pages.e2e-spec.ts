import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';
const page = { name: 'Login clone', html: '<form><input name="u"/></form>', redirectUrl: 'https://real.example.com', captureData: true, capturePasswords: true };

async function authed(app: INestApplication) {
  const agent: TestAgent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
  const csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  return { agent, csrf };
}

describe('landing-pages (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app?.close(); });

  it('requires auth', async () => {
    expect((await request(app.getHttpServer()).get('/api/landing-pages')).status).toBe(401);
  });

  it('rejects a non-url redirect', async () => {
    const { agent, csrf } = await authed(app);
    const res = await agent.post('/api/landing-pages').set('x-csrf-token', csrf).send({ ...page, redirectUrl: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('forces capturePasswords off when captureData is off', async () => {
    const { agent, csrf } = await authed(app);
    const res = await agent.post('/api/landing-pages').set('x-csrf-token', csrf).send({ ...page, captureData: false, capturePasswords: true });
    expect(res.status).toBe(201);
    expect(res.body.capturePasswords).toBe(false);
    await agent.delete(`/api/landing-pages/${res.body.id}`).set('x-csrf-token', csrf);
  });

  it('creates, fetches, updates and deletes', async () => {
    const { agent, csrf } = await authed(app);
    const created = await agent.post('/api/landing-pages').set('x-csrf-token', csrf).send(page);
    expect(created.status).toBe(201);
    expect(created.body.capturePasswords).toBe(true);
    const id = created.body.id;
    expect((await agent.get(`/api/landing-pages/${id}`)).body.name).toBe('Login clone');
    const upd = await agent.put(`/api/landing-pages/${id}`).set('x-csrf-token', csrf).send({ ...page, name: 'Clone v2' });
    expect(upd.body.name).toBe('Clone v2');
    expect((await agent.delete(`/api/landing-pages/${id}`).set('x-csrf-token', csrf)).status).toBe(200);
  });
});
