import { FunctionImpl, GroupImpl } from "@confect/server";
import { ConvexError } from "convex/values";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import {
    ActionCtx,
    DatabaseReader,
    DatabaseWriter,
    MutationCtx,
    MutationRunner,
    QueryCtx,
    QueryRunner,
    StorageReader,
    StorageWriter,
} from "./_generated/services";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { isPhotoName, ownsPhotoKey, photoKeyFor, photoOwnerFromKey } from "./lib/photoKeys";
import {
    IMAGE_KEY_TABLES,
    NotAPhotoName,
    PHOTO_QUOTA_BYTES,
    PHOTO_URL_BATCH_LIMIT,
    PHOTO_URL_TTL_SECONDS,
    PhotoNotOwned,
    PhotoQuotaExceeded,
    PhotoReadTooLarge,
    PhotoUploadsUnconfirmed,
    r2,
    UNCONFIRMED_UPLOAD_LIMIT,
    UploadBoundElsewhere,
    usingR2,
} from "./photos";
import spec from "./photos.spec";
import { requirePro } from "./revenuecat";

const storageIdFor = Effect.fn("Photos.storageIdFor")(function* storageIdFor(key: string) {
    const reader = yield* DatabaseReader;
    const row = yield* reader
        .table("photoObjects")
        .get("by_key", key)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
    return row ? row.storageId : null;
});

const photoUrl = Effect.fn("Photos.photoUrl")(function* photoUrl(key: string) {
    const storageId = yield* storageIdFor(key);
    if (storageId) {
        const storage = yield* StorageReader;
        return yield* storage.getUrl(storageId).pipe(
            Effect.map((url) => url.href),
            Effect.catchTags({ BlobNotFoundError: () => Effect.succeed(null) })
        );
    }
    return (yield* usingR2) ? yield* Effect.promise(() => r2.getUrl(key, { expiresIn: PHOTO_URL_TTL_SECONDS })) : null;
});

// Refused before a url is minted: once a client holds a signed PUT the bytes are R2's problem. It bounds what is
// already stored, because this upload's size is unknown until the bytes exist.
const checkPhotoQuota = Effect.fn("Photos.checkPhotoQuota")(function* checkPhotoQuota(userId: string) {
    const reader = yield* DatabaseReader;
    const stored = yield* reader
        .table("photoSizes")
        .index("by_user", (q) => q.eq("userId", userId))
        .collect();
    const used = stored.reduce((total, row) => total + row.bytes, 0);
    if (used >= PHOTO_QUOTA_BYTES) {
        return yield* new PhotoQuotaExceeded({ limit: PHOTO_QUOTA_BYTES, used });
    }
});

// An unconfirmed object has no size for the quota to count, so without this cap an account could mint urls forever.
const reserveUploadKey = Effect.fn("Photos.reserveUploadKey")(function* reserveUploadKey(userId: string, key: string) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const existing = yield* reader
        .table("photoSizes")
        .get("by_key", key)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
    if (existing) {
        return;
    }
    const unweighed = yield* reader
        .table("photoSizes")
        .index("by_user_and_bytes", (q) => q.eq("userId", userId).eq("bytes", 0))
        .take(UNCONFIRMED_UPLOAD_LIMIT);
    if (unweighed.length >= UNCONFIRMED_UPLOAD_LIMIT) {
        return yield* new PhotoUploadsUnconfirmed({ limit: UNCONFIRMED_UPLOAD_LIMIT });
    }
    yield* writer.table("photoSizes").insert({ bytes: 0, key, userId });
});

