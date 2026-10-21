import { and, eq, inArray, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { Database } from "@/db/client";
import { installmentPlans, installments, outsidePayments, transactions, transfers } from "@/db/schema";

const PLAN_CHILDREN = [installments, outsidePayments] as const;

// `unlink` clears payments' link (the money did move); an undoable cascade keeps it, since a link to a tombstoned plan
// is inert. Statements only: the caller supplies the transaction. Its own module to break an import cycle with
// `installments-core`.
export async function tombstonePlans(db: Database, where: SQL, now: Date, unlink: boolean): Promise<void> {
    const doomed = db
        .select({ id: installmentPlans.id })
        .from(installmentPlans)
        .where(and(isNull(installmentPlans.deletedAt), where));
    if (unlink) {
        await db
            .update(transfers)
            .set({ installmentPlanId: null, updatedAt: now })
            .where(inArray(transfers.installmentPlanId, doomed));
    }
    await Promise.all(
        PLAN_CHILDREN.map((child) =>
            db
                .update(child)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(isNull(child.deletedAt), inArray(child.planId, doomed)))
        )
    );
    await db
        .update(installmentPlans)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(isNull(installmentPlans.deletedAt), where));
}

// Payments stay linked so a restore can bring the order back.
export async function tombstonePlansForTransaction(db: Database, transactionId: string, now: Date): Promise<void> {
    const plans = db
        .select({ id: installmentPlans.id })
        .from(installmentPlans)
        .where(and(eq(installmentPlans.transactionId, transactionId), isNull(installmentPlans.deletedAt)));
    await db
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
        );
    await tombstonePlans(db, eq(installmentPlans.transactionId, transactionId), now, false);
}

// Only what was tombstoned at the entry's own instant comes back; rows deleted on their own before it stay deleted.
export async function restorePlansForTransaction(
    db: Database,
    transactionId: string,
    deletedAt: Date,
    now: Date,
    restoredAt: Date
): Promise<void> {
    const taken = and(eq(installmentPlans.transactionId, transactionId), eq(installmentPlans.deletedAt, deletedAt));
    await db
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
        );
    await Promise.all(
        PLAN_CHILDREN.map((child) =>
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
    );
    await db.update(installmentPlans).set({ deletedAt: null, restoredAt, updatedAt: now }).where(taken);
}

export async function tombstonePlansOnAccount(db: Database, accountId: string, now: Date): Promise<void> {
    await tombstonePlans(db, eq(installmentPlans.accountId, accountId), now, true);
}
