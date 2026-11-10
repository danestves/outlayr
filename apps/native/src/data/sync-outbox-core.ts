import { and, count, eq, isNotNull, or } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { outbox } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { newId } from "@/domain/ids";

import { Meta } from "./app-meta-core";
import { SYNCED_SPECS, SYNCED_TABLES } from "./sync-tables";

/** 999 bound variables per statement, three columns per queue entry. */
const ENQUEUE_CHUNK = 300;

const SyncOutboxStep = Schema.Literals(["gate", "subject", "device", "cursor", "count", "enqueue", "stamp", "reset"]);

export class SyncOutboxError extends Schema.TaggedError<SyncOutboxError>()("SyncOutboxError", {
    cause: Schema.Defect(),
    message: Schema.String,
    step: SyncOutboxStep,
}) {}

const failedAt = (step: typeof SyncOutboxStep.Type) => (cause: unknown) =>
    new SyncOutboxError({ cause, message: `Sync outbox ${step} failed`, step });

const query = <A>(step: typeof SyncOutboxStep.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: failedAt(step), try: run });

export const isSyncEnabled = Effect.fn("SyncOutbox.isSyncEnabled")(function* isSyncEnabled(db: Database) {
    return yield* Meta.get(db, "syncEnabled").pipe(Effect.mapError(failedAt("gate")));
});

/** Turning sync off drops the queue, or edits made while signed out would push at the next sign-in. */
export const setSyncEnabled = Effect.fn("SyncOutbox.setSyncEnabled")(function* setSyncEnabled(
    db: Database,
    enabled: boolean
) {
    yield* transaction(
        db,
        Effect.gen(function* write() {
            yield* Meta.set(db, "syncEnabled", enabled).pipe(Effect.mapError(failedAt("gate")));
            if (!enabled) {
                yield* query("gate", () => db.delete(outbox));
            }
        }),
        failedAt("gate")
    );
});

export const getSyncAccountSubject = Effect.fn("SyncOutbox.getSyncAccountSubject")(function* getSyncAccountSubject(
    db: Database
) {
    return yield* Meta.get(db, "syncAccountSubject").pipe(Effect.mapError(failedAt("subject")));
});

export const enableSyncForAccount = Effect.fn("SyncOutbox.enableSyncForAccount")(function* enableSyncForAccount(
    db: Database,
    accountId: string
) {
    yield* transaction(
        db,
        Effect.gen(function* write() {
            yield* Meta.set(db, "syncAccountSubject", accountId).pipe(Effect.mapError(failedAt("subject")));
            yield* Meta.set(db, "syncEnabled", true).pipe(Effect.mapError(failedAt("subject")));
        }),
        failedAt("subject")
    );
});

export const hasResidualSyncState = Effect.fn("SyncOutbox.hasResidualSyncState")(function* hasResidualSyncState(
    db: Database
) {
    if (yield* isSyncEnabled(db)) {
        return true;
    }
    if ((yield* outboxPendingCount(db)) > 0) {
        return true;
    }
    return (
        (yield* Meta.has(db, "syncCursor").pipe(Effect.mapError(failedAt("cursor")))) ||
        (yield* Meta.has(db, "syncedAt").pipe(Effect.mapError(failedAt("stamp"))))
    );
});

export const getOrCreateDeviceId = Effect.fn("SyncOutbox.getOrCreateDeviceId")(function* getOrCreateDeviceId(
    db: Database
) {
    const existing = yield* Meta.get(db, "syncDeviceId").pipe(Effect.mapError(failedAt("device")));
    if (existing) {
        return existing;
    }
    const minted = newId();
    yield* Meta.set(db, "syncDeviceId", minted).pipe(Effect.mapError(failedAt("device")));
    return minted;
});

export const getSyncCursor = Effect.fn("SyncOutbox.getSyncCursor")(function* getSyncCursor(db: Database) {
    return yield* Meta.get(db, "syncCursor").pipe(Effect.mapError(failedAt("cursor")));
});

export const setSyncCursor = Effect.fn("SyncOutbox.setSyncCursor")(function* setSyncCursor(
    db: Database,
    cursor: number
) {
    yield* Meta.set(db, "syncCursor", cursor).pipe(Effect.mapError(failedAt("cursor")));
});

export const outboxPendingCount = Effect.fn("SyncOutbox.outboxPendingCount")(function* outboxPendingCount(
    db: Database
) {
    const rows = yield* query("count", () => db.select({ pending: count() }).from(outbox));
    return rows[0]?.pending ?? 0;
});

/**
 * Triggers only fire once the gate opens, so this queues the ledger built before sign-in, tombstones included.
 * Run it after a "replace" adoption, or it pushes the seed categories the replace discards (convex-sync.md §5).
 */
export const enqueueAllForSync = Effect.fn("SyncOutbox.enqueueAllForSync")(function* enqueueAllForSync(db: Database) {
    const enqueuedAt = new Date();
    const entries: {
        tableName: string;
        localId: string;
        enqueuedAt: Date;
    }[] = [];

    const collect = Effect.fn("SyncOutbox.collect")(function* collect(
        tableName: string,
        read: () => PromiseLike<{ localId: string }[]>
    ) {
        for (const row of yield* query("enqueue", read)) {
            entries.push({ enqueuedAt, localId: row.localId, tableName });
        }
    });

    for (const table of SYNCED_TABLES) {
        const { id, scope, table: synced } = SYNCED_SPECS[table];
        yield* collect(table, () => db.select({ localId: id }).from(synced).where(scope));
    }

    yield* transaction(
        db,
        Effect.gen(function* write() {
            for (let from = 0; from < entries.length; from += ENQUEUE_CHUNK) {
                const chunk = entries.slice(from, from + ENQUEUE_CHUNK);
                // The chunks share the one SQLite connection this transaction is open on, so issuing them together
                // interleaves statements against that transaction.
                yield* query("enqueue", () =>
                    db
                        .delete(outbox)
                        .where(
                            or(
                                ...chunk.map((entry) =>
                                    and(eq(outbox.tableName, entry.tableName), eq(outbox.localId, entry.localId))
                                )
                            )
                        )
                );
                yield* query("enqueue", () => db.insert(outbox).values(chunk));
            }
        }),
        failedAt("enqueue")
    );
});

export const setSyncedAt = Effect.fn("SyncOutbox.setSyncedAt")(function* setSyncedAt(db: Database, at: Date) {
    yield* Meta.set(db, "syncedAt", at.getTime()).pipe(Effect.mapError(failedAt("stamp")));
});

export const resetSyncForAccountSwitch = Effect.fn("SyncOutbox.resetSyncForAccountSwitch")(
    function* resetSyncForAccountSwitch(db: Database) {
        yield* transaction(
            db,
            Effect.gen(function* write() {
                for (const table of SYNCED_TABLES) {
                    const { photos } = SYNCED_SPECS[table];
                    if (photos) {
                        yield* query("reset", () =>
                            db.update(photos.table).set({ imageKey: null }).where(isNotNull(photos.imageUri))
                        );
                    }
                }
                yield* query("reset", () => db.delete(outbox));
                yield* Meta.remove(db, [
                    "syncAccountSubject",
                    "syncCursor",
                    "syncedAt",
                    "syncEnabled",
                    "syncReread",
                    "syncRestoresReread",
                ]);
            }),
            failedAt("reset")
        );
    }
);
