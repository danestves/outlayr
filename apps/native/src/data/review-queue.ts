import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";

import { useLiveQuery, useLiveValue } from "./live-query";
import type { TransactionWithCategory } from "./transactions";
import { useDecoratedRows } from "./transactions";
import { reviewCountQuery, reviewQueueQuery } from "./transactions-core";

export type ReviewRow = TransactionWithCategory & { accountId: string | null };

/** Bank and auto-log entries nobody has confirmed yet, newest first. */
export function useReviewQueue(db: Database): ReviewRow[] {
    return useDecoratedRows(
        db,
        useLiveQuery(transactions, () => reviewQueueQuery(db))
    );
}

export function useReviewCount(db: Database): number {
    return useLiveValue(
        transactions,
        () => reviewCountQuery(db),
        (rows) => rows[0]?.waiting ?? 0
    );
}
