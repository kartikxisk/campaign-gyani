# Campaign-Gyani

A standalone, single-tenant **security-awareness (phishing simulation) platform**.
One organization runs simulated phishing campaigns against its own people, tracks
who opens / clicks / submits, and reports susceptibility to target training.

> For authorized security-awareness testing only.

## Stack

- **`apps/api`** — NestJS, Prisma/PostgreSQL, BullMQ/Redis, Nodemailer
- **`apps/web`** — Next.js (App Router), Tailwind, TanStack Query
- **`packages/ui`** — shared React design system ("signal console")
- **`packages/shared`** — shared TypeScript types, zod schemas, metrics

## Quick start (Docker)

```bash
cp .env.example .env    # fill in secrets
docker compose up --build
```

- Admin console: http://localhost:3000
- API: http://localhost:8080/api/health
- First boot runs Prisma migrations and seeds the admin from `ADMIN_EMAIL` /
  `ADMIN_INITIAL_PASSWORD`. Change the password in **Settings** after first login.

## Local development

```bash
pnpm install
# Postgres + Redis (any instance); point apps/api/.env at them, then:
pnpm -F @cg/api prisma migrate dev
pnpm -F @cg/api db:seed
pnpm dev            # turbo runs api (:8080) + web (:3000)
```

Run tests with `pnpm test`.

## How sending and tracking work

1. **Launch** snapshots every unique target of the selected groups into
   per-recipient result rows, each with an unguessable `rid`, and enqueues one
   BullMQ send job apiece (respecting the send-by date).
2. The **send worker** renders the template for each recipient (merge tokens,
   links rewritten to the tracking click-URL, an open pixel injected) and sends
   it through the campaign's SMTP profile — pooled, rate-limited, retried with
   exponential backoff, with a per-host circuit breaker so one bad server can't
   stall the queue.
3. **Tracking** (public, unauthenticated, rate-limited):
   - `GET /api/t/o/:rid` — open pixel → OPENED
   - `GET /api/t/c/:rid` — click → CLICKED, redirect to `/v/:rid`
   - `GET /v/:rid` — the landing page; its forms post to the submit endpoint
   - `POST /api/t/s/:rid` — SUBMITTED (captured fields honor the landing page's
     capture flags), then redirect to the configured URL
   - `GET /api/t/r/:rid` — REPORTED
4. **Reports**: dashboard funnel + success-rate trend, per-campaign funnel and
   per-recipient timeline, CSV exports, and an optional public read-only report
   link (`/r/:code`) that exposes no identifying data.

`PUBLIC_BASE_URL` is where victims reach landing pages and tracking; `WEB_ORIGIN`
is the admin console origin (CSRF/CORS are anchored to it).

## Security notes

- Argon2 password hashing; httpOnly session cookies; CSRF (double-submit +
  Origin check); brute-force throttle; session invalidation on password change.
- SMTP passwords encrypted at rest (AES-256-GCM); never returned by the API.
- SSRF guards on SMTP targets and site-import (private/loopback/link-local/
  metadata blocked; validated IP pinned to defeat DNS rebinding).
- Uploaded assets are type-restricted; non-image files are served
  `Content-Disposition: attachment` with `nosniff` and a locked-down CSP.
- Merge values are HTML-escaped; URL tokens are scheme-allowlisted.

## Scaling

The send worker runs in the API process by default (fine for a single box). To
scale horizontally, run additional API replicas (BullMQ distributes jobs across
all workers); move the per-host circuit breaker to Redis if you do. Postgres and
Redis can be pointed at managed instances via `DATABASE_URL` / `REDIS_URL`.

## Operational scripts

- `pnpm -F @cg/api prisma migrate deploy` — apply migrations (run on deploy)
- `pnpm -F @cg/api db:seed` — idempotent admin seed (also runs on API boot)
- `pnpm -F @cg/api reset-password -- --email you@co.com --password 'NewPass123'` — recover a locked-out admin (single-tenant self-hosted; invalidates existing sessions)