// The key derives from the file name, so a retried PUT lands on the same key: R2 has nothing to roll back. It is
// recorded at 0 bytes before the url goes out, so a never-confirmed upload stays findable for purge and quota.
const requestUpload = FunctionImpl.make(
    databaseSchema,
    spec,
    "requestUpload",
    Effect.fn("Photos.requestUpload")(
        function* requestUpload(args) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireUserId(ctx);
            yield* requirePro(ctx, userId);
            if (!isPhotoName(args.name)) {
                return yield* new NotAPhotoName({ name: args.name });
            }
            yield* checkPhotoQuota(userId);
            const key = photoKeyFor(userId, args.name);
            yield* reserveUploadKey(userId, key);
            if (yield* usingR2) {
                return yield* Effect.promise(() => r2.generateUploadUrl(key));
            }
            const storage = yield* StorageWriter;
            const url = yield* storage.generateUploadUrl;
            return { key, url: url.href };
        },
        Effect.catchTags({
            NotAPhotoName: dieAsConvexError,
            ProRequired: dieAsConvexError,
            Unauthenticated: dieAsConvexError,
            PhotoQuotaExceeded: ({ limit, used }) =>
                Effect.die(new ConvexError({ code: "PHOTO_QUOTA_EXCEEDED", limit, used })),
            PhotoUploadsUnconfirmed: ({ limit }) =>
                Effect.die(new ConvexError({ code: "PHOTO_UPLOADS_UNCONFIRMED", limit })),
        }),
        Effect.orDie
    )
);

