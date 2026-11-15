# Auth signing key (JWKS)

Convex verifies every request's token with the better-auth signing key. When the deployment's `JWKS` variable holds that key, Convex reads it from the auth config. When `JWKS` is empty, Convex fetches the key over HTTP from `/api/auth/convex/jwks` before each request it verifies, which cost about 150 ms per server-side call in production.

Every deployment needs `JWKS` set before a deploy, even to an empty string. Unset, `convex deploy` and `convex dev` fail with "Environment variable JWKS is used in auth config file but its value was not set". Production holds the real key and preview holds an empty string. A local backend needs it once:

```sh
npx convex env set JWKS ''
```

## Filling it from the jwks table

Run from `packages/backend` with the target deployment's credentials, then deploy so the auth config reads it. The value holds the private key: pipe it, never print it.

```sh
npx convex data --component betterAuth jwks --format jsonl --limit 100 \
  | jq -cs 'sort_by(.createdAt) | reverse | map({id: ._id, publicKey, privateKey, createdAt, alg: "RS256"})' \
  | npx convex env set JWKS
```

`alg` must be set: without it the library publishes the key as EdDSA and no token verifies. One key is about 3.8 KB, and a Convex variable holds 8 KiB, so keep at most two.

## Rotating

While `JWKS` is set, better-auth cannot create a key, so `jwksRotateOnTokenGenerationError` does nothing. To rotate, set `JWKS` to an empty string and deploy, rotate the key, then fill it again from the table and deploy.
