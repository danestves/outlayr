import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import type { RemoteLedger } from "@/domain/ledger-adoption";

import { META_KEYS } from "./app-meta-core";
import { refreshLogoCandidate } from "./logo-backfill-state";
import { applyPulledRows, PULL_PAGE_LIMIT, PUSH_BATCH_LIMIT, specFor } from "./sync-engine-core";
import type { LocalValue, PulledRow, PullFn, PushFn, SyncedTable, WireRow } from "./sync-engine-core";
import { getOrCreateDeviceId, SYNCED_META_KEYS, SYNCED_TABLES, setSyncCursor } from "./sync-outbox-core";

type Row = Record<string, LocalValue>;

const rowId = z.string();

function rowKey(table: SyncedTable, localId: string): string {
    return `${table}\0${localId}`;
}

async function readAccountLog(pull: PullFn): Promise<Map<string, PulledRow>> {
    const latest = new Map<string, PulledRow>();
    let cursor = 0;
    /* oxlint-disable no-await-in-loop -- each page's cursor is the next request's argument, so the pages cannot be fetched ahead */
    for (;;) {
        const page = await pull({ cursor, limit: PULL_PAGE_LIMIT });
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
    /* oxlint-enable no-await-in-loop */
}

// A tombstone is not content: an account whose every row was deleted has nothing to preserve, and calling it
// `populated` would ask the user to choose between their ledger and an empty one.
export async function accountLedgerState(pull: PullFn): Promise<RemoteLedger> {
    const log = await readAccountLog(pull);
    for (const row of log.values()) {
        if (row.deletedAt === null) {
            return "populated";
        }
    }
    return "empty";
}

async function localRows(db: Database, table: SyncedTable): Promise<Map<string, Row>> {
    const spec = specFor(table);
    // SAFETY: the runtime table name erases the row type; this file reads rows by column name as `Row`.
    const rows = (await db.select().from(spec.table)) as Row[];
    const idName = spec.id.name;
    const byId = new Map<string, Row>();
    for (const row of rows) {
        const id = rowId.safeParse(row[idName]);
        if (id.success) {
            byId.set(id.data, row);
        }
    }
    return byId;
}

// Only account-scoped `appMeta` keys are cleared: `syncDeviceId`, `syncCursor` and `onboardingComplete` never come
// back from a pull. The cursor resets in the wipe's transaction, so a crash cannot leave an empty replica pointed at
// the end of the log.
export async function replaceLocalFromAccount(db: Database, pull: PullFn, now: Date = new Date()): Promise<void> {
    await withTransaction(db, async () => {
        /* oxlint-disable no-await-in-loop -- `withTransaction` holds one SQLite connection, so the wipe's statements have to be issued on it one at a time */
        for (const table of SYNCED_TABLES) {
            const spec = specFor(table);
            if (table === "appMeta") {
                await db.delete(spec.table).where(inArray(spec.id, [...SYNCED_META_KEYS]));
                continue;
            }
            await db.delete(spec.table);
        }
        /* oxlint-enable no-await-in-loop */
        await setSyncCursor(db, 0);
        // The walk below reads the whole log under the merge that knows `restoredAt`.
        await db.delete(appMeta).where(eq(appMeta.key, META_KEYS.syncRestoresReread));
    });

    let cursor = 0;
    /* oxlint-disable no-await-in-loop -- each page's cursor is the next request's argument, and a page must be applied before the one that may supersede it */
    for (;;) {
        const page = await pull({ cursor, limit: PULL_PAGE_LIMIT });
        if (page.rows.length === 0) {
            return;
        }
        await applyPulledRows(db, page, now);
        if (page.cursor <= cursor) {
            return;
        }
        ({ cursor } = page);
        if (!page.hasMore) {
            return;
        }
    }
    /* oxlint-enable no-await-in-loop */
}

// Not tombstone-all-then-push: `incomingWins` (packages/backend/convex/lib/syncTables.ts) lets a delete beat a live
// row regardless of `updatedAt`. Shared rows stay alive with `updatedAt` (and `restoredAt`) lifted past the account's;
// only rows this device never saw are tombstoned.
export async function discardAccountLedger(
    db: Database,
    transport: { push: PushFn; pull: PullFn },
    now: Date = new Date()
): Promise<void> {
    const log = await readAccountLog(transport.pull);
    const deviceId = await getOrCreateDeviceId(db);
    const stamp = now.getTime();

    const tombstones: WireRow[] = [];
    const lifts = new Map<SyncedTable, { id: string; restoredAt: Date | null; updatedAt: Date }[]>();

    const localByTable = new Map(
        await Promise.all(SYNCED_TABLES.map(async (table) => [table, await localRows(db, table)] as const))
    );

    for (const table of SYNCED_TABLES) {
        const local = localByTable.get(table) ?? new Map<string, Row>();
        for (const row of log.values()) {
            if (row.table !== table || row.deletedAt !== null) {
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
            // No lift: `drainOutbox` stamps `appMeta` with the enqueue time, later than anything already there.
            if (table === "appMeta") {
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
        await withTransaction(db, async () => {
            for (const [table, rows] of lifts) {
                const spec = specFor(table);
                /* oxlint-disable no-await-in-loop -- `withTransaction` holds one SQLite connection, so the lifts have to be issued on it one at a time */
                for (const row of rows) {
                    // A lifted transaction's logo candidate stamp follows the new clock, before the write.
                    if (table === "transactions") {
                        await refreshLogoCandidate(db, row.id, row.updatedAt.getTime());
                    }
                    // SAFETY: the runtime table name erases the update type; every synced table has `updatedAt`, and
                    // `restoredAt` is set only from a row that carried one.
                    await db
                        .update(spec.table)
                        .set({
                            updatedAt: row.updatedAt,
                            ...(row.restoredAt && { restoredAt: row.restoredAt }),
                        } as never)
                        .where(inArray(spec.id, [row.id]));
                }
                /* oxlint-enable no-await-in-loop */
            }
        });
    }

    /* oxlint-disable no-await-in-loop -- the backend hands out `seq` one per accepted row in arrival order (`packages/backend/convex/sync.ts`), so overlapping batches would interleave the account's change log */
    for (let i = 0; i < tombstones.length; i += PUSH_BATCH_LIMIT) {
        await transport.push({
            deviceId,
            rows: tombstones.slice(i, i + PUSH_BATCH_LIMIT),
        });
    }
    /* oxlint-enable no-await-in-loop */
}
