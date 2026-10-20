import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

async function authed(app: INestApplication): Promise<{ agent: TestAgent; csrf: string }> {
  const agent: TestAgent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
  const csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  return { agent, csrf };
}

describe('assets (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('requires authentication to upload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/assets')
      .attach('file', Buffer.from('logo-bytes'), 'logo.png');
    expect(res.status).toBe(401);
  });

  it('uploads a file and serves it back at its URL', async () => {
    const { agent, csrf } = await authed(app);
    const up = await agent
      .post('/api/assets')
      .set('x-csrf-token', csrf)
      .field('kind', 'logo')
      .attach('file', Buffer.from('logo-bytes'), 'logo.png');
    expect(up.status).toBe(201);
    expect(up.body.url).toContain('/api/assets/file/');
    expect(up.body.kind).toBe('logo');

    const path = new URL(up.body.url).pathname;
    const fetched = await request(app.getHttpServer()).get(path);
    expect(fetched.status).toBe(200);
    expect(fetched.body.toString()).toBe('logo-bytes');

    const list = await agent.get('/api/assets');
    expect(list.body.some((a: { id: string }) => a.id === up.body.id)).toBe(true);

    const del = await agent.delete(`/api/assets/${up.body.id}`).set('x-csrf-token', csrf);
    expect(del.status).toBe(200);
  });
});
