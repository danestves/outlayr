import { FunctionImpl, GroupImpl } from "@confect/server";
import { ConvexError } from "convex/values";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { components } from "../convex/_generated/api";
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
import { isPhotoName, merchantLogoUrl, ownsPhotoKey, photoKeyFor, photoOwnerFromKey } from "./lib/photoKeys";
import { currentLook, dieNotProfileMember, isReferenced, resolveLedger, sharedLedgers } from "./lib/profileLedger";
import { componentProvider, storageSetup } from "./lib/storageSetup";
import {
    NotAPhotoName,
    PHOTO_QUOTA_BYTES,
    PHOTO_URL_BATCH_LIMIT,
    PHOTO_URL_TTL_SECONDS,
    PhotoNotOwned,
    PhotoQuotaExceeded,
    PhotoReadTooLarge,
    PhotoUploadsUnconfirmed,
    UNCONFIRMED_UPLOAD_LIMIT,
    UploadBoundElsewhere,
} from "./photos";
import spec from "./photos.spec";
import { requirePro } from "./revenuecat";
import { syncOwner } from "./sync";

const storageIdFor = Effect.fn("Photos.storageIdFor")(function* storageIdFor(key: string) {
    const reader = yield* DatabaseReader;
    const row = yield* reader
        .table("photoObjects")
        .get("by_key", key)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
    return row ? row.storageId : null;
});

// Keys written before the component still carry the app's own `_storage` id, so they resolve here, never in a bucket.
const legacyUrls = Effect.fn("Photos.legacyUrls")(function* legacyUrls(keys: readonly string[]) {
    const storage = yield* StorageReader;
    const stored = yield* Effect.all(
        keys.map((key) => storageIdFor(key).pipe(Effect.map((storageId) => ({ key, storageId })))),
        { concurrency: "unbounded" }
    );
    const urls = yield* Effect.all(
        stored.map(({ key, storageId }) =>
            storageId === null
                ? Effect.succeed(null)
                : storage.getUrl(storageId).pipe(
                      Effect.map((url) => ({ key, url: url.href })),
                      Effect.catchTags({ BlobNotFoundError: () => Effect.succeed(null) })
                  )
        ),
        { concurrency: "unbounded" }
    );
    return {
        unmapped: stored.flatMap(({ key, storageId }) => (storageId === null ? [key] : [])),
        urls: urls.filter((entry): entry is { key: string; url: string } => entry !== null),
    };
});

// Refused before a url is minted: once a client holds a signed upload url the bytes are the store's problem. It
// bounds what is already stored, because this upload's size is unknown until the bytes exist.
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

