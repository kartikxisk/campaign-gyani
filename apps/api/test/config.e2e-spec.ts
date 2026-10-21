import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';
import { PrismaService } from '../src/prisma/prisma.service';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

describe('config (e2e)', () => {
  let app: INestApplication;
  let agent: TestAgent;
  let csrf: string;
  beforeAll(async () => {
    app = await createTestApp();
    await app.get(PrismaService).appSetting.updateMany({ data: { config: undefined } });
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  });
  afterAll(async () => { await app?.close(); });

  it('exposes defaults publicly and updates with auth', async () => {
    const pub = await request(app.getHttpServer()).get('/api/config');
    expect(pub.status).toBe(200);
    expect(pub.body.brandName).toBeDefined();
    expect(pub.body.primaryColor).toMatch(/^#/);

    const noAuth = await request(app.getHttpServer()).put('/api/config').send({ brandName: 'X' });
    expect(noAuth.status).toBe(401);

    const upd = await agent.put('/api/config').set('x-csrf-token', csrf).send({ brandName: 'Acme Security', primaryColor: '#ff3366' });
    expect(upd.status).toBe(200);
    expect(upd.body.brandName).toBe('Acme Security');

    const after = await request(app.getHttpServer()).get('/api/config');
    expect(after.body.brandName).toBe('Acme Security');
    expect(after.body.primaryColor).toBe('#ff3366');
  });

  it('stores and clears a favicon URL', async () => {
    const pub = await request(app.getHttpServer()).get('/api/config');
    expect(pub.body.faviconUrl).toBeNull();

    const set = await agent.put('/api/config').set('x-csrf-token', csrf).send({ faviconUrl: 'http://localhost:8080/api/assets/file/x.png' });
    expect(set.status).toBe(200);
    expect(set.body.faviconUrl).toBe('http://localhost:8080/api/assets/file/x.png');

    const cleared = await agent.put('/api/config').set('x-csrf-token', csrf).send({ faviconUrl: '' });
    expect(cleared.body.faviconUrl).toBeNull();
  });

  it('rejects an unknown timezone', async () => {
    const bad = await agent.put('/api/config').set('x-csrf-token', csrf).send({ timezone: 'Mars/Olympus' });
    expect(bad.status).toBe(400);
    const ok = await agent.put('/api/config').set('x-csrf-token', csrf).send({ timezone: 'Asia/Kolkata' });
    expect(ok.status).toBe(200);
  });

  it('rejects an invalid color', async () => {
    const res = await agent.put('/api/config').set('x-csrf-token', csrf).send({ primaryColor: 'red' });
    expect(res.status).toBe(400);
  });
});
