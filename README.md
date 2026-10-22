# Campaign-Gyani

A standalone, single-tenant **campaign platform for phishing simulations and
email campaigns** — purely sending and stats. One organization runs simulated
phishing or plain email campaigns against its own people and tracks who opens /
clicks / submits / reports, with funnels and per-recipient reporting. Each
campaign is phishing **or** email (`campaign.type`); the console adapts to a
phishing/email view mode you pick in the topbar (remembered per browser).

> For authorized security-awareness testing only.

## Features

- Campaigns (phishing or email): wizard, drafts, edit, pause/resume, recurring
  (daily/weekly/monthly), scales to ~100k recipients per launch.
- Templates (HTML + text, merge tokens, attachments, import-from-email), landing
  pages (clone-from-URL, capture flags), sending profiles (SMTP, rate-limited),
  target groups + CSV import, suppressions + unsubscribe + bounce webhook.
- **AI template generation** — connect Claude, ChatGPT, or Gemini in Settings
  (provider, model, API key stored encrypted) and draft an email from a prompt.
- **Deliverability pre-flight** — check a sending domain's SPF / DKIM / DMARC and
  score email content for spam signals before you launch.
- Reports: dashboard funnel + trend, per-campaign funnel, per-recipient timeline,
  streamed CSV exports, optional public read-only report link (`/r/:code`).

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
  `ADMIN_INITIAL_PASSWORD`. After first login, change the password and set the
  **Public base URL** in **Settings** (required before launching a campaign).

## Local development

```bash
pnpm dev:setup      # or: npm run dev:setup
pnpm dev            # turbo runs api (:8080) + web (:3000)
```

`dev:setup` asks for the admin email, password and URLs, then writes
`apps/api/.env` (and `.env.test` if missing), starts the backing services from
`docker-compose.dev.yml` — Postgres :5490, Redis :6490, Mailpit SMTP :1025 with
its inbox at http://localhost:8025 — applies migrations to the dev and test
databases, and creates or updates the admin. Re-running it is safe: current
`.env` values become the defaults and existing secrets are kept.

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

The **public base URL** — where recipients reach landing pages and tracking — is
an admin setting (**Settings → Public base URL**), not an env var. Sending and
link generation fail with a clear "configure it first" error until it is set.
`WEB_ORIGIN` is the admin console origin (CSRF/CORS are anchored to it).

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

## Author

Built by [**kartikxisk**](https://github.com/kartikxisk).
