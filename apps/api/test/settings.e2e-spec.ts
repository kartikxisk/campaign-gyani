import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';
import { PrismaService } from '../src/prisma/prisma.service';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

describe('settings mode (e2e)', () => {
  let app: INestApplication;
  let agent: TestAgent;
  let csrf: string;
  beforeAll(async () => {
    app = await createTestApp();
    await app.get(PrismaService).appSetting.deleteMany();
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  });
  afterAll(async () => { await app.get(PrismaService).appSetting.deleteMany(); await app?.close(); });

  it('requires auth', async () => {
    expect((await request(app.getHttpServer()).get('/api/settings/mode')).status).toBe(401);
  });

  it('starts unset, can be set once, then is permanent', async () => {
    expect((await agent.get('/api/settings/mode')).body.mode).toBeNull();
    const set = await agent.post('/api/settings/mode').set('x-csrf-token', csrf).send({ mode: 'email' });
    expect(set.status).toBe(201);
    expect((await agent.get('/api/settings/mode')).body.mode).toBe('email');
    const again = await agent.post('/api/settings/mode').set('x-csrf-token', csrf).send({ mode: 'phishing' });
    expect(again.status).toBe(409);
    expect((await agent.get('/api/settings/mode')).body.mode).toBe('email');
  });
});
