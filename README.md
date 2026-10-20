# Campaign-Gyani

Standalone single-tenant security-awareness simulation platform.

- `apps/api` — NestJS API (Prisma/Postgres, BullMQ/Redis, Nodemailer)
- `apps/web` — Next.js App Router admin + public views
- `packages/ui` — shared React component library
- `packages/shared` — shared TypeScript types / zod schemas

See `docs/superpowers/specs` and `docs/superpowers/plans` for design and plan.

## Develop
```bash
pnpm install
pnpm dev
```
