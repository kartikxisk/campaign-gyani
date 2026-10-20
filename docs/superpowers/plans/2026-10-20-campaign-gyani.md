# Campaign-Gyani Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone single-tenant phishing-simulation platform (campaigns, email/landing templates, SMTP sending, event tracking, reporting) on a fresh Turborepo monorepo.

**Architecture:** Turborepo + pnpm monorepo. NestJS API (Prisma/Postgres, BullMQ/Redis, Nodemailer) exposes an authenticated admin API plus unauthenticated token-scoped tracking routes. Next.js App Router web app consumes it through a typed client, composing a shared `packages/ui` component library. One admin user; no multi-tenancy.

**Tech Stack:** TypeScript, Next.js (latest, App Router), NestJS, Prisma, PostgreSQL, Redis, BullMQ, Nodemailer, Tailwind, Radix primitives, TanStack Query, react-hook-form, zod, Argon2, Vitest (unit), Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-10-20-campaign-gyani-design.md`

## Global Constraints

- Monorepo root: `/Users/Project/Company/campaign-gyani`. Layout: `apps/api`, `apps/web`, `packages/ui`, `packages/shared`.
- Single-tenant: no `tenantId`/org/location/department anywhere. One `admin_user`.
- All shared DTO/validation lives in `packages/shared` as zod schemas; API and web import from it — never redefine a shape.
- Campaign/result statuses are Postgres enums, never free strings. Campaign: `DRAFT,SCHEDULED,RUNNING,COMPLETE`. Result: `SCHEDULED,SENDING,SENT,OPENED,CLICKED,SUBMITTED,REPORTED,ERROR`.
- `rid` and `publicCode` are unguessable random tokens (≥128-bit, `crypto.randomBytes`), never sequential.
- Public routes (`/api/t/*`, `/v/:rid`, `/r/:code`, landing serve) carry no admin data, are rate-limited, and never require auth.
- Any HTML rendered in-browser for preview/landing uses a sandboxed iframe.
- SMTP passwords encrypted at rest (AES-256-GCM via `ASSET_ENCRYPTION_KEY`/`SMTP_ENC_KEY` env); never returned in GET responses.
- Admin auth is httpOnly-cookie session, CSRF-protected on mutations.
- Merge tokens supported: `{{.FirstName}} {{.LastName}} {{.Email}} {{.Position}} {{.URL}} {{.ExternalURL}}`. Missing → empty string. No `{{.Company}}`.
- Asset/attachment upload: local disk, max 15 MB/file, served over a static route.
- No AI-attribution lines in commit messages or PRs.
- Node ≥ 20. pnpm ≥ 9.

## Review Focus

- **CSV target import with malformed rows** (missing email, duplicate email within group, blank file, wrong headers, >100k rows): importer must reject invalid rows with a per-row reason and dedupe by email, not crash or partial-commit silently. → covered in Task 10.
- **Tracking token for a nonexistent/deleted/foreign `rid`** on open/click/submit: must 404/no-op without leaking data and without 500. → covered in Task 14.
- **Import Site SSRF** (URL pointing at `localhost`, `169.254.169.254`, internal IPs, `file://`): server-side fetch must refuse private/loopback/link-local targets. → covered in Task 16.
- **Merge-var rendering with missing/extra/malformed tokens** (`{{.Unknown}}`, unclosed `{{.`, nil target field): renders empty for unknown, leaves malformed text literal, never throws mid-send. → covered in Task 11.
- **SMTP send failure mid-campaign** (auth error, connection refused, one bad recipient): result row marked ERROR with reason, retried with backoff, queue not stalled for other recipients. → covered in Task 13.

---

## Task 0: Monorepo scaffold + tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`, `.nvmrc`, `README.md`
- Create: `apps/api/package.json`, `apps/web/package.json`, `packages/ui/package.json`, `packages/shared/package.json`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: workspace scripts `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm -F @cg/api …`, `pnpm -F @cg/web …`. Package names: `@cg/api`, `@cg/web`, `@cg/ui`, `@cg/shared`.

- [ ] **Step 1:** Init git repo; create `pnpm-workspace.yaml` listing `apps/*` and `packages/*`; create `turbo.json` with `build`/`lint`/`test`/`dev` pipelines; create `tsconfig.base.json` with strict mode, path aliases `@cg/shared`, `@cg/ui`.
- [ ] **Step 2:** Create the four workspace `package.json` stubs with the names above and TypeScript + Vitest dev deps. Root `package.json` has the turbo scripts and pnpm engine pin.
- [ ] **Step 3:** Add `.github/workflows/ci.yml`: install pnpm, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`, `pnpm build`.
- [ ] **Step 4:** Run `pnpm install` then `pnpm build`. Expected: clean install, turbo runs with "no tasks" or trivial success.
- [ ] **Step 5:** Commit `chore: scaffold turborepo monorepo`.

---

## Task 1: `packages/shared` — enums, constants, zod schemas

**Files:**
- Create: `packages/shared/src/enums.ts`, `packages/shared/src/merge-vars.ts`, `packages/shared/src/schemas/*.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/src/schemas/__tests__/*.test.ts`

**Interfaces:**
- Produces: `CampaignStatus`, `ResultStatus` enums; `MERGE_TOKENS: string[]`; zod schemas `sendingProfileSchema`, `emailTemplateSchema`, `landingPageSchema`, `targetSchema`, `targetGroupSchema`, `campaignCreateSchema`, `loginSchema`, each with an exported inferred `…Dto` type.

- [ ] **Step 1: failing test** — `enums.test.ts` asserts `CampaignStatus` has exactly the 4 values and `ResultStatus` the 8 values from Global Constraints; `merge-vars.test.ts` asserts `MERGE_TOKENS` equals the 6 tokens and excludes `.Company`.
- [ ] **Step 2:** Run `pnpm -F @cg/shared test`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement `enums.ts`, `merge-vars.ts`, and the zod schemas. `campaignCreateSchema`: name (required), sendByDate (ISO), templateIds (min 1), pageId, smtpId, groupIds (min 1), shuffleTemplates (bool, and if >1 template selected shuffle must be explicitly set). `sendingProfileSchema`: name, provider enum, fromAddress (email), host, port, username, password, rateLimit/maxConnections/maxMessages (positive ints), pool, ignoreCertErrors, headers (array of {key,value}). `emailTemplateSchema`: name, envelopeSender, subject, textBody, htmlBody, externalUrl (optional URL), attachments. `landingPageSchema`: name, html, redirectUrl (URL), captureData, capturePasswords. `targetSchema`: email, firstName, lastName, position.
- [ ] **Step 4:** Add schema tests: valid payload passes; each required-field omission fails; `campaignCreateSchema` rejects >1 template with shuffle undefined. Run `pnpm -F @cg/shared test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(shared): enums, merge tokens, zod DTO schemas`.

---

## Task 2: API bootstrap — NestJS app, config, health, Prisma connection

**Files:**
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/config/env.ts`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`, `apps/api/src/health/health.controller.ts`
- Create: `apps/api/prisma/schema.prisma`
- Test: `apps/api/test/health.e2e-spec.ts`

**Interfaces:**
- Produces: bootable Nest app on `API_PORT`; `PrismaService` (injectable, connects on init); `GET /api/health` → `{status:"ok"}`; `env` validated via zod (`DATABASE_URL`, `REDIS_URL`, `API_PORT`, `SESSION_SECRET`, `SMTP_ENC_KEY`, `PUBLIC_BASE_URL`, `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`, `ASSET_DIR`).

- [ ] **Step 1:** Add NestJS, Prisma, zod deps to `apps/api`. Write `prisma/schema.prisma` datasource + generator only (models come in Task 3).
- [ ] **Step 2: failing test** — `health.e2e-spec.ts` boots the app and asserts `GET /api/health` returns 200 `{status:"ok"}`.
- [ ] **Step 3:** Run it. Expected: FAIL (no app).
- [ ] **Step 4:** Implement `env.ts` (zod-validated process.env, throws on missing), `PrismaService`/`PrismaModule`, `HealthController`, `AppModule` wiring, `main.ts` with global `/api` prefix, Helmet, cookie parser, global zod validation pipe, CORS from env.
- [ ] **Step 5:** Run health e2e. Expected: PASS.
- [ ] **Step 6:** Commit `feat(api): nest bootstrap, env, prisma, health`.

---

## Task 3: Prisma schema — full data model + first migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`
- Test: `apps/api/test/schema.spec.ts`

**Interfaces:**
- Produces: Prisma models `AdminUser, SendingProfile, EmailTemplate, LandingPage, TargetGroup, Target, Campaign, CampaignTemplate, CampaignResult, CampaignEvent, Asset` with fields per spec §4.4; generated `@prisma/client`. Seed creates the admin from env if absent.

- [ ] **Step 1:** Write all models per design §4.4. Enums `CampaignStatus`, `ResultStatus`. `Target` unique `(groupId,email)`. `CampaignResult.rid` unique; snapshot fields `email,firstName,lastName,position`. `CampaignEvent` append-only FK to result. Indexes on `Campaign(status, launchedAt)` and `CampaignEvent(resultId, type)`.
- [ ] **Step 2:** Run `pnpm -F @cg/api prisma migrate dev --name init`. Expected: migration applies to local Postgres, client generates.
- [ ] **Step 3: test** — `schema.spec.ts` uses PrismaService against a test DB to create one of each row with required relations and read it back; asserts unique constraint on `(groupId,email)` throws on duplicate.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Write `seed.ts` (idempotent admin create). Run `pnpm -F @cg/api prisma db seed`. Expected: admin row exists.
- [ ] **Step 6:** Commit `feat(api): prisma data model + init migration + seed`.

---

## Task 4: Auth — admin login, session, CSRF, password change

**Files:**
- Create: `apps/api/src/auth/{auth.module,auth.service,auth.controller,session.guard,crypto.util}.ts`
- Test: `apps/api/src/auth/__tests__/auth.service.spec.ts`, `apps/api/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `loginSchema` from `@cg/shared`.
- Produces: `POST /api/auth/login` (sets httpOnly session cookie, returns admin profile), `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`, `GET /api/auth/csrf` (returns token). `SessionGuard` (injectable, protects admin routes). `hashPassword`/`verifyPassword` (Argon2). CSRF middleware rejecting mutations without matching token.

- [ ] **Step 1: failing test** — `auth.service.spec.ts`: `verifyPassword` true for correct, false for wrong; `hashPassword` output verifies. `auth.e2e-spec.ts`: login with seeded creds sets cookie + 200; wrong password 401; `/me` without cookie 401; `/me` with cookie 200; change-password then old password fails, new succeeds.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement Argon2 `crypto.util`, session store (Redis-backed express-session or Nest equivalent), `AuthService`, `AuthController`, `SessionGuard`, CSRF guard on mutating verbs.
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(api): admin auth, session, csrf`.

---

## Task 5: Assets module — upload/list/delete to local disk

**Files:**
- Create: `apps/api/src/assets/{assets.module,assets.service,assets.controller}.ts`, `apps/api/src/assets/storage.ts`
- Test: `apps/api/src/assets/__tests__/assets.service.spec.ts`, `apps/api/test/assets.e2e-spec.ts`

**Interfaces:**
- Consumes: `SessionGuard`, `PrismaService`, `env.ASSET_DIR`.
- Produces: `POST /api/assets` (multipart, ≤15MB, kind in `logo|image|attachment`), `GET /api/assets`, `DELETE /api/assets/:id`, static serve `GET /api/assets/file/:filename`. Service `saveFile(buffer, meta) -> Asset`, `deleteFile(id)`.

- [ ] **Step 1: failing test** — service saves a buffer to a temp `ASSET_DIR`, writes an `Asset` row, returns a URL; rejects >15MB; delete removes row + file. e2e: upload requires auth (401 without cookie), returns asset with retrievable URL.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement multer local storage with size limit, random filename (preserve extension), static route, service + controller guarded by `SessionGuard`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(api): local-disk asset upload`.

---

## Task 6: Sending-profiles module — CRUD + encrypted secrets + test-send

**Files:**
- Create: `apps/api/src/sending-profiles/{module,service,controller}.ts`, `apps/api/src/mail/transport.factory.ts`
- Test: service + e2e specs

**Interfaces:**
- Consumes: `SessionGuard`, `PrismaService`, `sendingProfileSchema`, `crypto.util` (AES-GCM encrypt/decrypt), `SMTP_ENC_KEY`.
- Produces: `GET/POST /api/sending-profiles`, `GET/PUT/DELETE /api/sending-profiles/:id`, `POST /api/sending-profiles/:id/test` (and `POST /api/sending-profiles/test` for unsaved). `buildTransport(profile)` → Nodemailer pooled transport honoring rateLimit/maxConnections/maxMessages/pool. Password encrypted on write, decrypted only inside `buildTransport`, never in GET.

- [ ] **Step 1: failing test** — create profile stores ciphertext (raw DB value ≠ plaintext), GET omits password, provider presets applied, `buildTransport` returns transport with `pool:true` and the limits. Test-send to a fake SMTP (nodemailer stub/ethereal) returns success; bad host returns structured error.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement CRUD, encryption on persist, provider presets (gmail/o365/ses/sendgrid/mailgun/custom with the port/rate values from spec §SendingProfileForm), transport factory, test-send endpoint.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(api): sending profiles with encrypted smtp secrets`.

---

## Task 7: Email-templates module — CRUD + attachments link

**Files:**
- Create: `apps/api/src/templates/{module,service,controller}.ts`
- Test: service + e2e specs

**Interfaces:**
- Consumes: `SessionGuard`, `PrismaService`, `emailTemplateSchema`, assets.
- Produces: `GET/POST /api/templates`, `GET/PUT/DELETE /api/templates/:id`. Stores `textBody`, `htmlBody`, `envelopeSender`, `subject`, `externalUrl`, `attachments` (asset ids).

- [ ] **Step 1: failing test** — CRUD round-trip; validation rejects missing name/subject/envelopeSender; attachments resolve to asset ids; list supports `?query&sort&order&page&limit`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement CRUD with the shared pagination/query helper (create it here as `apps/api/src/common/list-query.ts`, reused by later list endpoints).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): email templates crud`.

---

## Task 8: Landing-pages module — CRUD

**Files:**
- Create: `apps/api/src/landing-pages/{module,service,controller}.ts`
- Test: service + e2e specs

**Interfaces:**
- Consumes: `SessionGuard`, `PrismaService`, `landingPageSchema`, `common/list-query.ts`.
- Produces: `GET/POST /api/landing-pages`, `GET/PUT/DELETE /api/landing-pages/:id`. Fields: html, redirectUrl, captureData, capturePasswords.

- [ ] **Step 1: failing test** — CRUD round-trip; `capturePasswords` only honored when `captureData` true; redirectUrl validated.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement CRUD.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): landing pages crud`.

---

## Task 9: Groups & targets module — CRUD

**Files:**
- Create: `apps/api/src/groups/{module,service,controller}.ts`
- Test: service + e2e specs

**Interfaces:**
- Consumes: `SessionGuard`, `PrismaService`, `targetGroupSchema`, `targetSchema`.
- Produces: `GET/POST /api/groups`, `GET/PUT/DELETE /api/groups/:id`, `GET /api/groups/:id/targets`, `POST /api/groups/:id/targets`, `PUT/DELETE /api/targets/:id`. Group delete cascades targets (transaction). `numTargets` computed on read. Dedupe by email per group (unique constraint → 409).

- [ ] **Step 1: failing test** — create group, add target, duplicate email in same group → 409, same email in other group OK, delete group removes its targets.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement CRUD + cascading delete in a transaction.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): target groups crud`.

---

## Task 10: CSV target import

**Files:**
- Create: `apps/api/src/groups/csv-import.service.ts`; controller route
- Test: `apps/api/src/groups/__tests__/csv-import.spec.ts`

**Interfaces:**
- Consumes: groups service, a CSV parser (`csv-parse`).
- Produces: `POST /api/groups/:id/targets/csv` (multipart). Returns `{inserted, skipped: [{row, reason}]}`. Headers expected: `firstName,lastName,email,position`.

- [ ] **Step 1: failing test** — well-formed CSV inserts N; row with blank/invalid email skipped with reason; duplicate email (in-file and vs existing) skipped as duplicate; wrong headers → 400; empty file → 400; one bad row does not abort the good rows.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement streaming parse, per-row zod validation via `targetSchema`, dedupe against in-file set + DB, batched insert, structured skip report.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): csv target import with per-row validation`.

---

## Task 11: Render engine — merge vars + link rewrite + tracking pixel

**Files:**
- Create: `apps/api/src/render/render.service.ts`
- Test: `apps/api/src/render/__tests__/render.spec.ts`

**Interfaces:**
- Consumes: `MERGE_TOKENS`, `PUBLIC_BASE_URL`.
- Produces: `renderTemplate(html, ctx) -> string` (replaces the 6 tokens, unknown → empty, malformed left literal); `rewriteLinks(html, rid) -> string` (anchors point to `/api/t/c/:rid?u=<encoded original>` or landing); `injectPixel(html, rid) -> string` (append `<img>` to `/api/t/o/:rid`); `fillUrlToken(ctx, rid)` sets `{{.URL}}` to the landing click URL.

- [ ] **Step 1: failing test** — all 6 tokens fill from ctx; `{{.Unknown}}` → empty; unclosed `{{.` left literal; nil field → empty; rewriteLinks changes href but keeps anchor text; injectPixel appends exactly one pixel pointing at the rid; `{{.Company}}` is NOT substituted (left literal, since unsupported).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with a single tokenizer pass (no eval), regex-safe replacement, cheerio or regex for link/pixel injection.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): email render + link rewrite + pixel`.

---

## Task 12: Campaigns module — CRUD, launch, complete, public link

**Files:**
- Create: `apps/api/src/campaigns/{module,service,controller}.ts`
- Test: service + e2e specs

**Interfaces:**
- Consumes: `SessionGuard`, `PrismaService`, `campaignCreateSchema`, templates/landing/profiles/groups services, sending queue (Task 13, injected as token `SEND_QUEUE`).
- Produces: `GET/POST /api/campaigns`, `GET/DELETE /api/campaigns/:id`, `POST /api/campaigns/:id/launch`, `POST /api/campaigns/:id/complete`, `PATCH /api/campaigns/:id/visibility` (`{enabled:boolean}` → sets `publicCode`), `GET /api/campaigns/:id/results`, `GET /api/campaigns/:id/timeline`. Launch: snapshot all targets of selected groups into `CampaignResult` rows (status SCHEDULED, unique rid), set status SCHEDULED/RUNNING, enqueue send jobs honoring `sendByDate`.

- [ ] **Step 1: failing test** — create (DRAFT); launch creates one result per unique target with an rid and enqueues one job each; launch is idempotent-guarded (second launch 409); complete sets COMPLETE + completedAt; visibility toggle sets/clears `publicCode`; results/timeline read back.
- [ ] **Step 2:** Run → FAIL (use an in-memory fake queue binding for the unit test).
- [ ] **Step 3:** Implement. Snapshot in a transaction. Shuffle picks a random template per result when `shuffleTemplates`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): campaigns crud + launch + public link`.

---

## Task 13: Sending worker — BullMQ, pooled send, retry/backoff, per-host breaker

**Files:**
- Create: `apps/api/src/sending/{sending.module,send.queue,send.processor,circuit.ts}.ts`
- Test: `apps/api/src/sending/__tests__/send.processor.spec.ts`

**Interfaces:**
- Consumes: `buildTransport` (Task 6), `RenderService` (Task 11), `PrismaService`, Redis.
- Produces: queue `send` with `SEND_QUEUE` token; processor renders + sends one recipient, transitions result SCHEDULED→SENDING→SENT, writes SENT event; on failure retries (exponential backoff, max N) then ERROR with `error` reason; a per-host failure breaker short-circuits repeated failures to one host without failing other hosts' jobs.

- [ ] **Step 1: failing test** — processor with a stubbed transport marks SENT on success and writes a SENT event; transport throwing → retry recorded, final attempt sets ERROR + reason; breaker opens after threshold consecutive failures for a host and lets a different host through.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement processor, BullMQ retry/backoff opts, `circuit.ts` per-host state in Redis.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): sending worker with retry + circuit breaker`.

---

## Task 14: Tracking module — open/click/submit/report (public)

**Files:**
- Create: `apps/api/src/tracking/{tracking.module,tracking.service,tracking.controller}.ts`
- Test: `apps/api/src/tracking/__tests__/tracking.spec.ts`, e2e

**Interfaces:**
- Consumes: `PrismaService`, `RenderService`, rate-limiter.
- Produces (NO auth): `GET /api/t/o/:rid` → 1x1 gif + OPENED event (idempotent per first open); `GET /api/t/c/:rid` → CLICKED event + 302 to `/v/:rid`; `GET /v/:rid` (served by web, data via API) → landing HTML with forms rewritten to submit endpoint; `POST /api/t/s/:rid` → SUBMITTED event storing captured fields per landing capture flags → 302 to redirectUrl; `GET /api/t/r/:rid` → REPORTED event. All capture ip + user-agent.

- [ ] **Step 1: failing test** — unknown/foreign rid → 404/no-op, no 500, no data leak; valid open writes OPENED once and returns image bytes; click writes CLICKED + returns redirect; submit respects `captureData`/`capturePasswords` (password field dropped when capturePasswords false); report writes REPORTED; routes reachable without auth cookie.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with rate-limit guard and the random-token lookup. Status transition is monotonic (don't downgrade SUBMITTED to OPENED).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): public tracking endpoints`.

---

## Task 15: Reports module — dashboard aggregates, analytics, CSV export, public report

**Files:**
- Create: `apps/api/src/reports/{module,service,controller}.ts`
- Test: service + e2e specs

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `GET /api/reports/dashboard` (totals: campaigns, running, complete, groups; event counts; success-rate series), `GET /api/reports/summary`, `GET /api/campaigns/:id/export/results.csv`, `…/export/events.csv`, and public `GET /api/public/campaigns/:code` (+ `/results`, `/timeline`) resolving by `publicCode`, returning report data with zero admin fields. Success rate = `clamp((max(opened,submitted) - reported)/sent*100, 0, 100)`.

- [ ] **Step 1: failing test** — dashboard counts match seeded data; success-rate formula matches spec on fixtures (incl. divide-by-zero sent=0 → 0); CSV export has correct headers + one row per result; public report by code returns data, wrong code → 404, and response contains no SMTP/admin fields.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement aggregate queries, CSV streaming, public resolver.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): reports, dashboard, csv export, public report`.

---

## Task 16: Import helpers — import-email + import-site (SSRF-guarded)

**Files:**
- Create: `apps/api/src/import/{module,service,controller}.ts`, `apps/api/src/import/ssrf-guard.ts`
- Test: service specs

**Interfaces:**
- Consumes: `SessionGuard`, an RFC822 parser (`mailparser`), fetch.
- Produces: `POST /api/import/email` (`{source, convertLinks}`) → `{subject, html, text}`; `POST /api/import/site` (`{url}`) → `{html}` (sanitized). `assertPublicUrl(url)` rejects loopback/private/link-local/`file:`/non-http(s).

- [ ] **Step 1: failing test** — import-email parses subject/html/text from a raw source fixture; convertLinks rewrites anchors; import-site rejects `http://localhost`, `http://169.254.169.254`, `http://10.0.0.1`, `file:///etc/passwd` (throws/400) and accepts a public mock.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement parser wrapper + `ssrf-guard` (DNS-resolve then check IP ranges) + HTML sanitize on fetched site.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): email/site import with ssrf guard`.

---

## Task 17: `packages/ui` — design-system primitives

**Files:**
- Create: `packages/ui/src/{Button,Input,Select,Combobox,MultiSelect,DataTable,Modal,Drawer,Tabs,Card,StatCard,Badge,Toast,Skeleton,EmptyState,ConfirmDialog,Chart}.tsx`, `packages/ui/src/theme.ts`, `packages/ui/src/index.ts`, Tailwind preset
- Test: `packages/ui/src/__tests__/*.test.tsx` (Vitest + Testing Library)

**Interfaces:**
- Produces: typed, themeable components. `DataTable<T>` props: `columns`, `rows`, `onSort`, `search`, server pagination (`page,limit,total,onPage`), `rowActions`. `Combobox`/`MultiSelect` async options. `ConfirmDialog` for destructive actions.

- [ ] **Step 1: failing test** — `DataTable` renders rows, fires `onSort` on header click, shows empty state when no rows; `Combobox` filters async options; `ConfirmDialog` calls `onConfirm` only after confirm. (Design polish via frontend-design skill happens during web screens, not here.)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement on Radix primitives + Tailwind. Export a chart wrapper around the chosen chart lib.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(ui): design-system primitives`.

---

## Task 18: Web bootstrap — Next.js App Router shell, auth, typed API client

**Files:**
- Create: `apps/web/app/{layout.tsx,globals.css}`, `apps/web/app/(auth)/login/page.tsx`, `apps/web/app/(admin)/layout.tsx`, `apps/web/lib/{api-client.ts,query-client.tsx,session.ts}`, `apps/web/middleware.ts`
- Test: `apps/web/e2e/auth.spec.ts` (Playwright)

**Interfaces:**
- Consumes: `@cg/ui`, `@cg/shared` schemas, API from Task 4.
- Produces: typed fetch client (attaches CSRF + credentials), TanStack Query provider, admin layout (sidebar nav to all sections), route protection middleware (redirect to /login when unauthenticated), login page.

- [ ] **Step 1: failing test** — Playwright: visiting `/` unauthenticated redirects to `/login`; logging in with seeded creds lands on dashboard; logout returns to login.
- [ ] **Step 2:** Run (against docker-compose API). Expected: FAIL.
- [ ] **Step 3:** Implement shell, client, middleware, login form (react-hook-form + `loginSchema`).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(web): app router shell, auth, api client`.

---

## Task 19: Web — templates, landing pages, sending profiles, assets screens

**Files:**
- Create: `apps/web/app/(admin)/{templates,landing-pages,sending-profiles,assets}/…`, feature components under `apps/web/modules/*`
- Test: Playwright specs per screen (crud happy path)

**Interfaces:**
- Consumes: `@cg/ui` DataTable/forms, API Tasks 5–8.
- Produces: list + create/edit (drawer/route, not nested modals) for each. Email template editor: tabbed WYSIWYG + raw HTML + sandboxed preview, with merge-token inserter and attachment picker. Landing editor: raw HTML + sandboxed preview + import-site. Asset manager: upload + copy-URL.

- [ ] **Step 1: failing test** — Playwright: create/edit/delete one of each; email preview iframe is sandboxed; merge-token inserter inserts a token; asset upload returns a copyable URL.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Invoke the frontend-design skill for visual direction, then implement screens composing `@cg/ui`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(web): template/landing/profile/asset screens`.

---

## Task 20: Web — groups + CSV import screen

**Files:** `apps/web/app/(admin)/groups/…`; Playwright spec

**Interfaces:** Consumes API Tasks 9–10. Produces group list, group editor with targets table (search/sort/paginate), add-target drawer, CSV upload showing the `{inserted, skipped[]}` report.

- [ ] **Step 1: failing test** — Playwright: create group, add target, upload a CSV with one bad row, see inserted count + the skipped row reason.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(web): groups + csv import`.

---

## Task 21: Web — campaign wizard + launch

**Files:** `apps/web/app/(admin)/campaigns/new/…`, `apps/web/modules/campaigns/wizard/*`; Playwright spec

**Interfaces:** Consumes API Task 12. Produces multi-step wizard: Name → Audience (groups) → Email(s) (templates + shuffle) → Landing page → Sending profile → Schedule (sendByDate) → Review & launch, with per-step validation (shared schema), a live summary rail, and a Send-Test-Mail action.

- [ ] **Step 1: failing test** — Playwright: complete all steps, Review shows the choices, launch transitions the campaign to RUNNING/SCHEDULED and navigates to its report; step validation blocks Next on invalid input; >1 template forces a shuffle choice.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** frontend-design skill for the wizard, then implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(web): campaign creation wizard`.

---

## Task 22: Web — campaign report + dashboard + public report

**Files:** `apps/web/app/(admin)/campaigns/[id]/…`, `apps/web/app/(admin)/dashboard/…`, `apps/web/app/(public)/r/[code]/…`, `apps/web/app/(public)/v/[rid]/…`; Playwright specs

**Interfaces:** Consumes API Tasks 14–15. Produces: dashboard (KPI row with rates, trend chart, recent campaigns); campaign report (funnel Sent→Opened→Clicked→Submitted→Reported, per-target results table with status filter, per-target event-timeline drawer, Mark-Complete, Generate/Copy/Revoke public link, CSV exports); public report page (read-only, noindex, no admin controls); public landing view `/v/[rid]` (sandboxed render, forms post to submit endpoint).

- [ ] **Step 1: failing test** — Playwright: dashboard shows KPI rates; report shows funnel + results table + timeline; toggling public link yields a working `/r/[code]` page that hides admin controls; `/v/[rid]` renders landing and a form submit records SUBMITTED and redirects.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** frontend-design skill for dashboard/report, then implement. Charts via the `@cg/ui` chart wrapper.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(web): dashboard, campaign report, public views`.

---

## Task 23: Docker Compose + deploy + README

**Files:** `docker-compose.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `.env.example`, `README.md`

**Interfaces:** Produces one-command local stack: postgres, redis, api (runs migrate+seed on boot), web. `.env.example` documents every env var from Task 2.

- [ ] **Step 1:** Write Dockerfiles (multi-stage) + compose with healthchecks + depends_on. API entrypoint runs `prisma migrate deploy` then seed then start.
- [ ] **Step 2:** `docker compose up --build`. Expected: all services healthy; web reachable; login works end-to-end.
- [ ] **Step 3:** Write README (setup, env, deploy, the sending/tracking model, operational notes on scaling the worker).
- [ ] **Step 4:** Commit `chore: docker compose, dockerfiles, deploy docs`.

---

## Task 24: Hardening + full e2e pass

**Files:** `apps/web/e2e/full-campaign.spec.ts`; security middleware touch-ups

**Interfaces:** End-to-end: build template → landing → profile → group(+CSV) → campaign wizard → launch → simulate open/click/submit via tracking endpoints → see report + export.

- [ ] **Step 1: failing test** — one Playwright spec drives the whole loop against docker-compose, asserting the funnel reflects the simulated events.
- [ ] **Step 2:** Run → FAIL (until wired).
- [ ] **Step 3:** Fix gaps; verify rate limits on public routes, sandboxed iframes, encrypted SMTP secrets not leaking, CSRF on mutations.
- [ ] **Step 4:** Run full suite `pnpm test` + Playwright. Expected: PASS.
- [ ] **Step 5:** Commit `test: end-to-end campaign loop + hardening`.
