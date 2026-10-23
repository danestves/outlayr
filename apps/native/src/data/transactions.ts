import { useMemo } from "react";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { growing } from "@/lib/growing";

import { useCategoryMeta } from "./categories";
import { useLiveQuery, useLiveRead } from "./live-query";
import { sameRows } from "./same-rows";
import {
    ledgerSizeQuery,
    logSplitMs,
    logTailRowsQuery,
    logWindowDaysQuery,
    logWindowRowsQuery,
} from "./transactions-core";
import type { LOG_COLUMNS, Transaction } from "./transactions-core";

export function useTransactionCount(db: Database): number {
    return useLiveQuery(transactions, () => ledgerSizeQuery(db)).length;
}

export interface CategoryDisplay {
    categoryName: string | null;
    categoryColor: string | null;
    categoryIcon: string | null;
    categoryEmoji: string | null;
}

type LogRow = {
    [K in keyof typeof LOG_COLUMNS]: Transaction[K];
};

export type TransactionWithCategory = LogRow & CategoryDisplay;

export function useDecoratedRows<Row extends { categoryId: string | null }>(
    db: Database,
    rows: readonly Row[]
): (Row & CategoryDisplay)[] {
    const meta = useCategoryMeta(db);
    const decorate = useMemo(
        () =>
            growing(
                (page: readonly Row[]) =>
                    page.map((row) => {
                        const found = row.categoryId ? meta.get(row.categoryId) : undefined;
                        return {
                            ...row,
                            categoryColor: found?.color ?? null,
                            categoryEmoji: found?.emoji ?? null,
                            categoryIcon: found?.icon ?? null,
                            categoryName: found?.name ?? null,
                        };
                    }),
                (held, added) => [...held, ...added]
            ),
        [meta]
    );
    return useMemo(() => decorate(rows), [decorate, rows]);
}

export interface LoggedTransactions {
    head: TransactionWithCategory[];
    reachedEnd: boolean;
    splitMs: number;
    /** Keeps the same array, row objects included, through any write that leaves these rows alone. */
    tail: TransactionWithCategory[];
}

interface LogTail {
    floorMs: number;
    rows: LogRow[];
    splitMs: number;
}

const NO_ROWS: never[] = [];
// Inert reads stay subscribed but run no SQL: flipping `enabled` back on re-reads in that render.
const NO_READ = { all: () => NO_ROWS };

/**
 * Category fields come from {@link useCategoryMeta}, not a join, so a rename repaints without a transaction write.
 * The window grows by days rather than paging: `useLiveQuery` re-runs on every write, and a cursor would shift.
 * Only `head` follows the clock; `tail` appends the new days on paging and keeps its row objects.
 * `enabled` false skips the three reads for a viewer that shows none of them; a filter flip back re-reads at once.
 */
export function useLoggedTransactions(db: Database, nowMs: number, days: number, enabled = true): LoggedTransactions {
    const dayRows = useLiveQuery(
        transactions,
        () => (enabled ? logWindowDaysQuery(db, nowMs, days) : NO_READ),
        [enabled, nowMs, days],
        nowMs
    );

    const floorMs = dayRows.at(-1)?.day?.getTime() ?? null;
    const reachedEnd = dayRows.length < days;
    const splitMs = logSplitMs(nowMs);
    const headFloorMs = floorMs === null ? null : Math.max(floorMs, splitMs);

    const headData = useLiveQuery(
        transactions,
        () => (enabled ? logWindowRowsQuery(db, nowMs, headFloorMs) : NO_READ),
        [enabled, nowMs, headFloorMs],
        nowMs
    );
    const tailFloorMs = Math.min(floorMs ?? splitMs, splitMs);
    const tailRead = useLiveRead(
        transactions,
        (previous: LogTail | null): LogTail => {
            if (!enabled) {
                return { floorMs: tailFloorMs, rows: NO_ROWS, splitMs };
            }
            const grown = previous !== null && previous.splitMs === splitMs && tailFloorMs < previous.floorMs;
            const rows = grown
                ? [...previous.rows, ...logTailRowsQuery(db, tailFloorMs, previous.floorMs).all()]
                : logTailRowsQuery(db, tailFloorMs, splitMs).all();
            return { floorMs: tailFloorMs, rows, splitMs };
        },
        [enabled, tailFloorMs, splitMs],
        (cached, next) => sameRows(cached.rows, next.rows)
    );
    const head = useDecoratedRows(db, headData);
    const tail = useDecoratedRows(db, tailRead.rows);

    return useMemo(() => ({ head, reachedEnd, splitMs, tail }), [head, reachedEnd, splitMs, tail]);
}
