# syntax=docker/dockerfile:1

# Build context is the repository root; deploy/docker-compose.yml sets it.

FROM node:24-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
RUN pnpm config set store-dir /pnpm/store
WORKDIR /repo

# ---------- web dashboard (apps/app) ----------

FROM base AS app-build
COPY . .
# The lockfile spans packages behind the paid npm.hugeicons.com registry; the web
# app only uses the free icons, so the release-age check is skipped for them.
RUN --mount=type=cache,id=pnpm-store-app,target=/pnpm/store \
    CI=1 pnpm install --frozen-lockfile --trust-lockfile \
      --filter @outlayr/app... \
      --config.minimum-release-age-exclude=@hugeicons-pro/*

# varlock bakes env into the bundle at build time (ssrInjectMode resolved-env),
# so these are build args, not runtime env.
ARG VITE_CONVEX_URL
ARG VITE_CONVEX_SITE_URL
ARG CONVEX_INTERNAL_URL
ARG VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=""
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL \
    VITE_CONVEX_SITE_URL=$VITE_CONVEX_SITE_URL \
    CONVEX_INTERNAL_URL=$CONVEX_INTERNAL_URL \
    VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=$VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
RUN cd apps/app && ./node_modules/.bin/vp build

FROM node:24-bookworm-slim AS app
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=app-build /repo/apps/app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

# ---------- convex function deploy (one-shot) ----------

FROM base AS deploy
COPY . .
RUN --mount=type=cache,id=pnpm-store-deploy,target=/pnpm/store \
    CI=1 pnpm install --frozen-lockfile --trust-lockfile \
      --filter @outlayr/backend... \
      --config.minimum-release-age-exclude=@hugeicons-pro/*
WORKDIR /repo/packages/backend
# Needs CONVEX_SELF_HOSTED_URL, CONVEX_SELF_HOSTED_ADMIN_KEY and SITE_URL in env.
CMD ["sh", "-c", "./node_modules/.bin/convex env set JWKS '' && ./node_modules/.bin/convex env set SITE_URL \"$SITE_URL\" && ./node_modules/.bin/convex deploy"]
