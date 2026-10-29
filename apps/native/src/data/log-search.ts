import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";

import { useCategoryMeta } from "./categories";
import { useLiveQuery } from "./live-query";
import { searchedTransactionsQuery } from "./log-search-core";
import { useDecoratedRows } from "./transactions";
import type { TransactionWithCategory } from "./transactions";
import type { Transaction } from "./transactions-core";

export type SearchedTransaction = TransactionWithCategory & Pick<Transaction, "details"> & { itemCount: number };

export function useSearchedTransactions(db: Database, query: string, nowMs: number): SearchedTransaction[] {
    const meta = useCategoryMeta(db);
    const trimmed = query.trim();
    const needle = trimmed.toLowerCase();

    const categoryIds: string[] = [];
    if (needle !== "") {
        for (const [id, row] of meta) {
            if (row.name?.toLowerCase().includes(needle)) {
                categoryIds.push(id);
            }
        }
    }

    const rows = useLiveQuery(
        transactions,
        () => searchedTransactionsQuery(db, { categoryIds, nowMs, query: trimmed }),
        [trimmed, categoryIds.join(","), nowMs],
        nowMs
    );

    return useDecoratedRows(db, rows);
}
