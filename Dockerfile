# syntax=docker/dockerfile:1
# Imagen única de la app (R04, ADR 007): se construye UNA vez y la corren N instancias.
# Sin Mongo ni Redis: las instancias usan Atlas y el Redis existente vía .env.local.

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /repo

# 1 · Dependencias (capa cacheada mientras no cambie el lockfile)
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/commerce/package.json packages/commerce/
COPY packages/config/package.json packages/config/
COPY packages/data/package.json packages/data/
COPY packages/i18n/package.json packages/i18n/
COPY packages/tokens/package.json packages/tokens/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter "@nudo/web..."

# 2 · Build con Turbopack (output standalone trazado desde la raíz del monorepo)
FROM deps AS build
COPY . .
ARG NEXT_DEPLOYMENT_ID=local
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @nudo/web build

# 3 · Runtime mínimo, usuario sin privilegios
FROM node:22-alpine AS runner
WORKDIR /app
ARG NEXT_DEPLOYMENT_ID=local
ENV NODE_ENV=production \
    NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/nudo-entrypoint
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=2s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
ENTRYPOINT ["nudo-entrypoint"]
CMD ["node", "apps/web/server.js"]
