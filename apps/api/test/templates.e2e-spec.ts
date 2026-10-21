import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';
const tpl = { name: 'Welcome', envelopeSender: 'IT <it@corp.com>', subject: 'Action required', textBody: 'hi', htmlBody: '<p>hi {{.FirstName}}</p>', attachments: [] };

async function authed(app: INestApplication) {
  const agent: TestAgent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
  const csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  return { agent, csrf };
}

describe('templates (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app?.close(); });

  it('requires auth', async () => {
    expect((await request(app.getHttpServer()).get('/api/templates')).status).toBe(401);
  });

  it('rejects an invalid template (missing subject)', async () => {
    const { agent, csrf } = await authed(app);
    const { subject, ...bad } = tpl;
    const res = await agent.post('/api/templates').set('x-csrf-token', csrf).send(bad);
    expect(res.status).toBe(400);
  });

  it('creates, lists with search, fetches, updates and deletes', async () => {
    const { agent, csrf } = await authed(app);
    const created = await agent.post('/api/templates').set('x-csrf-token', csrf).send(tpl);
    expect(created.status).toBe(201);
    const id = created.body.id;

    const list = await agent.get('/api/templates?query=welcome&limit=5');
    expect(list.body.total).toBeGreaterThanOrEqual(1);
    expect(list.body.rows.some((r: { id: string }) => r.id === id)).toBe(true);
    expect(list.body.limit).toBe(5);

    const got = await agent.get(`/api/templates/${id}`);
    expect(got.body.subject).toBe('Action required');

    const upd = await agent.put(`/api/templates/${id}`).set('x-csrf-token', csrf).send({ ...tpl, name: 'Welcome v2' });
    expect(upd.body.name).toBe('Welcome v2');

    const del = await agent.delete(`/api/templates/${id}`).set('x-csrf-token', csrf);
    expect(del.status).toBe(200);
    expect((await agent.get(`/api/templates/${id}`)).status).toBe(404);
  });

  it('accepts a large HTML body (inline images push real emails past the 100kb default)', async () => {
    const { agent, csrf } = await authed(app);
    const bigHtml = `<p>hi</p>${'<span>x</span>'.repeat(90_000)}`; // ~1.1 MB
    expect(bigHtml.length).toBeGreaterThan(1_000_000);
    const res = await agent.post('/api/templates').set('x-csrf-token', csrf).send({ ...tpl, name: 'Big', htmlBody: bigHtml });
    expect(res.status).toBe(201);
    await agent.delete(`/api/templates/${res.body.id}`).set('x-csrf-token', csrf);
  });
});
