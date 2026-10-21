import { addDays, startOfDay } from "@outlayr/money/calendar";
import { landingDate } from "@outlayr/money/recurrence";
import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import type { LogFilter } from "@/domain/log-filter";
import { cursorEnd, cursorStart } from "@/domain/log-period-cursor";

import { useCategoryMeta } from "./categories";
import { useLiveQuery } from "./live-query";
import { useDecoratedRows } from "./transactions";
import type { TransactionWithCategory } from "./transactions";
import { LOG_COLUMNS } from "./transactions-core";

export interface LogFilterScope {
    categoryId: string | null;
    cursor: Date;
    filter: LogFilter;
    /** 1 = Sunday, 2 = Monday. */
    firstWeekday: number;
    income: boolean;
}

function visibleAt(now: Date) {
    return and(isNull(transactions.deletedAt), lte(transactions.date, now));
}

function categoryScope(categoryId: string, meta: Map<string, { parentId: string | null }>): string[] {
    const ids = [categoryId];
    for (const [id, row] of meta) {
        if (row.parentId === categoryId) {
            ids.push(id);
        }
    }
    return ids;
}

// Unwindowed on purpose: each scope is bounded by the filter, and a subtotal over the loaded page would be wrong.
function filterPredicate(scope: LogFilterScope, now: Date, categoryIds: string[] | null) {
    switch (scope.filter) {
        case "category": {
            return categoryIds && categoryIds.length > 0
                ? and(visibleAt(now), inArray(transactions.categoryId, categoryIds))
                : null;
        }
        case "day":
        case "week":
        case "month": {
            const unit = scope.filter;
            const start = cursorStart(unit, scope.cursor, scope.firstWeekday);
            const end = cursorEnd(unit, scope.cursor, scope.firstWeekday);
            // The current window ends at now: a future-dated row inside it belongs to Upcoming.
            const upper = end.getTime() > now.getTime() ? now : end;
            return and(isNull(transactions.deletedAt), gte(transactions.date, start), lt(transactions.date, upper));
        }
        case "type": {
            return and(visibleAt(now), eq(transactions.income, scope.income));
        }
        case "recurring": {
            return and(visibleAt(now), eq(transactions.onceRecurring, true));
        }
        default: {
            return null;
        }
    }
}

export function useFilteredTransactions(db: Database, nowMs: number, scope: LogFilterScope): TransactionWithCategory[] {
    const meta = useCategoryMeta(db);
    const categoryIds = scope.filter === "category" && scope.categoryId ? categoryScope(scope.categoryId, meta) : null;
    const now = new Date(nowMs);
    const where = filterPredicate(scope, now, categoryIds);
    const rows = useLiveQuery(
        transactions,
        () =>
            where
                ? db
                      .select(LOG_COLUMNS)
                      .from(transactions)
                      .where(where)
                      .orderBy(desc(transactions.day), desc(transactions.date), asc(transactions.feeForId))
                : db.select(LOG_COLUMNS).from(transactions).where(eq(transactions.id, "")),
        [
            nowMs,
            scope.filter,
            scope.categoryId,
            scope.cursor.getTime(),
            scope.income,
            scope.firstWeekday,
            categoryIds?.join(",") ?? "",
        ],
        nowMs
    );

    return useDecoratedRows(db, rows);
}

export interface UpcomingTransactions {
    rows: TransactionWithCategory[];
    /** Every upcoming entry, whatever the horizon: an aggregate over `rows` would move on days nothing was logged. */
    schedules: TransactionWithCategory[];
}

// Furthest next landing first, matching Swift's `FutureListView`.
export function useUpcomingTransactions(db: Database, nowMs: number, limited: boolean): UpcomingTransactions {
    const now = new Date(nowMs);
    const rows = useLiveQuery(
        transactions,
        () =>
            db
                .select(LOG_COLUMNS)
                .from(transactions)
                .where(
                    // `deletedAt` inside each branch, not hoisted: SQLite only walks the
                    // recurring and date indexes as a MULTI-INDEX OR when every branch
                    // carries it, and scans the table otherwise.
                    or(
                        // Upcoming even when its stored date is past: its next occurrence is.
                        and(isNull(transactions.deletedAt), gt(transactions.recurringType, 0)),
                        and(isNull(transactions.deletedAt), gt(transactions.date, now))
                    )
                ),
        [nowMs],
        nowMs
    );

    const decorated = useDecoratedRows(db, rows);

    return useMemo(() => {
        const at = new Date(nowMs);
        const schedules = [...decorated].sort((a, b) => landingDate(b, at).getTime() - landingDate(a, at).getTime());
        if (!limited) {
            return { rows: schedules, schedules };
        }
        const horizon = addDays(startOfDay(at), 14);
        return {
            rows: schedules.filter((row) => landingDate(row, at).getTime() < horizon.getTime()),
            schedules,
        };
    }, [decorated, limited, nowMs]);
}
