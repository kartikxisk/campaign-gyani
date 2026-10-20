import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';
import { PrismaService } from '../src/prisma/prisma.service';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

describe('webhooks suppress (e2e)', () => {
  let app: INestApplication;
  let agent: TestAgent;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await prisma.suppression.deleteMany();
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
  });
  afterAll(async () => { await prisma.suppression.deleteMany(); await app?.close(); });

  it('rejects a POST without a valid token', async () => {
    const res = await request(app.getHttpServer()).post('/api/webhooks/suppress?token=wrong').send({ email: 'x@y.com' });
    expect(res.status).toBe(403);
  });

  it('exposes a signed URL and suppresses via it', async () => {
    const info = await agent.get('/api/webhooks/token');
    expect(info.body.url).toContain('/api/webhooks/suppress?token=');
    const url = new URL(info.body.url);
    const token = url.searchParams.get('token')!;

    const res = await request(app.getHttpServer()).post(`/api/webhooks/suppress?token=${token}`).send({ email: 'Bounced@corp.com', reason: 'bounce' });
    expect(res.status).toBe(200);
    const row = await prisma.suppression.findUnique({ where: { email: 'bounced@corp.com' } });
    expect(row?.reason).toBe('bounce');
  });
});
