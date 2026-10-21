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

  it('404s on a malformed filename and on an unknown file', async () => {
    expect((await request(app.getHttpServer()).get('/api/assets/file/..%2f..%2fetc%2fpasswd')).status).toBe(404);
    expect((await request(app.getHttpServer()).get('/api/assets/file/not-a-valid-name')).status).toBe(404);
    expect((await request(app.getHttpServer()).get('/api/assets/file/' + 'a'.repeat(32) + '.png')).status).toBe(404);
  });

  it('rejects an SVG uploaded as an image (stored XSS guard)', async () => {
    const { agent, csrf } = await authed(app);
    const res = await agent
      .post('/api/assets')
      .set('x-csrf-token', csrf)
      .field('kind', 'image')
      .attach('file', Buffer.from('<svg onload="alert(1)"></svg>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
    expect(res.status).toBe(400);
  });

  it('serves an attachment with nosniff and attachment disposition', async () => {
    const { agent, csrf } = await authed(app);
    const up = await agent
      .post('/api/assets')
      .set('x-csrf-token', csrf)
      .field('kind', 'attachment')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'doc.pdf', contentType: 'application/pdf' });
    expect(up.status).toBe(201);
    const path = new URL(up.body.url).pathname;
    const fetched = await request(app.getHttpServer()).get(path);
    expect(fetched.headers['x-content-type-options']).toBe('nosniff');
    expect(fetched.headers['content-disposition']).toContain('attachment');
    expect(fetched.headers['content-type']).toContain('application/octet-stream');
    expect(fetched.headers['content-security-policy']).toContain("sandbox");
    await agent.delete(`/api/assets/${up.body.id}`).set('x-csrf-token', csrf);
  });

  it('accepts an ICO favicon and serves it inline', async () => {
    const { agent, csrf } = await authed(app);
    const up = await agent
      .post('/api/assets')
      .set('x-csrf-token', csrf)
      .field('kind', 'logo')
      .attach('file', Buffer.from('ico-bytes'), { filename: 'favicon.ico', contentType: 'image/x-icon' });
    expect(up.status).toBe(201);
    expect(up.body.filename).toMatch(/\.ico$/);
    const fetched = await request(app.getHttpServer()).get(new URL(up.body.url).pathname);
    expect(fetched.headers['content-type']).toContain('image/x-icon');
    await agent.delete(`/api/assets/${up.body.id}`).set('x-csrf-token', csrf);
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
    // The console (another origin in dev) and mail clients must be able to embed it.
    expect(fetched.headers['cross-origin-resource-policy']).toBe('cross-origin');

    const list = await agent.get('/api/assets');
    expect(list.body.some((a: { id: string }) => a.id === up.body.id)).toBe(true);

    const del = await agent.delete(`/api/assets/${up.body.id}`).set('x-csrf-token', csrf);
    expect(del.status).toBe(200);
  });
});
