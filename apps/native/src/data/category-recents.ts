import { and, desc, eq, isNotNull, isNull, max } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";

import { useLiveQuery } from "./live-query";

export const RECENT_CATEGORY_LIMIT = 5;

// Ids only: `useLiveQuery` listens to one table, so a joined name or colour would go stale.
export function recentCategoryIdsQuery(db: Database, income: boolean, limit: number = RECENT_CATEGORY_LIMIT) {
    return db
        .select({ categoryId: transactions.categoryId })
        .from(transactions)
        .where(and(eq(transactions.income, income), isNotNull(transactions.categoryId), isNull(transactions.deletedAt)))
        .groupBy(transactions.categoryId)
        .orderBy(desc(max(transactions.date)))
        .limit(limit);
}

export function useRecentCategoryIds(db: Database, income: boolean): string[] {
    const rows = useLiveQuery(transactions, () => recentCategoryIdsQuery(db, income), [income]);
    return rows.map((row) => row.categoryId).filter((id): id is string => id != null);
}
