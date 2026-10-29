import { inArray } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";
import { transaction } from "@/db/transaction";

import { META_KEYS } from "./app-meta-core";
import { refreshLogoCandidate } from "./logo-backfill-state";
import { PULL_PAGE_LIMIT, PUSH_BATCH_LIMIT, specFor, withForeignKeysOff, writePulledRows } from "./sync-engine-core";
import type { LocalValue, PulledRow, PullFn, PushFn, SyncedTable, WireRow } from "./sync-engine-core";
import { getOrCreateDeviceId, SYNCED_META_KEYS, SYNCED_TABLES, setSyncCursor } from "./sync-outbox-core";

const AdoptionEngineOperation = Schema.Literals(["pull", "push", "read", "replace", "lift"]);

export class AdoptionEngineError extends Schema.TaggedError<AdoptionEngineError>()("AdoptionEngineError", {
    cause: Schema.Defect(),
    operation: AdoptionEngineOperation,
}) {
    override get message(): string {
        return `Adoption engine ${this.operation} failed`;
    }
}

const attempt = <A>(operation: typeof AdoptionEngineOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new AdoptionEngineError({ cause, operation }), try: run });

const pullPage = (pull: PullFn, cursor: number) =>
    pull({ cursor, limit: PULL_PAGE_LIMIT }).pipe(
        Effect.mapError((cause) => new AdoptionEngineError({ cause, operation: "pull" }))
    );

type Row = Record<string, LocalValue>;

const isRowId = Schema.is(Schema.String);

function rowKey(table: SyncedTable, localId: string): string {
    return `${table}\0${localId}`;
}

const readAccountLog = Effect.fn("AdoptionEngine.readAccountLog")(function* readAccountLog(pull: PullFn) {
    const latest = new Map<string, PulledRow>();
    let cursor = 0;
    // Each page's cursor is the next request's argument, so the pages cannot be fetched ahead.
    for (;;) {
        const page = yield* pullPage(pull, cursor);
        for (const row of page.rows) {
            latest.set(rowKey(row.table, row.localId), row);
        }
        if (page.rows.length === 0 || page.cursor <= cursor) {
            return latest;
        }
        ({ cursor } = page);
        if (!page.hasMore) {
            return latest;
        }
    }
});

// A tombstone is not content: an account whose every row was deleted has nothing to preserve, and calling it
// `populated` would ask the user to choose between their ledger and an empty one.
export const accountLedgerState = Effect.fn("AdoptionEngine.accountLedgerState")(function* accountLedgerState(
    pull: PullFn
) {
    const log = yield* readAccountLog(pull);
    for (const row of log.values()) {
        if (row.deletedAt === null) {
            return "populated";
        }
    }
    return "empty";
});

const localRows = Effect.fn("AdoptionEngine.localRows")(function* localRows(db: Database, table: SyncedTable) {
    const spec = specFor(table);
    // SAFETY: the runtime table name erases the row type; this file reads rows by column name as `Row`.
    const rows = (yield* attempt("read", () => db.select().from(spec.table))) as Row[];
    const idName = spec.id.name;
    const byId = new Map<string, Row>();
    for (const row of rows) {
        const id = row[idName];
        if (isRowId(id)) {
            byId.set(id, row);
        }
    }
    return byId;
});

// Only account-scoped `appMeta` keys are cleared: `syncDeviceId`, `syncCursor` and `onboardingComplete` never come
// back from a pull. The log is read whole before the wipe, and the wipe commits with the write, so a failed pull or
// write leaves the phone as it was.
export const replaceLocalFromAccount = Effect.fn("AdoptionEngine.replaceLocalFromAccount")(
    function* replaceLocalFromAccount(db: Database, pull: PullFn, now: Date = new Date()) {
        const rows = [...(yield* readAccountLog(pull)).values()];
        const cursor = rows.reduce((last, row) => Math.max(last, row.seq), 0);

        yield* withForeignKeysOff(
            db,
            transaction(
                db,
                Effect.gen(function* replace() {
                    // `transaction` holds one SQLite connection, so the wipe's statements are issued on it one at a
                    // time.
                    for (const table of SYNCED_TABLES) {
                        const spec = specFor(table);
                        if (table === "appMeta") {
                            yield* attempt("replace", () =>
                                db.delete(spec.table).where(inArray(spec.id, [...SYNCED_META_KEYS]))
                            );
                            continue;
                        }
                        yield* attempt("replace", () => db.delete(spec.table));
                    }
                    yield* setSyncCursor(db, 0);
                    // The write below covers the whole log under the merge that knows `restoredAt`.
                    yield* attempt("replace", () =>
                        db
                            .delete(appMeta)
                            .where(inArray(appMeta.key, [META_KEYS.syncRestoresReread, META_KEYS.autologWaiting]))
                    );
                    if (rows.length > 0) {
                        yield* writePulledRows(db, { cursor, rows }, now, false);
                    }
                }),
                (cause) => new AdoptionEngineError({ cause, operation: "replace" })
            )
        );
    }
);

