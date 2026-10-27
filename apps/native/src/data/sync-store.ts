import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { syncTransport } from "@/lib/convex";

import { runSync } from "./sync-engine-core";
import { getSyncCursor, isSyncEnabled, outboxPendingCount, setSyncedAt } from "./sync-outbox-core";
import { invalidateAll } from "./table-invalidation";

const SyncStage = Schema.Literals(["pass", "count", "cursor", "gate", "stamp"]);

export class SyncError extends Schema.TaggedError<SyncError>()("SyncError", {
    cause: Schema.Defect(),
    message: Schema.String,
    stage: SyncStage,
}) {}

export const SyncTransport = Context.Reference<ReturnType<typeof syncTransport>>(
    "outlayr/data/SyncStore/SyncTransport",
    { defaultValue: syncTransport }
);

export class SyncStore extends Context.Service<
    SyncStore,
    {
        readonly cursor: (db: Database) => Effect.Effect<number, SyncError>;
        readonly enabled: (db: Database) => Effect.Effect<boolean, SyncError>;
        readonly pending: (db: Database) => Effect.Effect<number, SyncError>;
        readonly stamp: (db: Database) => Effect.Effect<void, SyncError>;
        readonly sync: (db: Database) => Effect.Effect<void, SyncError>;
    }
>()("outlayr/data/SyncStore") {}

const failedAt = (stage: typeof SyncStage.Type) => (cause: unknown) =>
    new SyncError({ cause, message: `Sync ${stage} failed`, stage });

export const make = Effect.gen(function* make() {
    const transport = yield* SyncTransport;

    const sync = Effect.fn("SyncStore.sync")(function* sync(db: Database) {
        const { tables } = yield* Effect.tryPromise({ catch: failedAt("pass"), try: () => runSync(db, transport) });
        // Outside the write transaction, so nothing repaints rows a rollback is about to remove.
        yield* Effect.try({ catch: failedAt("pass"), try: () => invalidateAll(tables) });
    });

    const pending = Effect.fn("SyncStore.pending")(function* pending(db: Database) {
        return yield* Effect.tryPromise({ catch: failedAt("count"), try: () => outboxPendingCount(db) });
    });

    const cursor = Effect.fn("SyncStore.cursor")(function* cursor(db: Database) {
        return yield* Effect.tryPromise({ catch: failedAt("cursor"), try: () => getSyncCursor(db) });
    });

    const enabled = Effect.fn("SyncStore.enabled")(function* enabled(db: Database) {
        return yield* Effect.tryPromise({ catch: failedAt("gate"), try: () => isSyncEnabled(db) });
    });

    const stamp = Effect.fn("SyncStore.stamp")(function* stamp(db: Database) {
        yield* Effect.tryPromise({ catch: failedAt("stamp"), try: () => setSyncedAt(db, new Date()) });
    });

    return SyncStore.of({ cursor, enabled, pending, stamp, sync });
});

export const layer = Layer.effect(SyncStore, make);
