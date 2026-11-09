import type { PushRow } from "@outlayr/backend/confect/sync";
import { createTransaction } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";

import { UNSENT_PREFIX, keepUnsent } from "./ledger-cache";
import { ledgerCollections } from "./ledger-db";
import { pushRows } from "./ledger-write";

interface ShownRow {
    deletedAt: number | null;
    updatedAt: number;
}

interface WritableRows {
    has: (key: string) => boolean;
    insert: (row: ShownRow) => void;
    update: (key: string, change: (draft: ShownRow) => void) => void;
}

const COLLECTED = {
    accounts: ledgerCollections.accounts,
    budgets: ledgerCollections.budgets,
    installmentPlans: ledgerCollections.installmentPlans,
    installments: ledgerCollections.installments,
    mainBudget: ledgerCollections.mainBudget,
    outsideMoves: ledgerCollections.outsideMoves,
    outsidePayments: ledgerCollections.outsidePayments,
    savingsGoals: ledgerCollections.savingsGoals,
    transactions: ledgerCollections.transactions,
    transfers: ledgerCollections.transfers,
};

export type CommitRow = Extract<PushRow, { table: keyof typeof COLLECTED }>;

const isCollected = (row: PushRow): row is CommitRow => Object.hasOwn(COLLECTED, row.table);

function showRow(db: DbClient, row: CommitRow) {
    // SAFETY: the tables differ only in `fields`, and `row` carries the fields of the table it names.
    // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- no one row type spans these collections.
    const rows = db.collection(COLLECTED[row.table] as typeof ledgerCollections.accounts) as unknown as WritableRows;
    const shown = { ...row.fields, deletedAt: row.deletedAt, restoredAt: row.restoredAt, updatedAt: row.updatedAt };
    if (rows.has(row.localId)) {
        rows.update(row.localId, (draft) => {
            Object.assign(draft, shown);
        });
        return;
    }
    const inserted = {
        ...shown,
        _creationTime: row.updatedAt,
        _id: row.localId,
        deviceId: "",
        localId: row.localId,
        seq: Number.MAX_SAFE_INTEGER,
        userId: "",
    };
    rows.insert(inserted);
}

/**
 * Shows `rows` at once and holds the push until `commit()`, so a delete can wait out its Undo:
 * `rollback()` puts everything back, and a closed tab has changed nothing.
 */
export function stageRows(db: DbClient, rows: readonly PushRow[]) {
    const transaction = createTransaction({ autoCommit: false, mutationFn: () => pushRows(db, rows) });
    transaction.mutate(() => {
        for (const row of rows) {
            if (isCollected(row)) {
                showRow(db, row);
            }
        }
    });
    return transaction;
}

export const commitRows = (db: DbClient, rows: readonly PushRow[]) => stageRows(db, rows).commit();

interface Unsent {
    rows: CommitRow[];
    userId: string;
}

const dropUnsent = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch {
        // Storage is off, so nothing was kept.
    }
};

/**
 * `commit()` for staged rows that must survive the page. A socket dies with its page, so the rows wait in storage
 * until the push lands, and the next load sends what is left.
 */
export function commitDurably(transaction: ReturnType<typeof stageRows>, rows: CommitRow[], userId?: string) {
    const key = `${UNSENT_PREFIX}${transaction.id}`;
    if (userId !== undefined) {
        keepUnsent(key, JSON.stringify({ rows, userId } satisfies Unsent));
    }
    return transaction.commit().finally(() => dropUnsent(key));
}

/** Sends what a closed page left behind. A push is idempotent, so one that did land just loses its tie. */
export function resendUnsent(db: DbClient, userId: string) {
    try {
        for (const key of Object.keys(localStorage).filter((name) => name.startsWith(UNSENT_PREFIX))) {
            // SAFETY: only commitDurably writes this prefix, as JSON of an Unsent.
            const unsent = JSON.parse(localStorage.getItem(key) ?? "null") as Unsent | null;
            if (unsent?.userId === userId) {
                commitRows(db, unsent.rows)
                    .then(() => dropUnsent(key))
                    .catch(() => undefined);
            } else {
                // Another tab signing out can leave a previous account's rows, which this one must not keep.
                dropUnsent(key);
            }
        }
    } catch {
        // Unreadable storage must not take the ledger down with it.
    }
}
