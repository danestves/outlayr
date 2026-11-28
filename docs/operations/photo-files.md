# Photo files

Receipt photos are served by a Worker in `apps/files`, reading the `outlayr-files` bucket through its binding. It answers on two routes:

- `app.tryoutlayr.com/photos/*`, the URLs the web app already renders. The browser sends the `convex_jwt` session cookie with them.
- `files.tryoutlayr.com/<key>`, for the native app, with `Authorization: Bearer <Convex token>`.

The Worker checks the token against the backend's signing keys (`<CONVEX_SITE_URL>/api/auth/convex/jwks`) and serves `transaction-photos/<userId>/…` to that user straight from the bucket. Convex is still called, through `photos:readUrls`, for two cases: another person's photo, which needs the profile membership rule, and a photo stored before the bucket existed, which lives in Convex file storage. A web request with no valid cookie falls through to the app's own `/photos` route, which works without the Worker. When Convex or the bucket fails the Worker answers `503` rather than retrying the same call through the app.

Responses carry `Cache-Control: private`, so only the visitor's browser keeps a photo, never Cloudflare's edge.

## Deploying

`CONVEX_SITE_URL` in `apps/files/wrangler.jsonc` must be the exact `iss` of production tokens, or every request is refused and the web falls back to Convex. Deploy, then check one of your own photos answers `200` without a Convex call:

```sh
vp run --filter @outlayr/files deploy
```

To take the Worker out of the path, delete the `app.tryoutlayr.com/photos/*` route in the Cloudflare dashboard; the app route answers again at once.

## Limits

A token stays valid for its full lifetime (`CONVEX_JWT_SECONDS`, a day) after its session is signed out or revoked, because the Worker never asks Convex about the session. A person removed from a shared profile can keep loading a shared photo for up to five minutes, the Worker's grant cache, plus whatever their browser cached. A photo from before the bucket is a redirect to a Convex file URL, which stays valid for whoever kept it until the file is deleted.
