# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build

RUN apt-get update \
    && apt-get install --yes --no-install-recommends g++ git make python3 \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.20.0

WORKDIR /outlayr
COPY . .
# The root prepare script runs `vp config`, which needs a git repository.
RUN git init --quiet
# The token is removed in the same layer so the cached build stage never holds it.
RUN --mount=type=secret,id=hugeicons,env=HUGEICONS_PRO_TOKEN \
    pnpm config set //npm.hugeicons.com/:_authToken "$HUGEICONS_PRO_TOKEN" --location user \
    && CI=1 pnpm install --frozen-lockfile --trust-lockfile --filter @outlayr/site... --filter @outlayr/native \
    && pnpm config delete //npm.hugeicons.com/:_authToken --location user

ARG VITE_CONVEX_URL
ARG VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=

WORKDIR /outlayr/apps/site
RUN ./node_modules/.bin/vp build

FROM node:24-bookworm-slim

ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /outlayr/apps/site/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=6 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", ".output/server/index.mjs"]
