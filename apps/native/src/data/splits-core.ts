import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactionSplits } from "@/db/schema";
import { newId } from "@/domain/ids";
import { isBalanced } from "@/domain/split";
import type { Allocation } from "@/domain/split";

/** Thrown, never written: the row and its parts would state different amounts to every category total. */
export class UnbalancedSplitError extends Error {
    constructor(total: number, allocated: number) {
        super(`Split allocates ${allocated} of ${total}`);
        this.name = "UnbalancedSplitError";
    }
}

export function splitsForQuery(db: Database, transactionId: string) {
    return db
        .select({
            amount: transactionSplits.amount,
            categoryId: transactionSplits.categoryId,
            id: transactionSplits.id,
        })
        .from(transactionSplits)
        .where(and(eq(transactionSplits.transactionId, transactionId), isNull(transactionSplits.deletedAt)))
        .orderBy(asc(transactionSplits.sortOrder));
}

export const splitsRepo = {
    /** A live split under a tombstoned entry would keep feeding its categories forever. */
    async clearForTransactions(db: Database, transactionIds: readonly string[]): Promise<void> {
        if (transactionIds.length === 0) {
            return;
        }
        const now = new Date();
        await db
            .update(transactionSplits)
            .set({ deletedAt: now, updatedAt: now })
            .where(
                and(inArray(transactionSplits.transactionId, [...transactionIds]), isNull(transactionSplits.deletedAt))
            );
    },
    /**
     * Rewritten wholesale, not diffed like tags: a split's parts have no identity worth keeping. No rows means the
     * entry is attributed wholly to its own `categoryId`.
     */
    async writeSplit(
        db: Database,
        transactionId: string,
        total: number,
        allocations: readonly Allocation[],
        decimals: number
    ): Promise<void> {
        if (allocations.length > 0 && !isBalanced(total, allocations, decimals)) {
            const allocated = allocations.reduce((sum, one) => sum + one.amount, 0);
            throw new UnbalancedSplitError(total, allocated);
        }
        const now = new Date();
        await db
            .update(transactionSplits)
            .set({ deletedAt: now, updatedAt: now })
            .where(and(eq(transactionSplits.transactionId, transactionId), isNull(transactionSplits.deletedAt)));
        if (allocations.length === 0) {
            return;
        }
        await db.insert(transactionSplits).values(
            allocations.map((allocation, index) => ({
                amount: allocation.amount,
                categoryId: allocation.categoryId,
                deletedAt: null,
                id: newId(),
                sortOrder: index,
                transactionId,
                updatedAt: now,
            }))
        );
    },
};
