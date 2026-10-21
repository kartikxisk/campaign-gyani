import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

async function authed(app: INestApplication) {
  const agent: TestAgent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/login').send({ email: 'admin@test.local', password: 'testpass123' });
  const csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  return { agent, csrf };
}

describe('ai config (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app?.close(); });

  it('requires auth', async () => {
    expect((await request(app.getHttpServer()).get('/api/ai/config')).status).toBe(401);
  });

  it('exposes providers and never returns the stored key', async () => {
    const { agent, csrf } = await authed(app);
    const initial = await agent.get('/api/ai/config');
    expect(initial.body.providers.map((p: { id: string }) => p.id).sort()).toEqual(['anthropic', 'google', 'openai']);

    const upd = await agent.put('/api/ai/config').set('x-csrf-token', csrf)
      .send({ provider: 'openai', model: 'gpt-4o', apiKey: 'sk-secret-test-key' });
    expect(upd.status).toBe(200);
    expect(upd.body.provider).toBe('openai');
    expect(upd.body.model).toBe('gpt-4o');
    expect(upd.body.hasKey).toBe(true);
    expect(JSON.stringify(upd.body)).not.toContain('sk-secret-test-key');

    const after = await agent.get('/api/ai/config');
    expect(after.body.hasKey).toBe(true);
    expect(JSON.stringify(after.body)).not.toContain('sk-secret-test-key');
  });

  it('switching provider without a model falls back to that provider default', async () => {
    const { agent, csrf } = await authed(app);
    await agent.put('/api/ai/config').set('x-csrf-token', csrf).send({ provider: 'openai', model: 'gpt-4o', apiKey: 'k' });
    const upd = await agent.put('/api/ai/config').set('x-csrf-token', csrf).send({ provider: 'anthropic' });
    expect(upd.body.model).toBe('claude-opus-5-5');
  });
});
