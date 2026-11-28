#!/bin/sh
set -eu

env_file=/run/outlayr/convex.env
convex=./node_modules/.bin/convex

fail() {
    echo "$1" >&2
    exit 1
}

[ -n "${CONVEX_SELF_HOSTED_URL:-}" ] || fail "Set CONVEX_SELF_HOSTED_URL to the Convex backend, such as http://convex:3210."
[ -n "${CONVEX_SELF_HOSTED_ADMIN_KEY:-}" ] ||
    fail "Set CONVEX_SELF_HOSTED_ADMIN_KEY. Generate one with: docker compose exec convex ./generate_admin_key.sh"
[ -n "${SITE_URL:-}" ] || fail "Set SITE_URL to the web app's public URL, such as http://192.168.1.10:3080."
[ -f "$env_file" ] || fail "Mount your convex.env at $env_file."

node -e '
const url = `${process.env.CONVEX_SELF_HOSTED_URL}/version`;
const deadline = Date.now() + 120_000;
const poll = () =>
    fetch(url).then(
        (response) => (response.ok ? process.exit(0) : retry()),
        () => retry()
    );
const retry = () => (Date.now() > deadline ? process.exit(1) : setTimeout(poll, 2000));
poll();
' || fail "No answer from $CONVEX_SELF_HOSTED_URL after two minutes."

$convex env set --force --from-file "$env_file"
$convex env set SITE_URL "$SITE_URL"
grep -q '^MCP_CONSENT_URL=' "$env_file" || $convex env set MCP_CONSENT_URL "$SITE_URL/connect"
$convex env list | grep -q '^JWKS=' || $convex env set JWKS ''

$convex deploy -y
$convex run banking:syncInstitutions || echo "Bank list sync failed; the nightly run will retry." >&2
