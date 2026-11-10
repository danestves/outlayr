import { and, count, countDistinct, gte, isNull, lte } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";

import { useLiveValue } from "./live-query";

export interface LedgerStats {
    days: number;
    entries: number;
}

const NO_STATS: LedgerStats = { days: 0, entries: 0 };

const loggedUntil = (now: number) => and(isNull(transactions.deletedAt), lte(transactions.date, new Date(now)));

export function useLedgerStats(db: Database, now: number): LedgerStats {
    return useLiveValue(
        transactions,
        () =>
            db
                .select({ days: countDistinct(transactions.day), entries: count() })
                .from(transactions)
                .where(loggedUntil(now)),
        (rows) => rows[0] ?? NO_STATS,
        [now]
    );
}

export function useLoggedDaysOfMonth(db: Database, now: number): ReadonlySet<number> {
    const today = new Date(now);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return useLiveValue(
        transactions,
        () =>
            db
                .select({ date: transactions.date })
                .from(transactions)
                .where(and(loggedUntil(now), gte(transactions.date, monthStart))),
        (rows) => new Set(rows.map((row) => row.date.getDate())),
        [now]
    );
}
