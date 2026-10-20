import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './app-harness';

const EMAIL = 'admin@test.local';
const PASSWORD = 'testpass123';

async function authed(app: INestApplication) {
  const agent: TestAgent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
  const csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  return { agent, csrf };
}

describe('groups + targets (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app?.close(); });

  it('requires auth', async () => {
    expect((await request(app.getHttpServer()).get('/api/groups')).status).toBe(401);
  });

  it('creates a group, adds targets, dedupes per group, and cascades on delete', async () => {
    const { agent, csrf } = await authed(app);
    const g1 = (await agent.post('/api/groups').set('x-csrf-token', csrf).send({ name: 'Finance' })).body;
    const g2 = (await agent.post('/api/groups').set('x-csrf-token', csrf).send({ name: 'Ops' })).body;
    expect(g1.numTargets).toBe(0);

    const t = await agent.post(`/api/groups/${g1.id}/targets`).set('x-csrf-token', csrf)
      .send({ email: 'bob@corp.com', firstName: 'Bob', lastName: 'B', position: 'Analyst' });
    expect(t.status).toBe(201);

    const dup = await agent.post(`/api/groups/${g1.id}/targets`).set('x-csrf-token', csrf).send({ email: 'bob@corp.com' });
    expect(dup.status).toBe(409);

    const otherGroup = await agent.post(`/api/groups/${g2.id}/targets`).set('x-csrf-token', csrf).send({ email: 'bob@corp.com' });
    expect(otherGroup.status).toBe(201);

    expect((await agent.get(`/api/groups/${g1.id}`)).body.numTargets).toBe(1);
    const targets = await agent.get(`/api/groups/${g1.id}/targets`);
    expect(targets.body).toHaveLength(1);

    const tid = t.body.id;
    const upd = await agent.put(`/api/targets/${tid}`).set('x-csrf-token', csrf).send({ email: 'bob@corp.com', position: 'Lead' });
    expect(upd.body.position).toBe('Lead');

    await agent.delete(`/api/groups/${g1.id}`).set('x-csrf-token', csrf);
    expect((await agent.get(`/api/groups/${g1.id}`)).status).toBe(404);
    // the cascaded target is gone: updating it now 404s
    expect((await agent.put(`/api/targets/${tid}`).set('x-csrf-token', csrf).send({ email: 'x@y.com' })).status).toBe(404);

    await agent.delete(`/api/groups/${g2.id}`).set('x-csrf-token', csrf);
  });
});

describe('csv import (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app?.close(); });

  it('imports valid rows and reports skipped ones', async () => {
    const agent: TestAgent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    const csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
    const g = (await agent.post('/api/groups').set('x-csrf-token', csrf).send({ name: 'Imported' })).body;

    const csv = 'firstName,lastName,email,position\nA,B,a@corp.com,Dev\nC,D,,QA\nE,F,a@corp.com,Ops\n';
    const res = await agent
      .post(`/api/groups/${g.id}/targets/csv`)
      .set('x-csrf-token', csrf)
      .attach('file', Buffer.from(csv), { filename: 'targets.csv', contentType: 'text/csv' });
    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(1);
    expect(res.body.skipped).toHaveLength(2);

    await agent.delete(`/api/groups/${g.id}`).set('x-csrf-token', csrf);
  });
});
