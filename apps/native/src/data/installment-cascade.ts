import { and, eq, inArray, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { installmentPlans, installments, outsidePayments, transactions, transfers } from "@/db/schema";

const PLAN_CHILDREN = [installments, outsidePayments] as const;

const InstallmentCascadeOperation = Schema.Literals(["restore", "tombstone"]);

export class InstallmentCascadeError extends Schema.TaggedError<InstallmentCascadeError>()("InstallmentCascadeError", {
    cause: Schema.Defect(),
    operation: InstallmentCascadeOperation,
}) {
    override get message(): string {
        return `Installment cascade ${this.operation} failed`;
    }
}

const statement = <A>(operation: typeof InstallmentCascadeOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new InstallmentCascadeError({ cause, operation }), try: run });

// `unlink` clears payments' link (the money did move); an undoable cascade keeps it, since a link to a tombstoned plan
// is inert. Statements only: the caller supplies the transaction. Its own module to break an import cycle with
// `installments-core`.
export const tombstonePlans = Effect.fn("InstallmentCascade.tombstonePlans")(function* tombstonePlans(
    db: Database,
    where: SQL,
    now: Date,
    unlink: boolean
) {
    const doomed = db
        .select({ id: installmentPlans.id })
        .from(installmentPlans)
        .where(and(isNull(installmentPlans.deletedAt), where));
    if (unlink) {
        yield* statement("tombstone", () =>
            db
                .update(transfers)
                .set({ installmentPlanId: null, updatedAt: now })
                .where(inArray(transfers.installmentPlanId, doomed))
        );
    }
    yield* Effect.all(
        PLAN_CHILDREN.map((child) =>
            statement("tombstone", () =>
                db
                    .update(child)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(and(isNull(child.deletedAt), inArray(child.planId, doomed)))
            )
        ),
        { concurrency: "unbounded", discard: true }
    );
    yield* statement("tombstone", () =>
        db
            .update(installmentPlans)
            .set({ deletedAt: now, updatedAt: now })
            .where(and(isNull(installmentPlans.deletedAt), where))
    );
});

// Payments stay linked so a restore can bring the order back.
export const tombstonePlansForTransaction = Effect.fn("InstallmentCascade.tombstonePlansForTransaction")(
    function* tombstonePlansForTransaction(db: Database, transactionId: string, now: Date) {
        const plans = db
            .select({ id: installmentPlans.id })
            .from(installmentPlans)
            .where(and(eq(installmentPlans.transactionId, transactionId), isNull(installmentPlans.deletedAt)));
        yield* statement("tombstone", () =>
            db
                .update(transactions)
                .set({ deletedAt: now, updatedAt: now })
                .where(
                    and(
                        isNull(transactions.deletedAt),
                        inArray(
                            transactions.installmentId,
                            db
                                .select({ id: installments.id })
                                .from(installments)
                                .where(and(isNull(installments.deletedAt), inArray(installments.planId, plans)))
                        )
                    )
                )
        );
        yield* tombstonePlans(db, eq(installmentPlans.transactionId, transactionId), now, false);
    }
);

// Only what was tombstoned at the entry's own instant comes back; rows deleted on their own before it stay deleted.
export const restorePlansForTransaction = Effect.fn("InstallmentCascade.restorePlansForTransaction")(
    function* restorePlansForTransaction(
        db: Database,
        transactionId: string,
        deletedAt: Date,
        now: Date,
        restoredAt: Date
    ) {
        const taken = and(eq(installmentPlans.transactionId, transactionId), eq(installmentPlans.deletedAt, deletedAt));
        yield* statement("restore", () =>
            db
                .update(transactions)
                .set({ deletedAt: null, restoredAt, updatedAt: now })
                .where(
                    and(
                        eq(transactions.deletedAt, deletedAt),
                        inArray(
                            transactions.installmentId,
                            db
                                .select({ id: installments.id })
                                .from(installments)
                                .where(
                                    and(
                                        eq(installments.deletedAt, deletedAt),
                                        inArray(
                                            installments.planId,
                                            db.select({ id: installmentPlans.id }).from(installmentPlans).where(taken)
                                        )
                                    )
                                )
                        )
                    )
                )
        );
        yield* Effect.all(
            PLAN_CHILDREN.map((child) =>
                statement("restore", () =>
                    db
                        .update(child)
                        .set({ deletedAt: null, restoredAt, updatedAt: now })
                        .where(
                            and(
                                eq(child.deletedAt, deletedAt),
                                inArray(
                                    child.planId,
                                    db.select({ id: installmentPlans.id }).from(installmentPlans).where(taken)
                                )
                            )
                        )
                )
            ),
            { concurrency: "unbounded", discard: true }
        );
        yield* statement("restore", () =>
            db.update(installmentPlans).set({ deletedAt: null, restoredAt, updatedAt: now }).where(taken)
        );
    }
);

export const tombstonePlansOnAccount = Effect.fn("InstallmentCascade.tombstonePlansOnAccount")(
    function* tombstonePlansOnAccount(db: Database, accountId: string, now: Date) {
        yield* tombstonePlans(db, eq(installmentPlans.accountId, accountId), now, true);
    }
);
