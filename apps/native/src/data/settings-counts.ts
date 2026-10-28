import { count, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";

import { useLiveValue } from "./live-query";
import { deletedTransactionsQuery } from "./transactions-core";

export function useCategoryCount(db: Database): number {
    return useLiveValue(
        categories,
        () => db.select({ total: count() }).from(categories).where(isNull(categories.deletedAt)),
        (rows) => rows[0]?.total ?? 0
    );
}

export function useDeletedCount(db: Database): number {
    return useLiveValue(
        transactions,
        () => deletedTransactionsQuery(db),
        (rows) => rows.length
    );
}
