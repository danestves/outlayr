FROM node:24-bookworm-slim AS build

RUN apt-get update \
    && apt-get install --yes --no-install-recommends g++ make python3 \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.20.0

WORKDIR /outlayr
COPY . .
RUN CI=1 pnpm install --frozen-lockfile --trust-lockfile --filter @outlayr/app...

ARG VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=

WORKDIR /outlayr/apps/app
RUN ./node_modules/.bin/varlock codegen && ./node_modules/.bin/vp build

FROM node:24-bookworm-slim

ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /outlayr/apps/app/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=6 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/robots.txt').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", ".output/server/index.mjs"]
