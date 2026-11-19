# Self-hosting

The Outlayr backend and web app run on any Docker host from two published images and the official Convex images. The bundle lives in `deploy/self-hosting/`. The marketing site and the mobile apps are not part of it.

| Service | Image | Port | Runs |
|---|---|---|---|
| `convex` | `ghcr.io/convex/convex-backend`, pinned | 3210 (API), 3211 (HTTP actions) | Always |
| `convex-dashboard` | `ghcr.io/convex/convex-dashboard`, pinned | 6791 | Always |
| `backend` | `ghcr.io/danestves/outlayr-backend` | none | Once per start: sets the deployment's variables, deploys the functions, exits 0 |
| `app` | `ghcr.io/danestves/outlayr-app` | 3080 | Always, once `backend` succeeded |

The Convex engine is Convex's own image at the commit in `docker-compose.yml`, never rebuilt or forked. Outlayr's images hold only the functions with the Convex CLI, and the built web app on Node. `.github/workflows/self-hosting-images.yml` publishes both for amd64 and arm64: `edge` from `main`, `vX.Y.Z` from a `vX.Y.Z` tag, and `latest` from a stable one. Until the first release only `edge` exists, so it is the default.

## Quick start

```sh
mkdir outlayr && cd outlayr
base=https://raw.githubusercontent.com/danestves/outlayr/main/deploy/self-hosting
curl -fsSLO "$base/docker-compose.yml"
curl -fsSL "$base/.env.example" -o .env
curl -fsSL "$base/convex.env.example" -o convex.env
```

