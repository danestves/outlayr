import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import { transactions } from "@/db/schema";
import type * as schema from "@/db/schema";

// Both drivers are `"sync"`, which keeps `.all()` typed as rows so `useLiveQuery` can read in render. The schema
// parameter is this app's own: a handle opened without it can't answer these queries.
export type SpendDb = BaseSQLiteDatabase<"sync", unknown, typeof schema>;

// No per-budget SQL: windows and category rules apply in JS over this one result, because `useLiveQuery` adds a
// listener per call and per-budget queries would re-run the same full scan on every insert.
export function expenseContributionQuery(db: SpendDb, now: Date, since: Date | null = null) {
    return db
        .select({
            amount: transactions.amount,
            amountUsd: transactions.amountUsd,
            categoryId: transactions.categoryId,
            currency: transactions.currency,
            date: transactions.date,
            exchangeRate: transactions.exchangeRate,
            exchangeRateType: transactions.exchangeRateType,
        })
        .from(transactions)
        .where(
            and(
                eq(transactions.income, false),
                isNull(transactions.deletedAt),
                since ? gte(transactions.date, since) : undefined,
                lte(transactions.date, now)
            )
        )
        .orderBy(asc(transactions.date));
}
