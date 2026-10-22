import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup-app';
import { loadEnv } from '../src/config/env';
import { SEND_QUEUE, type SendJob, type SendQueue } from '../src/sending/send-queue.port';

// Counts enqueued jobs without touching Redis, so a large launch stays cheap.
class CountingQueue implements SendQueue {
  public total = 0;
  public maxBatch = 0;
  async enqueue(jobs: SendJob[]): Promise<void> {
    this.total += jobs.length;
    this.maxBatch = Math.max(this.maxBatch, jobs.length);
  }
}

// A 100k-recipient launch is heavy and contends with the other DB-bound e2e
// tests when vitest runs files in parallel. Opt in with RUN_SCALE_TESTS=1
// (CI/manual); the createMany fix is also guarded by the 8k test in
// campaigns.e2e, which runs in the default suite.
const scale = process.env.RUN_SCALE_TESTS ? describe : describe.skip;

scale('campaign launch at scale (e2e)', () => {
  let app: INestApplication;
  let agent: TestAgent;
  let csrf: string;
  const queue = new CountingQueue();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SEND_QUEUE).useValue(queue).compile();
    app = moduleRef.createNestApplication();
    await configureApp(app, loadEnv());
    await app.init();
    agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: 'admin@test.local', password: 'testpass123' });
    csrf = (await agent.get('/api/auth/csrf')).body.csrfToken as string;
  });
  afterAll(async () => { await app?.close(); });

  it('launches a 100k-recipient campaign (past the interactive-tx timeout ceiling)', async () => {
    const tpl = (await agent.post('/api/templates').set('x-csrf-token', csrf)
      .send({ name: 'ScaleT' + Math.random(), envelopeSender: 'a@b.com', subject: 'S', htmlBody: '<p>hi</p>', attachments: [] })).body;
    const smtp = (await agent.post('/api/sending-profiles').set('x-csrf-token', csrf)
      .send({ name: 'ScaleP' + Math.random(), provider: 'custom', fromAddress: 'a@b.com', host: 'h', port: 587, username: 'u', password: 'p', rateLimit: 10, maxConnections: 5, maxMessages: 100, pool: true, ignoreCertErrors: false, headers: [] })).body;
    const group = (await agent.post('/api/groups').set('x-csrf-token', csrf).send({ name: 'ScaleG' + Math.random() })).body;

    const N = 100_000;
    let csv = 'firstName,lastName,email,position\n';
    for (let i = 0; i < N; i++) csv += `F${i},L${i},scale100_${i}@load.test,R\n`;
    const imp = await agent.post(`/api/groups/${group.id}/targets/csv`).set('x-csrf-token', csrf)
      .attach('file', Buffer.from(csv), 'targets.csv');
    expect(imp.body.inserted).toBe(N);

    const created = await agent.post('/api/campaigns').set('x-csrf-token', csrf).send({
      name: 'Scale100k', type: 'email', sendByDate: new Date(Date.now() - 1000).toISOString(),
      templateIds: [tpl.id], smtpId: smtp.id, groupIds: [group.id],
    });
    const before = queue.total;
    const launched = await agent.post(`/api/campaigns/${created.body.id}/launch`).set('x-csrf-token', csrf);

    expect(launched.status).toBe(201);
    expect(launched.body.status).toBe('RUNNING');
    expect(queue.total - before).toBe(N);

    await agent.delete(`/api/campaigns/${created.body.id}`).set('x-csrf-token', csrf);
  }, 120_000);
});
