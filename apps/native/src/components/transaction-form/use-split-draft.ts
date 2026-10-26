import { useState } from "react";

import { NO_READ, useLiveQuery } from "@/data/live-query";
import { splitsForQuery } from "@/data/splits-core";
import type { Transaction } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { transactionSplits } from "@/db/schema";
import type { Allocation } from "@/domain/split";
import { openDraft } from "@/domain/split-draft";

export interface SplitDraft {
    allocations: Allocation[];
    openSplit: (total: number, categoryId: string | null, decimals: number) => void;
    setAllocations: (next: Allocation[]) => void;
}

// Out of the form store: a split is written after the row exists, like tags, and no validator gates on it.
export function useSplitDraft(
    db: Database,
    mode: "create" | "edit",
    initial: Transaction | undefined,
    restored?: Allocation[]
): SplitDraft {
    const [edited, setAllocations] = useState<Allocation[] | null>(restored ?? null);

    const stored = useLiveQuery(
        transactionSplits,
        () => (mode === "edit" && initial != null && edited === null ? splitsForQuery(db, initial.id) : NO_READ),
        [db, mode, initial?.id, edited === null]
    );
    const allocations = edited ?? stored.map((row) => ({ amount: row.amount, categoryId: row.categoryId }));

    const openSplit = (total: number, categoryId: string | null, decimals: number) => {
        if (allocations.length === 0) {
            setAllocations(openDraft(total, categoryId, decimals));
        }
    };

    return { allocations, openSplit, setAllocations };
}
