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

interface ShownRows {
    has: (key: string) => boolean;
    insert: (row: ShownRow) => void;
    update: (key: string, change: (draft: ShownRow) => void) => void;
    utils: { awaitSync: () => Promise<void> };
}

const COLLECTED = {
    accounts: ledgerCollections.accounts,
    budgets: ledgerCollections.budgets,
    categories: ledgerCollections.categories,
    installmentPlans: ledgerCollections.installmentPlans,
    installments: ledgerCollections.installments,
    mainBudget: ledgerCollections.mainBudget,
    outsideMoves: ledgerCollections.outsideMoves,
    outsidePayments: ledgerCollections.outsidePayments,
    savingsGoals: ledgerCollections.savingsGoals,
    transactions: ledgerCollections.transactions,
    transfers: ledgerCollections.transfers,
};

type ShownTable = keyof typeof COLLECTED;

export type CommitRow = Extract<PushRow, { table: ShownTable }>;

export type CommitOutcome =
    | { status: "saved" }
    | { status: "undone" }
    | { error: Error; retry: () => Promise<CommitOutcome>; status: "failed" };

export interface LedgerCommit {
    add: (rows: readonly PushRow[]) => boolean;
    flush: () => Promise<CommitOutcome>;
    settled: Promise<CommitOutcome>;
    undo: () => boolean;
}

export interface PendingCommits {
    failed: number;
    held: number;
    sending: number;
}

type Phase = keyof PendingCommits;

export interface LedgerCommitter {
    commit: (rows: readonly PushRow[], policy?: { holdMs: number }) => LedgerCommit;
    getSnapshot: () => PendingCommits;
    resume: () => void;
    subscribe: (listener: () => void) => () => void;
}

interface Unsent {
    rows: PushRow[];
    userId: string;
}

const isShown = (row: PushRow): row is CommitRow => Object.hasOwn(COLLECTED, row.table);

const shownRows = (db: DbClient, table: ShownTable) =>
    // SAFETY: the tables differ only in `fields`, and a row carries the fields of the table it names.
    // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- no one row type spans these collections.
    db.collection(COLLECTED[table] as typeof ledgerCollections.accounts) as unknown as ShownRows;

function showRow(db: DbClient, row: CommitRow) {
    const rows = shownRows(db, row.table);
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

const unsentKeys = () => {
    try {
        return Object.keys(localStorage).filter((name) => name.startsWith(UNSENT_PREFIX));
    } catch {
        return [];
    }
};

const readUnsent = (key: string) => {
    try {
        // SAFETY: only a committer writes this prefix, as JSON of an Unsent. The server validates every row it is sent.
        return JSON.parse(localStorage.getItem(key) ?? "null") as Unsent | null;
    } catch {
        return null;
    }
};

const dropUnsent = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch {
        // Storage is off, so nothing was kept.
    }
};

function createCommitter(db: DbClient, userId: string | undefined): LedgerCommitter {
    let pending: PendingCommits = { failed: 0, held: 0, sending: 0 };
    const listeners = new Set<() => void>();
    const heldPushes = new Set<() => void>();
    const sendingKeys = new Set<string>();
    let watchingPageHide = false;

    const move = (from: Phase | null, to: Phase | null) => {
        pending = { ...pending };
        if (from) {
            pending[from] -= 1;
        }
        if (to) {
            pending[to] += 1;
        }
        for (const listener of listeners) {
            listener();
        }
    };

    const hold = (endHold: () => void) => {
        heldPushes.add(endHold);
        if (!watchingPageHide) {
            watchingPageHide = true;
            window.addEventListener("pagehide", () => {
                for (const each of heldPushes) {
                    each();
                }
            });
        }
    };

    const start = (
        initial: readonly PushRow[],
        holdMs: number | undefined,
        key = `${UNSENT_PREFIX}${crypto.randomUUID()}`
    ): LedgerCommit => {
        const rows = [...initial];
        let sent: Promise<void> | undefined;
        let outcome: Promise<CommitOutcome> | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const send = async () => {
            try {
                await pushRows(db, rows);
            } finally {
                sendingKeys.delete(key);
                dropUnsent(key);
            }
            const tables = new Set(rows.filter(isShown).map((row) => row.table));
            await Promise.allSettled([...tables].map((table) => shownRows(db, table).utils.awaitSync()));
        };
        const transaction = createTransaction({ autoCommit: false, mutationFn: () => sent ?? Promise.resolve() });
        const show = (shown: readonly PushRow[]) => {
            transaction.mutate(() => {
                for (const row of shown) {
                    if (isShown(row)) {
                        showRow(db, row);
                    }
                }
            });
        };

        const failure = (error: Error): CommitOutcome => {
            let retried: Promise<CommitOutcome> | undefined;
            return {
                error,
                retry: () => {
                    if (!retried) {
                        move("failed", null);
                        retried = start(rows, undefined).settled;
                    }
                    return retried;
                },
                status: "failed",
            };
        };

        const run = async (): Promise<CommitOutcome> => {
            if (transaction.state !== "pending") {
                move("sending", "failed");
                return failure(new Error("A failed commit on the same rows rolled this one back"));
            }
            if (userId !== undefined) {
                sendingKeys.add(key);
                keepUnsent(key, JSON.stringify({ rows, userId } satisfies Unsent));
            }
            sent = send();
            try {
                await transaction.commit();
                await sent;
                move("sending", null);
                return { status: "saved" };
            } catch (error) {
                move("sending", "failed");
                return failure(error instanceof Error ? error : new Error(String(error)));
            }
        };

        const leaveHold = () => {
            clearTimeout(timer);
            heldPushes.delete(flush);
        };

        let settle: ((ended: Promise<CommitOutcome>) => void) | undefined;
        const settled = new Promise<CommitOutcome>((resolve) => {
            settle = resolve;
        });

        function flush() {
            if (!outcome) {
                leaveHold();
                move(holdMs === undefined ? null : "held", "sending");
                outcome = run();
                settle?.(outcome);
            }
            return settled;
        }

        show(rows);
        if (holdMs === undefined) {
            void flush();
        } else {
            move(null, "held");
            hold(flush);
            timer = setTimeout(flush, holdMs);
        }

        return {
            add: (more) => {
                if (outcome || transaction.state !== "pending") {
                    return false;
                }
                rows.push(...more);
                show(more);
                return true;
            },
            flush,
            settled,
            undo: () => {
                if (outcome) {
                    return false;
                }
                leaveHold();
                move("held", null);
                outcome = Promise.resolve({ status: "undone" });
                settle?.(outcome);
                if (transaction.state === "pending") {
                    transaction.rollback();
                }
                return true;
            },
        };
    };

    return {
        commit: (rows, policy) => start(rows, policy?.holdMs),
        getSnapshot: () => pending,
        resume: () => {
            for (const key of userId === undefined ? [] : unsentKeys()) {
                if (!sendingKeys.has(key)) {
                    const unsent = readUnsent(key);
                    if (unsent && unsent.userId === userId && Array.isArray(unsent.rows)) {
                        start(unsent.rows, undefined, key);
                    } else {
                        dropUnsent(key);
                    }
                }
            }
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}

const committers = new WeakMap<DbClient, Map<string | undefined, LedgerCommitter>>();

export function ledgerCommitter(db: DbClient, userId: string | undefined): LedgerCommitter {
    const byUser = committers.get(db) ?? new Map<string | undefined, LedgerCommitter>();
    committers.set(db, byUser);
    const committer = byUser.get(userId) ?? createCommitter(db, userId);
    byUser.set(userId, committer);
    return committer;
}