const callerId = FunctionImpl.make(
    databaseSchema,
    spec,
    "callerId",
    Effect.fn("Photos.callerId")(
        function* callerId() {
            const ctx = yield* QueryCtx;
            return yield* requireUserId(ctx);
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

// An action because `syncMetadata` reads the object back out of R2. A crash before this call leaves a durable photo
// with no accounting, which the next upload of the same key repairs.
const confirmUpload = FunctionImpl.make(
    databaseSchema,
    spec,
    "confirmUpload",
    Effect.fn("Photos.confirmUpload")(
        function* confirmUpload(args) {
            const ctx = yield* ActionCtx;
            const { runQuery } = yield* QueryRunner;
            const { runMutation } = yield* MutationRunner;
            const userId = yield* runQuery(refs.internal.photos.callerId, {});
            if (!ownsPhotoKey(userId, args.key)) {
                return yield* new PhotoNotOwned();
            }
            if (args.storageId) {
                yield* runMutation(refs.internal.photos.mapStorageId, {
                    key: args.key,
                    storageId: args.storageId,
                });
                return null;
            }
            yield* Effect.promise(() => r2.syncMetadata(ctx, args.key));
            // Read after the sync, or there is no metadata row. A missing size records zero: losing a photo is worse.
            const metadata = yield* Effect.promise(() => r2.getMetadata(ctx, args.key));
            yield* runMutation(refs.internal.photos.recordPhotoSize, {
                bytes: metadata?.size ?? 0,
                key: args.key,
            });
            return null;
        },
        Effect.catchTags({ PhotoNotOwned: dieAsConvexError }),
        Effect.orDie
    )
);

// A malformed key records nothing rather than throwing, which would fail an upload whose bytes are safely stored.
const writePhotoSize = Effect.fn("Photos.writePhotoSize")(function* writePhotoSize(key: string, bytes: number) {
    const userId = photoOwnerFromKey(key);
    if (userId === null) {
        return;
    }
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const existing = yield* reader
        .table("photoSizes")
        .get("by_key", key)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
    if (existing) {
        yield* writer.table("photoSizes").patch(existing._id, { bytes });
        return;
    }
    yield* writer.table("photoSizes").insert({ bytes, key, userId });
});

const forgetPhotoSize = Effect.fn("Photos.forgetPhotoSize")(function* forgetPhotoSize(key: string) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const row = yield* reader
        .table("photoSizes")
        .get("by_key", key)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
    if (row) {
        yield* writer.table("photoSizes").delete(row._id);
    }
});

const recordPhotoSize = FunctionImpl.make(
    databaseSchema,
    spec,
    "recordPhotoSize",
    Effect.fn("Photos.recordPhotoSize")(function* recordPhotoSize(args) {
        yield* writePhotoSize(args.key, args.bytes);
        return null;
    }, Effect.orDie)
);

const mapStorageId = FunctionImpl.make(
    databaseSchema,
    spec,
    "mapStorageId",
    Effect.fn("Photos.mapStorageId")(
        function* mapStorageId(args) {
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;
            const storage = yield* StorageWriter;
            const boundElsewhere = yield* reader
                .table("photoObjects")
                .index("by_storageId", (q) => q.eq("storageId", args.storageId))
                .first();
            if (Option.isSome(boundElsewhere) && boundElsewhere.value.key !== args.key) {
                return yield* new UploadBoundElsewhere();
            }
            const existing = yield* reader
                .table("photoObjects")
                .get("by_key", args.key)
                .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
            const stored = yield* reader
                .table("_storage")
                .get(args.storageId)
                .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
            yield* writePhotoSize(args.key, stored?.size ?? 0);
            if (existing) {
                if (existing.storageId !== args.storageId) {
                    yield* storage.delete(existing.storageId);
                    yield* writer.table("photoObjects").patch(existing._id, { storageId: args.storageId });
                }
                return null;
            }
            yield* writer.table("photoObjects").insert({
                key: args.key,
                storageId: args.storageId,
            });
            return null;
        },
        Effect.catchTags({ UploadBoundElsewhere: dieAsConvexError }),
        Effect.orDie
    )
);

// A mutation though it writes nothing: Convex caches a query until its read set changes, so an expired url would
// be served forever. An unowned key is dropped, not refused, so one stale key does not cost the whole batch.
const readUrls = FunctionImpl.make(
    databaseSchema,
    spec,
    "readUrls",
    Effect.fn("Photos.readUrls")(
        function* readUrls(args) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireUserId(ctx);
            if (args.keys.length > PHOTO_URL_BATCH_LIMIT) {
                return yield* new PhotoReadTooLarge({ keys: args.keys.length, limit: PHOTO_URL_BATCH_LIMIT });
            }

            const owned = args.keys.filter((key) => ownsPhotoKey(userId, key));
            const minted = yield* Effect.all(
                owned.map((key) => photoUrl(key).pipe(Effect.map((url) => (url === null ? null : { key, url })))),
                { concurrency: "unbounded" }
            );
            return minted.filter((entry): entry is { key: string; url: string } => Boolean(entry));
        },
        Effect.catchTags({ PhotoReadTooLarge: dieAsConvexError, Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

// Tombstoned rows count: undo restores from them and a device that has not pulled yet still renders them.
const isReferenced = Effect.fn("Photos.isReferenced")(function* isReferenced(userId: string, key: string) {
    const reader = yield* DatabaseReader;
    // The first table that names the key answers the question; running them all would read rows nobody needs.
    for (const table of IMAGE_KEY_TABLES) {
        const row = yield* reader
            .table(table)
            .index("by_user_and_imageKey", (q) => q.eq("userId", userId).eq("imageKey", key))
            .first();
        if (Option.isSome(row)) {
            return true;
        }
    }
    return false;
});

// R2 cannot share a transaction with the tombstone, so the reference goes before the bytes: a crash leaks a
// reclaimable object instead of leaving a row naming missing bytes. A device mid-download gets a 404 and retries.
const releaseUnreferenced = FunctionImpl.make(
    databaseSchema,
    spec,
    "releaseUnreferenced",
    Effect.fn("Photos.releaseUnreferenced")(
        function* releaseUnreferenced(args) {
            const ctx = yield* MutationCtx;
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;
            const storage = yield* StorageWriter;
            const userId = yield* requireUserId(ctx);
            if (!ownsPhotoKey(userId, args.key)) {
                return yield* new PhotoNotOwned();
            }
            if (yield* isReferenced(userId, args.key)) {
                return { released: false };
            }
            const mapping = yield* reader
                .table("photoObjects")
                .get("by_key", args.key)
                .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
            if (mapping) {
                yield* writer.table("photoObjects").delete(mapping._id);
                yield* storage.delete(mapping.storageId);
                yield* forgetPhotoSize(args.key);
                return { released: true };
            }
            if (yield* usingR2) {
                yield* Effect.promise(() => r2.deleteObject(ctx, args.key));
            }
            yield* forgetPhotoSize(args.key);
            return { released: true };
        },
        Effect.catchTags({ PhotoNotOwned: dieAsConvexError, Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(requestUpload),
    Layer.provide(callerId),
    Layer.provide(confirmUpload),
    Layer.provide(recordPhotoSize),
    Layer.provide(mapStorageId),
    Layer.provide(readUrls),
    Layer.provide(releaseUnreferenced),
    GroupImpl.finalize
);
