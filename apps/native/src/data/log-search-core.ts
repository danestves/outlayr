import { and, asc, desc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import { transactions } from "@/db/schema";

import type { SpendDb } from "./budget-spent";
import { LOG_COLUMNS } from "./transactions-core";

function escapeLike(value: string): string {
    return value.replaceAll(/[\\%_]/g, (match) => `\\${match}`);
}

// Not Drizzle's `like()`, which emits no `ESCAPE` clause: without one SQLite matches {@link escapeLike}'s backslashes
// literally, and `50%` finds nothing.
function contains(column: SQLiteColumn, query: string): SQL {
    return sql`${column} like ${`%${escapeLike(query)}%`} escape '\\'`;
}

// Widened here alone: search matches on the free-text note, and the Log's own read paints none.
const SEARCH_COLUMNS = {
    ...LOG_COLUMNS,
    details: transactions.details,
} as const;

export interface SearchCriteria {
    /** Resolved outside SQL: `useLiveQuery` listens to one table, so a joined category name would go stale. */
    categoryIds: string[];
    nowMs: number;
    /** Already trimmed. Empty matches nothing rather than everything. */
    query: string;
}

// Free text is searched because Spotlight already indexes it. Bounded by `date <= now` unlike Swift's search: the
// header totals results, and next month's scheduled rent would count money that hasn't moved.
export function searchedTransactionsQuery(db: SpendDb, criteria: SearchCriteria) {
    const { query, categoryIds, nowMs } = criteria;

    if (query === "") {
        return db.select(SEARCH_COLUMNS).from(transactions).where(eq(transactions.id, ""));
    }

    const amount = Number.parseFloat(query);

    return db
        .select(SEARCH_COLUMNS)
        .from(transactions)
        .where(
            and(
                isNull(transactions.deletedAt),
                lte(transactions.date, new Date(nowMs)),
                or(
                    contains(transactions.note, query),
                    contains(transactions.details, query),
                    categoryIds.length > 0 ? inArray(transactions.categoryId, categoryIds) : undefined,
                    Number.isFinite(amount) ? eq(transactions.amount, amount) : undefined
                )
            )
        )
        .orderBy(desc(transactions.day), desc(transactions.date), asc(transactions.feeForId));
}
