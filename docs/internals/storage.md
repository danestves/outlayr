# Storage

Files and their urls go through the `@outlayr/storage` Convex component (`packages/storage/src/component/{provider,bucket,objects}.ts`), which knows keys and bytes, not what a file is. Receipt and account photos (`confect/photos.impl.ts`) are its first caller. The component stores in Convex file storage by default and in any S3-compatible bucket the deployment configures. `lib/storageSetup.ts` reads `STORAGE_PROVIDER` and the provider variables per call; the app passes the resolved `Provider` to every component call. A new kind of file needs its own key scheme and caller, not component changes.

## Traps

- **Convex file storage takes POST, a bucket takes PUT.** `objects.uploadUrl` answers `{ method, url }` and the clients use that method. A PUT to the Convex upload url gets a 405, so the old hardcoded PUT never worked on the default store.
- **Buckets go through `files-sdk`'s `s3-fetch` adapter.** It signs with aws4fetch, not the AWS SDK, inside a Convex mutation. With `S3_ENDPOINT` unset the endpoint is `https://s3.<region>.amazonaws.com`. R2 is the same adapter with region `auto`.
- **Components cannot read the app's environment.** The provider travels in the arguments of every call, so a credential rotation needs no component redeploy.
- **Bucket credentials ride in the scheduled delete's arguments.** `objects.remove` schedules `removeFromBucket` with the provider, as the old R2 component did, because a mutation cannot make the network call.
- **Component file storage is a separate namespace from the app's.** An app `_storage` id means nothing inside the component, so `confirmUpload` takes a `storageId` as a plain string and binds only what the component itself stored. `pdfImport` temp uploads still use app storage directly.
- **Photos: `photoObjects` is legacy only.** Photo rows written before the component still carry app storage ids, so reads and deletes route through them first; nothing writes new ones.
- **A half-set provider never falls back.** `STORAGE_PROVIDER` unset detects r2 or s3 from any of its variables, and an incomplete set is `unconfigured`: minting an upload url then fails with `STORAGE_UNCONFIGURED` instead of quietly storing elsewhere. Reads and deletes still run against Convex storage.
- **Adding a provider touches three places.** Add a kind to `provider.ts`, a branch to `bucketFor` in `bucket.ts`, and the parsing to `lib/storageSetup.ts`.
