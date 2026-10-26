import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { transactionSplits } from "@/db/schema";
import { newId } from "@/domain/ids";
import { isBalanced } from "@/domain/split";
import type { Allocation } from "@/domain/split";

/** Failed, never written: the row and its parts would state different amounts to every category total. */
export class UnbalancedSplitError extends Schema.TaggedError<UnbalancedSplitError>()("UnbalancedSplitError", {
    allocated: Schema.Number,
    total: Schema.Number,
}) {
    override get message(): string {
        return `Split allocates ${this.allocated} of ${this.total}`;
    }
}

const SplitsOperation = Schema.Literals(["clear", "write"]);

export class SplitsError extends Schema.TaggedError<SplitsError>()("SplitsError", {
    cause: Schema.Defect(),
    operation: SplitsOperation,
}) {
    override get message(): string {
        return `Splits ${this.operation} failed`;
    }
}

const query = <A>(operation: typeof SplitsOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new SplitsError({ cause, operation }), try: run });

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
    clearForTransactions: Effect.fn("Splits.clearForTransactions")(function* clearForTransactions(
        db: Database,
        transactionIds: readonly string[]
    ) {
        if (transactionIds.length === 0) {
            return;
        }
        const now = new Date();
        yield* query("clear", () =>
            db
                .update(transactionSplits)
                .set({ deletedAt: now, updatedAt: now })
                .where(
                    and(
                        inArray(transactionSplits.transactionId, [...transactionIds]),
                        isNull(transactionSplits.deletedAt)
                    )
                )
        );
    }),
    /**
     * Rewritten wholesale, not diffed like tags: a split's parts have no identity worth keeping. No rows means the
     * entry is attributed wholly to its own `categoryId`.
     */
    writeSplit: Effect.fn("Splits.writeSplit")(function* writeSplit(
        db: Database,
        transactionId: string,
        total: number,
        allocations: readonly Allocation[],
        decimals: number
    ) {
        if (allocations.length > 0 && !isBalanced(total, allocations, decimals)) {
            const allocated = allocations.reduce((sum, one) => sum + one.amount, 0);
            return yield* new UnbalancedSplitError({ allocated, total });
        }
        const now = new Date();
        yield* query("write", () =>
            db
                .update(transactionSplits)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(transactionSplits.transactionId, transactionId), isNull(transactionSplits.deletedAt)))
        );
        if (allocations.length === 0) {
            return;
        }
        yield* query("write", () =>
            db.insert(transactionSplits).values(
                allocations.map((allocation, index) => ({
                    amount: allocation.amount,
                    categoryId: allocation.categoryId,
                    deletedAt: null,
                    id: newId(),
                    sortOrder: index,
                    transactionId,
                    updatedAt: now,
                }))
            )
        );
    }),
};
