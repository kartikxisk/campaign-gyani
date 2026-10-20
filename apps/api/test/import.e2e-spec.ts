import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

describe('import (e2e)', () => {
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

  it('requires auth', async () => {
    expect((await request(app.getHttpServer()).post('/api/import/email').send({ source: 'x' })).status).toBe(401);
  });

  it('parses a pasted raw email', async () => {
    const raw = 'Subject: Hello\r\nContent-Type: text/html\r\n\r\n<p>Hi <a href="https://x.test">l</a></p>';
    const res = await agent.post('/api/import/email').set('x-csrf-token', csrf).send({ source: raw, convertLinks: true });
    expect(res.status).toBe(201);
    expect(res.body.subject).toBe('Hello');
    expect(res.body.html).toContain('{{.URL}}');
  });

  it('rejects an import-site request to a private address', async () => {
    const res = await agent.post('/api/import/site').set('x-csrf-token', csrf).send({ url: 'http://169.254.169.254/latest' });
    expect(res.status).toBe(400);
  });
});
