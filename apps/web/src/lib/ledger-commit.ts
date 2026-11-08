import type { PushRow } from "@outlayr/backend/confect/sync";
import { createTransaction } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";

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
    installmentPlans: ledgerCollections.installmentPlans,
    installments: ledgerCollections.installments,
    outsideMoves: ledgerCollections.outsideMoves,
    outsidePayments: ledgerCollections.outsidePayments,
    savingsGoals: ledgerCollections.savingsGoals,
    transactions: ledgerCollections.transactions,
    transfers: ledgerCollections.transfers,
};

export type CommitRow = Extract<PushRow, { table: keyof typeof COLLECTED }>;

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
export function stageRows(db: DbClient, rows: readonly CommitRow[]) {
    const transaction = createTransaction({ autoCommit: false, mutationFn: () => pushRows(db, rows) });
    transaction.mutate(() => {
        for (const row of rows) {
            showRow(db, row);
        }
    });
    return transaction;
}

export const commitRows = (db: DbClient, rows: readonly CommitRow[]) => stageRows(db, rows).commit();
