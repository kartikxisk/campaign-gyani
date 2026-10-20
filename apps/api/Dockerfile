# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm -F @cg/shared build \
 && pnpm -F @cg/api exec prisma generate \
 && pnpm -F @cg/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/packages/shared /repo/packages/shared
COPY --from=build /repo/apps/api/dist /repo/apps/api/dist
COPY --from=build /repo/apps/api/package.json /repo/apps/api/
COPY --from=build /repo/apps/api/prisma /repo/apps/api/prisma
WORKDIR /repo/apps/api
EXPOSE 8080
CMD ["sh", "-c", "node ../../node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