// Not tombstone-all-then-push: `incomingWins` (packages/backend/confect/lib/syncTables.ts) lets a delete beat a live
// row regardless of `updatedAt`. Shared rows stay alive with `updatedAt` (and `restoredAt`) lifted past the account's;
// only rows this device never saw are tombstoned.
export const discardAccountLedger = Effect.fn("AdoptionEngine.discardAccountLedger")(function* discardAccountLedger(
    db: Database,
    transport: { push: PushFn; pull: PullFn },
    now: Date = new Date()
) {
    const log = yield* readAccountLog(transport.pull);
    const deviceId = yield* getOrCreateDeviceId(db);
    const stamp = now.getTime();

    const tombstones: WireRow[] = [];
    const lifts = new Map<SyncedTable, { id: string; restoredAt: Date | null; updatedAt: Date }[]>();

    const localByTable = new Map(
        yield* Effect.all(
            SYNCED_TABLES.map((table) => Effect.map(localRows(db, table), (rows) => [table, rows] as const)),
            { concurrency: "unbounded" }
        )
    );

    for (const table of SYNCED_TABLES) {
        const local = localByTable.get(table) ?? new Map<string, Row>();
        for (const row of log.values()) {
            if (row.table !== table || row.deletedAt !== null || table === "appMeta") {
                continue;
            }
            const mine = local.get(row.localId);
            if (!mine) {
                tombstones.push({
                    deletedAt: stamp,
                    fields: row.fields,
                    localId: row.localId,
                    table,
                    updatedAt: stamp,
                });
                continue;
            }
            const mineAt = mine.updatedAt;
            const mineMs = mineAt instanceof Date ? mineAt.getTime() : 0;
            const mineRestored = mine.restoredAt instanceof Date ? mine.restoredAt.getTime() : 0;
            const theirsRestored = row.restoredAt ?? 0;
            if (mineMs <= row.updatedAt || theirsRestored > mineRestored) {
                const bucket = lifts.get(table) ?? [];
                bucket.push({
                    id: row.localId,
                    restoredAt: theirsRestored > mineRestored ? new Date(theirsRestored) : null,
                    updatedAt: new Date(Math.max(mineMs, row.updatedAt + 1)),
                });
                lifts.set(table, bucket);
            }
        }
    }

    if (lifts.size > 0) {
        yield* transaction(
            db,
            Effect.gen(function* lift() {
                for (const [table, rows] of lifts) {
                    const spec = specFor(table);
                    // `transaction` holds one SQLite connection, so the lifts are issued on it one at a time.
                    for (const row of rows) {
                        // A lifted transaction's logo candidate stamp follows the new clock, before the write.
                        if (table === "transactions") {
                            yield* refreshLogoCandidate(db, row.id, row.updatedAt.getTime());
                        }
                        // SAFETY: the runtime table name erases the update type; every synced table has
                        // `updatedAt`, and `restoredAt` is set only from a row that carried one.
                        yield* attempt("lift", () =>
                            db
                                .update(spec.table)
                                .set({
                                    updatedAt: row.updatedAt,
                                    ...(row.restoredAt && { restoredAt: row.restoredAt }),
                                } as never)
                                .where(inArray(spec.id, [row.id]))
                        );
                    }
                }
            }),
            (cause) => new AdoptionEngineError({ cause, operation: "lift" })
        );
    }

    // The backend hands out `seq` one per accepted row in arrival order (`packages/backend/confect/sync.ts`), so
    // overlapping batches would interleave the account's change log.
    for (let i = 0; i < tombstones.length; i += PUSH_BATCH_LIMIT) {
        yield* transport
            .push({
                deviceId,
                rows: tombstones.slice(i, i + PUSH_BATCH_LIMIT),
            })
            .pipe(Effect.mapError((cause) => new AdoptionEngineError({ cause, operation: "push" })));
    }
});
