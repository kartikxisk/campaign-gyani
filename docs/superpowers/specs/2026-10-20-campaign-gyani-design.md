# Campaign-Gyani — Design Document

**Date:** 2026-10-20
**Status:** Draft for approval

## 1. Intent & Why

A client needs a standalone phishing-simulation platform. Today this capability
is buried inside the cyberyami LMS monorepo (Express + Mongoose + Bull, shared
with dozens of unrelated LMS features and a multi-tenant permission system).

**Campaign-Gyani** is a fresh, standalone, **single-tenant** product: one
customer, one deployment, one admin. It rebuilds the phishing-simulation feature
set on a modern stack with reusable components and better UI/UX — not a port of
the old code, a clean rebuild informed by what the old module did.

Purpose of the tool: authorized security-awareness testing. An organization
sends simulated phishing emails to its own employees, tracks who opens / clicks /
submits, and reports on susceptibility so it can target training. This is
standard defensive-security tooling (same category as GoPhish, KnowBe4).

## 2. Goals / Non-Goals / Anti-Goals

### Goals
- Standalone repo `campaign-gyani`, deployable independently of the LMS.
- Single-tenant, single admin login. No multi-tenant plumbing.
- Full campaign loop: build templates & landing pages → import targets →
  configure SMTP → launch → track events → report.
- Scalable/robust/available **in code shape**, deployed pragmatically (single box).
- Reusable component library; distinctly better UI/UX than the old modal-heavy UI.
- Admin can upload assets (logo, email images, attachments) from within the app.

### Non-Goals (v1)
- Training-on-fail (assigning awareness courses to people who clicked). Deferred.
- Granular RBAC / permission editor. One admin only.
- Multi-tenant / organization hierarchy (org, location, department fields dropped).
- LMS integration (pulling students, course recommendations by risk).
- High-availability infra (k8s, DB replication, multi-region). Code stays HA-ready.

### Anti-Goals (would make this a failure even if it "works")
- Recreating the old UX of stacked full-screen modals and a single giant scrolling
  campaign form. The rebuild must feel modern.
- Carrying over the old module's known bugs (dead preview links, unsandboxed
  landing preview iframe, disabled "Add From List", `compaign` misspelling).
- Shipping something that can't send real email reliably at volume — delivery is
  the heart of the product and cannot be weak.
- Leaking admin-only data through the public victim/landing/report surfaces.

## 3. Constraints

