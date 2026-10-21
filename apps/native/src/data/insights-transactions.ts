import { and, asc, desc, eq, getTableColumns, gte, inArray, isNull, lt, lte } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";

import { useCategoryMeta } from "./categories";
import { useLiveQuery } from "./live-query";
import { useDecoratedRows } from "./transactions";
import type { TransactionWithCategory } from "./transactions";

export interface WindowTransactionsQuery {
    /** A top-level category and its children; `null` keeps all. */
    categoryId?: string | null;
    /** Exclusive, and clamped to `nowMs` so the future never shows. */
    end: Date;
    income?: boolean | null;
    nowMs: number;
    start: Date;
}

// Categories resolve through {@link useCategoryMeta}, not a join: `useLiveQuery` only invalidates on the table it
// watches, so a joined category would stay stale after a rename or re-parent.
export function useWindowTransactions(db: Database, query: WindowTransactionsQuery | null): TransactionWithCategory[] {
    const categoryMeta = useCategoryMeta(db);

    const startMs = query?.start.getTime() ?? 0;
    const endMs = query?.end.getTime() ?? 0;
    const nowMs = query?.nowMs ?? 0;
    const income = query?.income ?? null;
    const categoryId = query?.categoryId ?? null;
    const enabled = query != null;

    const contributingIds = useMemo(() => {
        if (!categoryId) {
            return null;
        }
        const ids = [categoryId];
        for (const [id, meta] of categoryMeta) {
            if (meta.parentId === categoryId) {
                ids.push(id);
            }
        }
        return ids;
    }, [categoryId, categoryMeta]);

    const contributingKey = contributingIds?.join(",") ?? "";

    const data = useLiveQuery(
        transactions,
        () => {
            if (!enabled) {
                return db
                    .select(getTableColumns(transactions))
                    .from(transactions)
                    .where(eq(transactions.id, ""))
                    .limit(0);
            }
            return db
                .select(getTableColumns(transactions))
                .from(transactions)
                .where(
                    and(
                        isNull(transactions.deletedAt),
                        gte(transactions.date, new Date(startMs)),
                        lt(transactions.date, new Date(endMs)),
                        lte(transactions.date, new Date(nowMs)),
                        income == null ? undefined : eq(transactions.income, income),
                        contributingIds ? inArray(transactions.categoryId, contributingIds) : undefined
                    )
                )
                .orderBy(desc(transactions.date), asc(transactions.feeForId));
        },
        [enabled, startMs, endMs, nowMs, income, contributingKey],
        nowMs
    );

    return useDecoratedRows(db, data);
}
