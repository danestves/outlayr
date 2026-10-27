import { getTableName } from "drizzle-orm";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Latch from "effect/Latch";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";

import type { Database } from "@/db/client";
import { appStates, launchAndForegrounds, listen, WatchAppState, WatchTableWrites } from "@/lib/app-events";

import type { AppMetaError } from "./app-meta-core";
import type { LogoReplateError } from "./logo-replate-core";
import { PHOTO_TABLES } from "./photo-store-core";
import type { PhotoReconciliation, PhotoStoreError } from "./photo-store-core";
import type { PhotoSyncResult, PhotoTransferError } from "./photo-sync-core";
import { isSyncEnabled } from "./sync-outbox-core";
import { invalidateAll } from "./table-invalidation";

const PHOTO_TABLE_NAMES = PHOTO_TABLES.map((photoTable) => getTableName(photoTable.table));

const PHOTO_DEBOUNCE = Duration.seconds(5);

const PhotoStep = Schema.Literals(["reconcile", "sync"]);

const FAILED: Record<typeof PhotoStep.Type, string> = {
    reconcile: "Photo reconcile failed",
    sync: "Photo sync failed",
};

export class PhotoSyncError extends Schema.TaggedError<PhotoSyncError>()("PhotoSyncError", {
    cause: Schema.Defect(),
    message: Schema.String,
    step: PhotoStep,
}) {}

export class PhotoPasses extends Context.Service<
    PhotoPasses,
    {
        readonly reconcile: (db: Database, nowMs: number) => Effect.Effect<PhotoReconciliation, PhotoStoreError>;
        readonly replateLogos: (db: Database) => Effect.Effect<number, AppMetaError | LogoReplateError>;
        readonly sync: (db: Database) => Effect.Effect<PhotoSyncResult, PhotoTransferError>;
    }
>()("outlayr/data/PhotoSync/PhotoPasses") {}

/**
 * A separate pass from `runSync`: one round trip per file against another service would otherwise hold up the
 * record stream every screen reads.
 */
export class PhotoSync extends Context.Service<
    PhotoSync,
    {
        /**
         * Once per launch, not per foreground: the unreferenced-file sweep would widen the window in which a
         * picked-but-unsaved photo survives only on the purge grace period.
         */
        readonly reconcile: (db: Database) => Effect.Effect<void, never, PhotoPasses>;
        readonly run: (db: Database) => Effect.Effect<void, never, PhotoPasses>;
    }
>()("outlayr/data/PhotoSync") {}

const failedAt = (step: typeof PhotoStep.Type) => (cause: unknown) =>
    new PhotoSyncError({ cause, message: FAILED[step], step });

export const make = Effect.gen(function* make() {
    const watchAppState = yield* WatchAppState;
    const watchTableWrites = yield* WatchTableWrites;
    const inFlight = yield* Semaphore.make(1);
    const reconciles = new WeakMap<Database, Latch.Latch>();
    const reconciled = (db: Database) => {
        const latch = reconciles.get(db) ?? Latch.makeUnsafe(false);
        reconciles.set(db, latch);
        return latch;
    };

    const reconcile = Effect.fn("PhotoSync.reconcile")(function* reconcile(db: Database) {
        const passes = yield* PhotoPasses;
        const nowMs = yield* Clock.currentTimeMillis;
        // The logo repair matches rows by photo path, so it waits for the reconcile to repoint stale ones.
        yield* passes
            .reconcile(db, nowMs)
            .pipe(
                Effect.mapError(failedAt("reconcile")),
                Effect.andThen(passes.replateLogos(db).pipe(Effect.mapError(failedAt("reconcile")))),
                Effect.catchTags({ PhotoSyncError: (error) => Effect.logError(error.message, error.cause) }),
                Effect.uninterruptible
            );
        yield* reconciled(db).open;
    });

    const run = Effect.fn("PhotoSync.run")(function* run(db: Database) {
        const passes = yield* PhotoPasses;
        // After the reconciliation: running first would upload against paths it is about to repair.
        yield* reconciled(db).await;

        const cycle = Effect.gen(function* cycle() {
            if (!(yield* isSyncEnabled(db).pipe(Effect.mapError((error) => failedAt("sync")(error.cause))))) {
                return;
            }
            const { downloaded } = yield* passes.sync(db).pipe(Effect.mapError(failedAt("sync")));
            if (downloaded > 0) {
                // Only a download changes what a screen can draw.
                yield* Effect.try({ catch: failedAt("sync"), try: () => invalidateAll(PHOTO_TABLE_NAMES) });
            }
        }).pipe(
            Effect.catchTags({ PhotoSyncError: (error) => Effect.logWarning(error.message, error.cause) }),
            Effect.uninterruptible,
            inFlight.withPermits(1)
        );

        const changes = Stream.merge(
            listen(watchTableWrites, (tableName) => PHOTO_TABLE_NAMES.includes(tableName)).pipe(Stream.as(true)),
            appStates(watchAppState, "background").pipe(Stream.as(false))
        ).pipe(Stream.debounce(PHOTO_DEBOUNCE), Stream.filter(Boolean));

        yield* Stream.merge(launchAndForegrounds(watchAppState), changes).pipe(
            Stream.buffer({ capacity: 1, strategy: "sliding" }),
            Stream.runForEach(() => cycle)
        );
    });

    return PhotoSync.of({ reconcile, run });
});

export const layer = Layer.effect(PhotoSync, make);