1. In `.env`, set `APP_ORIGIN`, `CONVEX_CLOUD_ORIGIN` and `CONVEX_SITE_ORIGIN` to the addresses people will open. Change a port there if the host already uses it.
2. In `convex.env`, set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and uncomment one sign-in provider (see [Signing in](#signing-in)).
3. Start Convex and print an admin key:

    ```sh
    docker compose up -d convex
    docker compose exec convex ./generate_admin_key.sh
    ```

    Put the key in `.env` as `CONVEX_SELF_HOSTED_ADMIN_KEY`. It also signs you in to the dashboard.

4. Start the rest:

    ```sh
    docker compose up -d
    docker compose ps -a
    ```

    `backend` should show `Exited (0)` and `app` `healthy`. If `app` never starts, `docker compose logs backend` says why. Open `APP_ORIGIN`.

## Building from a checkout

The same stack, with both Outlayr images built from the working tree and tagged `:source`, so they never shadow a pulled tag:

```sh
git clone https://github.com/danestves/outlayr && cd outlayr/deploy/self-hosting
cp .env.example .env && cp convex.env.example convex.env
```

Fill both files as in steps 1 and 2 of the quick start, then:

```sh
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d convex
docker compose exec convex ./generate_admin_key.sh
# put the key in .env as CONVEX_SELF_HOSTED_ADMIN_KEY
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

Builds need no Hugeicons Pro token: only the native app and the marketing site use the paid icons, and the install runs with `--trust-lockfile` like `railpack.app.json`. The app image's build stage installs `g++`, `make` and `python3` to compile native modules; the backend image skips install scripts and needs none.

## Variables

### `.env`: read by Compose at every start

| Variable | Required | Notes |
|---|---|---|
| `APP_ORIGIN` | Yes | Public URL of the web app. Becomes `SITE_URL` on the deployment. |
| `CONVEX_CLOUD_ORIGIN` | Yes | Public URL of port 3210. The browser's WebSocket and the dashboard use it. |
| `CONVEX_SITE_ORIGIN` | Yes | Public URL of port 3211. Auth, webhooks and file URLs use it. |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Yes | From `generate_admin_key.sh`. Only `backend` reads it. |
| `IMAGE_TAG` | No | `edge` (default, follows `main`), `vX.Y.Z`, or `latest` once a release exists. |
| `IMAGE_REGISTRY`, `IMAGE_OWNER` | No | Default `ghcr.io` and `danestves`, for a fork or a mirror. |
| `APP_PORT`, `CONVEX_PORT`, `CONVEX_SITE_PORT`, `DASHBOARD_PORT` | No | Host ports, default 3080, 3210, 3211, 6791. |
| `BIND_ADDRESS` | No | Address the host ports listen on, default `0.0.0.0`. |
| `INSTANCE_NAME`, `INSTANCE_SECRET` | No | Empty, Convex generates the secret and keeps it in the `convex-data` volume. A new secret invalidates every admin key. |
| `CONVEX_VERSION` | No | Convex engine and dashboard image tag. Convex tags images by commit. |
| `DISABLE_BEACON` | No | Any value stops the Convex backend's anonymous usage beacon. |

### `convex.env`: the deployment's variables

`backend` pushes every uncommented line with `convex env set --force` on each start, then sets `SITE_URL` from `APP_ORIGIN`, `MCP_CONSENT_URL` to `<APP_ORIGIN>/connect` unless the file sets it, and `JWKS` to an empty string unless it already exists.

| Variables | Required | Enables |
|---|---|---|
| `BETTER_AUTH_SECRET` | Yes | Sessions. better-auth refuses to start without it. |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_EMAIL_TOKEN`, `EMAIL_FROM` | One provider | Email codes and passwords. |
| `GOOGLE_CLIENT_ID_WEB`, `GOOGLE_CLIENT_ID_IOS`, `GOOGLE_CLIENT_SECRET` | One provider | Google sign-in. |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_WEB_CLIENT_ID` | One provider | Apple sign-in. `APPLE_WEB_CLIENT_ID` defaults to `APPLE_CLIENT_ID`. |
| `JWKS` | No | Static auth signing key, see [auth-signing-key.md](./auth-signing-key.md). |
| `ANTHROPIC_API_KEY`, `AI_MODEL_ID`, `AI_FAST_MODEL_ID`, `AI_GROUNDED_MODEL_ID` | No | Scans, imports and enrichment. Model IDs default to the ones in the code. |
| `ELEVENLABS_API_KEY` | No | Voice entry transcription. |
| `OXR_APP_ID`, `COTIZAVE_API_KEY` | No | Exchange rates from Open Exchange Rates and Cotizave. |
| `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | No | Receipt photos, in R2 or another S3-compatible bucket. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | No | Web push. The keys are a P-256 pair in base64url. |
| `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` | No | Notion import. |
| `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `STRIPE_SECRET_KEY`, `REVENUECAT_STRIPE_PUBLIC_KEY` | No | Pro and web billing, see [web-billing.md](./web-billing.md). |
| `POSTHOG_PROJECT_TOKEN` | No | Server-side product analytics. |
| `MCP_CONSENT_URL` | No | Where MCP clients send people to approve a connection. |

### Baked into the image

Nothing a self-hoster sets is baked into the published images. The web app reads `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` and `CONVEX_INTERNAL_URL` from its environment when it starts, and the server writes the two public URLs into each page for the browser. Compose fills them from `.env`, and `CONVEX_INTERNAL_URL` points server renders at `http://convex:3210` over the Compose network.

A build that sets those variables keeps them: varlock bakes a build's resolved env into the server bundle (`docs/internals/env.md`), and baked values win. The hosted product builds that way. The published images are built with none.

`VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` is the one build-time setting left. The published app image has none, so web analytics stays off. Set it in `.env` and build from a checkout to turn it on.

## Signing in

No sign-in works until `convex.env` has `BETTER_AUTH_SECRET` and at least one provider.

- **Email.** Codes and passwords go out through Cloudflare Email Sending; there is no SMTP option. `EMAIL_FROM` must be an address that Cloudflare account may send from.
- **Google.** Create a web OAuth client with the redirect URI `<APP_ORIGIN>/api/auth/callback/google`. Google accepts only HTTPS URLs on a public domain (or `http://localhost`), so a plain-HTTP LAN address needs email sign-in instead. All three variables must be set: without an iOS client, set `GOOGLE_CLIENT_ID_IOS` to the web client ID.
- **Apple.** Needs a Services ID, a Sign in with Apple key and an HTTPS `APP_ORIGIN`, since Apple refuses plain HTTP return URLs.

Without RevenueCat every account stays on the free plan, with the free limits on scans and imports. AI features also need `ANTHROPIC_API_KEY` and each person's AI consent in the app.

## Moving to a new address

Change `APP_ORIGIN`, `CONVEX_CLOUD_ORIGIN` and `CONVEX_SITE_ORIGIN` in `.env`, then:

```sh
docker compose up -d
```

Compose recreates `convex` with the new origins, `backend` runs again and resets `SITE_URL`, and `app` starts with the new URLs. Nothing is rebuilt and the data stays in the volume. Then update the OAuth redirect URIs. Cookies belong to the old address, so everyone signs in once more.

## Behind a reverse proxy

Give each public URL its own hostname, or its own port, and proxy it to the matching host port. Port 3210 carries the client's WebSocket, so the proxy must pass `Upgrade` and `Connection` headers. With HTTPS in front, set the three origins to their `https://` URLs. The app and Convex take plain HTTP from the proxy. With the proxy on the same host, set `BIND_ADDRESS=127.0.0.1` so the plain HTTP ports stay off the network; the origins are then the proxy's URLs.

## Upgrading

```sh
docker compose pull
docker compose up -d
```

`backend` deploys the functions from the new image before `app` restarts. Set `IMAGE_TAG` to a `vX.Y.Z` release to upgrade on purpose instead of following `edge`. A new `docker-compose.yml` can move `CONVEX_VERSION` to a newer engine, so [back up](#backup-and-restore) before pulling one. From a checkout, `git pull` and run the source build command again.

## Backup and restore

Everything lives in the `outlayr_convex-data` volume: the database, stored files and the instance secret. Stop Convex while copying it.

```sh
docker compose stop convex
docker run --rm -v outlayr_convex-data:/data -v "$PWD":/backup alpine tar czf /backup/convex-data.tgz -C /data .
docker compose start convex
```

To restore, stop Convex, empty the volume and unpack:

```sh
docker compose stop convex
docker run --rm -v outlayr_convex-data:/data -v "$PWD":/backup alpine sh -c 'rm -rf /data/* && tar xzf /backup/convex-data.tgz -C /data'
docker compose up -d
```

For a portable snapshot that `convex import` can load into another deployment, run the CLI bundled in the backend image:

```sh
docker compose run --rm -v "$PWD":/backup --entrypoint ./node_modules/.bin/convex backend export --path /backup/snapshot.zip
```

From a checkout, add `-f docker-compose.yml -f docker-compose.build.yml` after `docker compose` so it uses the `:source` image.

## Traps

- **Never localhost.** The app server calls `CONVEX_SITE_ORIGIN` for auth, and Convex fetches its own JWKS from `CONVEX_SITE_ORIGIN` while `JWKS` is empty. Inside a container, `localhost` is that container. A LAN IP or a domain works from both sides.
- **Host firewalls.** With ufw or another default-deny firewall, containers cannot reach the host's own published ports, so the app's auth calls time out (`ConnectTimeoutError` in `docker compose logs app`). Allow the Compose network's subnet (`docker network inspect outlayr_default`) to the Convex ports, or serve the origins through a reverse proxy on ports the firewall already allows.
- **Comment out, do not blank.** An empty line in `convex.env` sets the variable to an empty string, and an empty Cloudflare or Google variable still switches that provider on, with blank credentials.
- **Removed lines stay.** Deleting a line from `convex.env` does not unset it. Remove it in the dashboard under Settings, Environment Variables.
- **The admin key follows the instance secret.** Losing the volume or changing `INSTANCE_SECRET` makes a new secret, so generate a new key.
- **Port collisions.** Home servers often hold 3000 and 3210 already. Change the host port in `.env`, and the matching origin with it.