// The key derives from the file name, so a retried upload lands on the same key and a bucket has nothing to roll
// back. It is recorded at 0 bytes before the url goes out, so a never-confirmed upload stays findable for purge and
// quota.
const requestUpload = FunctionImpl.make(
    databaseSchema,
    spec,
    "requestUpload",
    Effect.fn("Photos.requestUpload")(
        function* requestUpload(args) {
            const ctx = yield* MutationCtx;
            const userId = yield* requireUserId(ctx);
            const ledger = yield* resolveLedger(userId, args.profileId);
            yield* requirePro(ctx, ledger.ownerId);
            if (!isPhotoName(args.name)) {
                return yield* new NotAPhotoName({ name: args.name });
            }
            const setup = yield* storageSetup;
            // A half-set bucket must not silently start storing photos somewhere else.
            if (setup.kind === "unconfigured") {
                return yield* Effect.die(new ConvexError({ code: "STORAGE_UNCONFIGURED" }));
            }
            yield* checkPhotoQuota(userId);
            const key = photoKeyFor(userId, args.name);
            yield* reserveUploadKey(userId, key);
            const { method, url } = yield* Effect.promise(() =>
                ctx.runMutation(components.storage.objects.uploadUrl, { key, provider: setup })
            );
            return { key, method, url };
        },
        Effect.catchTags({
            NotAPhotoName: dieAsConvexError,
            NotProfileMember: dieNotProfileMember,
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

// An action because the component reads the object back out of the bucket. A crash before this call leaves a durable
// photo with no accounting, which the next upload of the same key repairs.
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
            const setup = yield* storageSetup;
            const request = { key: args.key, provider: componentProvider(setup) };
            const upload = yield* Effect.promise(() =>
                ctx.runAction(
                    components.storage.objects.confirmUpload,
                    args.storageId === undefined ? request : { ...request, storageId: args.storageId }
                )
            );
            if (upload.kind === "boundElsewhere") {
                return yield* new UploadBoundElsewhere();
            }
            // A missing object records zero: losing a photo is worse than under-counting the quota.
            yield* runMutation(refs.internal.photos.recordPhotoSize, {
                bytes: upload.kind === "stored" ? upload.bytes : 0,
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

            const own = args.keys.filter((key) => ownsPhotoKey(userId, key));
            const shared = yield* sharedPhotoKeys(
                userId,
                args.keys.filter((key) => !ownsPhotoKey(userId, key) && photoOwnerFromKey(key) !== null)
            );
            const owned = [...own, ...shared];
            const legacy = yield* legacyUrls(owned);
            let minted: readonly { key: string; url: string }[] = [];
            if (legacy.unmapped.length > 0) {
                const setup = yield* storageSetup;
                minted = yield* Effect.promise(() =>
                    ctx.runMutation(components.storage.objects.urls, {
                        expiresIn: PHOTO_URL_TTL_SECONDS,
                        keys: legacy.unmapped,
                        provider: componentProvider(setup),
                    })
                );
            }
            const merchants = args.keys.flatMap((key) => {
                const url = merchantLogoUrl(key);
                return url === null ? [] : [{ key, url }];
            });
            return [...merchants, ...legacy.urls, ...minted];
        },
        Effect.catchTags({ PhotoReadTooLarge: dieAsConvexError, Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

// Another person's photo is readable only where a ledger they belong to names it, which only they can start
// (`withoutForeignPhoto` in sync.impl.ts), or as a joined profile's icon. Membership also covers keys stored before.
const sharedPhotoKeys = Effect.fn("Photos.sharedPhotoKeys")(function* sharedPhotoKeys(
    userId: string,
    keys: readonly string[]
) {
    if (keys.length === 0) {
        return [];
    }
    const shared = yield* sharedLedgers(userId);
    const readable = yield* Effect.all(
        keys.map((key) =>
            Effect.gen(function* namedInSharedLedger() {
                const uploader = photoOwnerFromKey(key);
                for (const ledger of shared.ledgers) {
                    if (uploader !== null && ledger.parties.has(uploader) && (yield* isReferenced(ledger.key, key))) {
                        return true;
                    }
                }
                for (const row of shared.joined) {
                    if (
                        uploader === row.ownerId &&
                        (yield* currentLook(row.ownerId, row.profileId, row.look))?.imageKey === key
                    ) {
                        return true;
                    }
                }
                return false;
            })
        ),
        { concurrency: "unbounded" }
    );
    return keys.filter((_, index) => readable[index]);
});

// A bucket cannot share a transaction with the tombstone, so the reference goes before the bytes: a crash leaks a
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
            const profiles = yield* reader
                .table("profiles")
                .index("by_user_and_localId", (q) => q.eq("userId", userId))
                .collect();
            // Every membership, past ones too: entries stay in a profile after their author leaves it.
            const memberships = yield* reader
                .table("profileMembers")
                .index("by_memberId_and_leftAt", (q) => q.eq("memberId", userId))
                .collect();
            const owners = new Set([
                userId,
                syncOwner(userId, args.profileId),
                ...profiles.map((profile) => syncOwner(userId, profile.localId)),
                ...memberships.map((row) => syncOwner(row.ownerId, row.profileId)),
            ]);
            for (const owner of owners) {
                if (yield* isReferenced(owner, args.key)) {
                    return { released: false };
                }
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
            const setup = yield* storageSetup;
            yield* Effect.promise(() =>
                ctx.runMutation(components.storage.objects.remove, {
                    key: args.key,
                    provider: componentProvider(setup),
                })
            );
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
    Layer.provide(readUrls),
    Layer.provide(releaseUnreferenced),
    GroupImpl.finalize
);
