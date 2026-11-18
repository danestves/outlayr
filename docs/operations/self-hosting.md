# Self-hosting with Docker

`deploy/` ships a Compose stack that runs the whole product: the self-hosted Convex backend, its admin dashboard, a one-shot job that pushes the backend functions, and the web dashboard (`apps/app`). It is aimed at home servers and small VPSes, not at production scale.

## First boot

```sh
cd deploy
cp .env.example .env
openssl rand -hex 32   # paste into .env as INSTANCE_SECRET
```

Start only the backend, generate the admin key, then bring everything up:

```sh
docker compose up -d backend
docker compose exec backend ./generate_admin_key.sh
# paste the printed key into .env as CONVEX_SELF_HOSTED_ADMIN_KEY
docker compose up -d --build
```

`deploy` runs once per `up`: it sets `JWKS` (empty, which makes better-auth serve the key over HTTP — see [auth-signing-key](./auth-signing-key.md)), sets `SITE_URL`, and pushes the functions with `convex deploy`. `app` waits for it to finish.

The web dashboard is at `http://<host>:3080`, the Convex admin dashboard at `http://<host>:6791` (sign in with the admin key).

## Sign-in does not work until one auth provider is configured

Set at least one block with `convex env set` (or the dashboard's env UI), then use the app:

| Block | Variables | Gets you |
| --- | --- | --- |
| Cloudflare Email | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_EMAIL_TOKEN`, `EMAIL_FROM` | email + password and OTP sign-in |
| Google | `GOOGLE_CLIENT_ID_WEB`, `GOOGLE_CLIENT_SECRET` | Sign in with Google |
| Apple | `APPLE_CLIENT_ID`, `APPLE_KEY_ID`, `APPLE_TEAM_ID`, `APPLE_PRIVATE_KEY` (and `APPLE_WEB_CLIENT_ID` for web) | Sign in with Apple |

```sh
docker compose run --rm deploy \
  ./node_modules/.bin/convex env set GOOGLE_CLIENT_ID_WEB "…"
```

## Optional deployment variables

Set them the same way on the Convex deployment, no rebuild needed:

| Variables | Enables |
| --- | --- |
| `OXR_APP_ID` (or `COTIZAVE_API_KEY`) | daily exchange rates for all currencies |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | web push (subscription and payroll reminders) |
| `ANTHROPIC_API_KEY` / `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL` | AI features ([provider config](./ai-providers.md)) |
| `ELEVENLABS_API_KEY` / `STT_*` | voice entry ([provider config](./ai-providers.md)) |
| `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | receipt photos in Cloudflare R2 (Convex storage otherwise) |
| `STRIPE_SECRET_KEY`, `REVENUECAT_*` | Pro checkout and billing |
| `POSTHOG_*`, `GITHUB_TOKEN` | analytics, the open-stats page |

## Gotchas

- **`VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` and `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` are build args.** varlock bakes them into the web bundle, so a change needs `docker compose build app && docker compose up -d` — a restart is not enough. They and `CONVEX_CLOUD_ORIGIN`/`CONVEX_SITE_ORIGIN`/`SITE_URL` should all point at the same host users browse to.
- **`JWKS` must exist even when empty.** `convex deploy` fails without it, which is why `deploy` sets it before pushing.
- **Ports are likely taken** on a shared box (3000 especially). Override `API_PORT`, `SITE_PORT`, `DASHBOARD_PORT`, `APP_PORT` in `.env`; the app always listens on 3000 inside its container.
- **The icons registry is paid.** `apps/site` and `apps/native` depend on `@hugeicons-pro/*` (npm.hugeicons.com). The web dashboard uses only the free icons, so the Dockerfile's `--config.minimum-release-age-exclude` flag is enough — no license token needed for this stack.
- **Compose interpolation** uses `${VAR:-default}`; app launchers that rewrite the file (e.g. CasaOS) may not support it — inline the values in their copy instead.

## Upgrading

Pull the repo checkout, rebuild, and bring it up — `deploy` re-runs `convex deploy` against the existing data volume:

```sh
git pull
docker compose pull backend dashboard
docker compose up -d --build
```
