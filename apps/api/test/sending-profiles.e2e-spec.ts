import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';
const profile = {
  name: 'Primary', provider: 'custom', fromAddress: 'noreply@x.com', host: 'smtp.x.com', port: 587,
  username: 'u', password: 'p', rateLimit: 10, maxConnections: 5, maxMessages: 100, pool: true,
  ignoreCertErrors: false, headers: [],
};

async function authed(app: INestApplication): Promise<{ agent: TestAgent; csrf: string }> {
  const agent: TestAgent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
  const csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  return { agent, csrf };
}

describe('sending-profiles (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app?.close(); });

  it('requires auth', async () => {
    expect((await request(app.getHttpServer()).get('/api/sending-profiles')).status).toBe(401);
  });

  it('exposes provider presets', async () => {
    const { agent } = await authed(app);
    const res = await agent.get('/api/sending-profiles/providers');
    expect(res.body.gmail.port).toBe(587);
  });

  it('creates, reads (no password), updates and deletes a profile', async () => {
    const { agent, csrf } = await authed(app);
    const created = await agent.post('/api/sending-profiles').set('x-csrf-token', csrf).send(profile);
    expect(created.status).toBe(201);
    expect(created.body.passwordEnc).toBeUndefined();
    const id = created.body.id;

    const got = await agent.get(`/api/sending-profiles/${id}`);
    expect(got.body.name).toBe('Primary');
    expect(got.body.passwordEnc).toBeUndefined();

    const upd = await agent.put(`/api/sending-profiles/${id}`).set('x-csrf-token', csrf).send({ ...profile, name: 'Renamed', password: '' });
    expect(upd.body.name).toBe('Renamed');

    const del = await agent.delete(`/api/sending-profiles/${id}`).set('x-csrf-token', csrf);
    expect(del.status).toBe(200);
  });

  it('rejects a test send to a non-SMTP port or private host', async () => {
    const { agent, csrf } = await authed(app);
    const badPort = await agent.post('/api/sending-profiles/test').set('x-csrf-token', csrf)
      .send({ host: 'smtp.example.com', port: 8080, username: 'u', password: 'p', fromAddress: 'a@b.com', to: 'v@b.com' });
    expect(badPort.status).toBe(400);
    const privateHost = await agent.post('/api/sending-profiles/test').set('x-csrf-token', csrf)
      .send({ host: '127.0.0.1', port: 587, username: 'u', password: 'p', fromAddress: 'a@b.com', to: 'v@b.com' });
    expect(privateHost.status).toBe(400);
  });

  it('requires the password to be re-entered when the host changes', async () => {
    const { agent, csrf } = await authed(app);
    const created = await agent.post('/api/sending-profiles').set('x-csrf-token', csrf).send(profile);
    const id = created.body.id;
    const res = await agent.put(`/api/sending-profiles/${id}`).set('x-csrf-token', csrf)
      .send({ ...profile, host: 'smtp.changed.com', password: '' });
    expect(res.status).toBe(400);
    await agent.delete(`/api/sending-profiles/${id}`).set('x-csrf-token', csrf);
  });

  it('returns a structured error when a test send hits an unreachable host', async () => {
    const { agent, csrf } = await authed(app);
    // A resolvable public host on an allowed SMTP port that refuses/time-outs.
    const res = await agent
      .post('/api/sending-profiles/test')
      .set('x-csrf-token', csrf)
      .send({ host: 'example.com', port: 2525, username: 'u', password: 'p', fromAddress: 'a@b.com', to: 'victim@b.com' });
    expect(res.status).toBe(502);
    expect(res.body.message).toBe('SMTP send failed');
  });
});