- **Stack (client's choice):** Next.js latest (App Router) + NestJS + PostgreSQL.
- **Storage:** local disk for uploaded assets/attachments.
- **Deploy:** pragmatic single box — Docker Compose: NestJS API, Next.js web,
  Postgres, Redis. Code written to scale horizontally later (stateless API,
  queue-backed sending, no in-process state).
- **Tracking surface:** same app, separate public route prefix, configurable
  public base URL. Admin UI and victim-facing traffic share one host in v1.
- **Editor:** tabbed email editor — WYSIWYG tab + raw HTML tab + live preview tab.
  Landing pages: raw HTML + preview.
- No AI-attribution lines in commits/PRs (per repo policy).

## 4. Architecture

### 4.1 Repos / layout
Monorepo `campaign-gyani` (pnpm workspaces or Turborepo):

```
campaign-gyani/
  apps/
    api/        # NestJS
    web/        # Next.js (App Router)
  packages/
    ui/         # reusable React component library (design system)
    shared/     # shared TS types / DTOs / zod schemas
  docker-compose.yml
  README.md
```

**Decision (mine):** Turborepo + pnpm, shared TypeScript types in `packages/shared`
so the Next.js client and NestJS API never drift on DTO shapes.

### 4.2 Backend (NestJS)
Modules (one Nest module per bounded context):
- `auth` — single admin, email+password, Argon2 hash, session or JWT. Seeded admin
  from env on first boot; password change in-app.
- `templates` — email templates CRUD.
- `landing-pages` — landing page CRUD.
- `sending-profiles` — SMTP profile CRUD + test-send.
- `groups` / `targets` — target groups, CSV import, dedupe by email per group.
- `campaigns` — campaign CRUD, launch, complete, public-link toggle.
- `sending` — BullMQ worker: renders per-target email, sends via Nodemailer pooled
  transport, rate-limited per sending profile, retry w/ backoff, records Sent/Error.
- `tracking` — **public** controllers: open pixel, click redirect, form submit,
  landing-page serve, public report. No auth guard; token-scoped.
- `reports` — dashboard aggregates, campaign analytics, CSV export.
- `assets` — upload/list/delete files on local disk, served over a static route.
- `health` — liveness/readiness.

Cross-cutting: global validation pipe (zod or class-validator), Helmet, CORS,
rate-limiting on public tracking routes, structured logging (pino), request IDs.

### 4.3 Frontend (Next.js App Router)
- Admin app behind auth: dashboard, campaigns, templates, landing pages, sending
  profiles, groups, assets, settings.
- Public routes (no auth): `/v/[token]` landing-page view, `/r/[code]` public
  report. Tracking pixel + click endpoints are API-served, not pages.
- `packages/ui`: Tailwind + a headless primitive set (Radix) wrapped into our own
  components — Button, Input, Select, Combobox/MultiSelect, DataTable (search/sort/
  paginate built in), Modal/Drawer, Tabs, Card, StatCard, Badge, Toast, Charts.
  Every screen composes these; no bespoke one-off tables.
- Data fetching: TanStack Query + typed API client generated from `packages/shared`.
- Forms: react-hook-form + zod resolver (schemas shared with the API).

### 4.4 Data model (Postgres, via Prisma or TypeORM)
**Decision (mine):** Prisma — best DX, typed client, easy migrations.

Tables (all single-tenant, so no `tenantId`):
- `admin_user` (id, email, passwordHash, createdAt, passwordChangedAt)
- `sending_profile` (id, name, provider, fromAddress, host, port, username,
  passwordEnc, ignoreCertErrors, rateLimit, maxConnections, maxMessages, pool,
  headers jsonb, timestamps)
- `email_template` (id, name, envelopeSender, subject, textBody, htmlBody,
  externalUrl, attachments jsonb[], timestamps)
- `landing_page` (id, name, html, redirectUrl, captureData bool, capturePasswords
  bool, timestamps)
- `target_group` (id, name, timestamps) + `target` (id, groupId, email, firstName,
  lastName, position) — unique(groupId, email)
- `campaign` (id, name, status enum[DRAFT,SCHEDULED,RUNNING,COMPLETE], sendByDate,
  launchedAt, completedAt, landingPageId, sendingProfileId, shuffleTemplates bool,
  publicCode nullable, publicEnabled bool, timestamps)
- `campaign_template` (campaignId, templateId) — M:N
- `campaign_result` (id, campaignId, targetId snapshot of name/email/position,
  status enum[SCHEDULED,SENDING,SENT,OPENED,CLICKED,SUBMITTED,REPORTED,ERROR],
  rid unique token, error nullable, timestamps) — per recipient
- `campaign_event` (id, resultId, type, ip, userAgent, payload jsonb, createdAt) —
  append-only event log (open/click/submit/report), source for timelines & charts
- `asset` (id, filename, path, mimetype, size, kind[logo|image|attachment], createdAt)

Status as a **real enum**, not the old free-string `status`. Targets are
**snapshotted** onto `campaign_result` at launch so later group edits don't
rewrite history.

### 4.5 Sending pipeline
1. Launch → create `campaign_result` rows (SCHEDULED) for every target in selected
   groups, each with a unique `rid`.
2. Enqueue one BullMQ job per recipient (or batched), honoring `sendByDate`.
3. Worker renders template (merge vars), rewrites links to tracking click-URL,
   injects open-pixel, sends via per-profile pooled Nodemailer transport.
4. Rate-limit per sending profile (rateLimit/maxConnections/maxMessages). Retry
   with exponential backoff; on final failure mark result ERROR with reason.
5. Per-host circuit awareness so one bad SMTP host doesn't stall the queue
   (carry forward the lesson already learned in the LMS mail hardening work).

### 4.6 Tracking
- **Open:** 1x1 pixel at `/api/t/o/:rid` → record OPENED event.
- **Click:** `/api/t/c/:rid` → record CLICKED, 302 to landing page `/v/:rid`.
- **Landing serve:** `/v/:rid` renders stored landing HTML; merge vars filled; all
  forms rewritten to post to `/api/t/s/:rid`.
- **Submit:** `POST /api/t/s/:rid` with form body → record SUBMITTED (store captured
  fields per landing-page capture flags), then 302 to `redirectUrl`.
- **Report:** optional "report phishing" link → record REPORTED.
- `rid` is an unguessable token (not sequential). Public routes are rate-limited and
  carry no admin data. Landing/preview iframes always sandboxed.

### 4.7 Merge variables
Keep the familiar Go-template-style tokens the old UI taught, filled from the
target + campaign: `{{.FirstName}} {{.LastName}} {{.Email}} {{.Position}}
{{.URL}} {{.ExternalURL}}`. Drop `{{.Company}}` (old module left it always blank).
Missing values render empty. Editor has a token inserter.

### 4.8 Import helpers (v1 in scope)
- **Import email:** paste raw RFC822 source → parse to {subject, html, text}, option
  to rewrite links to the tracking URL.
- **Import site:** fetch a URL server-side → return sanitized HTML as landing-page
  starting point. Server-side fetch is allowlist/SSRF-guarded.

## 5. UX direction (better than old)

- Replace stacked full-screen modals with: list pages using one shared DataTable,
  and create/edit as dedicated routes or side drawers (not nested modals).
- **Campaign creation = a real multi-step wizard** (Name → Audience → Email(s) →
  Landing page → Sending profile → Schedule → Review & launch), with per-step
  validation and a live summary rail. The old UI was one long scrolling form; this
  is the single biggest UX upgrade.
- Dashboard: clear KPI row (campaigns, sent, open rate, click rate, submit rate),
  one trend chart, recent campaigns. Rates as percentages, not just counts.
- Campaign report: funnel (Sent → Opened → Clicked → Submitted → Reported) front and
  center, per-target results table with status filter, per-target event timeline.
- Consistent empty states, loading skeletons, toasts, destructive-action confirms.
- Visual design pass via the frontend-design skill when UI work starts.
- Asset manager screen: upload logo + images, copy URL to paste into templates.

## 6. What's left to the builder

- Exact UI component library primitives (Radix vs. alternative) — builder's call
  within "headless primitives + Tailwind wrapped into our own `packages/ui`".
- ORM mechanics (Prisma chosen; migration naming, seed script details open).
- Auth session vs JWT — builder picks; must be httpOnly-cookie based, CSRF-safe.
- SMTP password encryption-at-rest scheme (must be encrypted, not plaintext).
- Chart library (Recharts/ECharts/ApexCharts) — builder's call, one choice reused.
- CSV parser lib and exact column mapping UI for target import.
- Test strategy depth per module (TDD expected; see plan phase).
- SSRF allowlist specifics for Import Site.

## 7. Delivery shape

This is a **project** → after this design is approved, next step is a written
implementation plan (superpowers:writing-plans), then phased TDD build. Suggested
phases: (0) monorepo + tooling + CI + docker-compose; (1) auth + admin shell + ui
package; (2) templates/landing/sending-profiles/assets CRUD; (3) groups + CSV;
(4) campaigns + launch + sending worker; (5) tracking + landing serve; (6) reports
+ dashboard + public report link; (7) import helpers; (8) hardening + e2e.
