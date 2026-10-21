import { useEffect, useState } from "react";

import { splitsForQuery } from "@/data/splits-core";
import type { Transaction } from "@/data/transactions-core";
import type { Database } from "@/db/client";
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
    const [allocations, setAllocations] = useState<Allocation[]>(restored ?? []);
    const [fromDraft] = useState(restored !== undefined);

    // Without this an edit's sheet opens empty and saving silently clears a split the user never touched.
    useEffect(() => {
        if (mode !== "edit" || initial == null || fromDraft) {
            return;
        }
        let cancelled = false;
        splitsForQuery(db, initial.id)
            .then((rows) => {
                if (!cancelled && rows.length > 0) {
                    setAllocations(rows.map((row) => ({ amount: row.amount, categoryId: row.categoryId })));
                }
            })
            .catch((error) => {
                console.error("Failed to read the split", error);
            });
        return () => {
            cancelled = true;
        };
    }, [db, fromDraft, mode, initial]);

    const openSplit = (total: number, categoryId: string | null, decimals: number) => {
        setAllocations((current) => (current.length === 0 ? openDraft(total, categoryId, decimals) : current));
    };

    return { allocations, openSplit, setAllocations };
}
