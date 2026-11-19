FROM node:24-bookworm-slim

RUN npm install --global pnpm@11.20.0

WORKDIR /outlayr
COPY . .
RUN CI=1 pnpm install --prod --ignore-scripts --frozen-lockfile --trust-lockfile --filter @outlayr/backend...

WORKDIR /outlayr/packages/backend
ENTRYPOINT ["sh", "/outlayr/deploy/self-hosting/backend-deploy.sh"]
