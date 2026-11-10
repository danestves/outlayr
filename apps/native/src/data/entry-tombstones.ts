import { and, inArray, isNotNull, isNull, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { Database } from "@/db/client";
import { installmentPlans, installments, outsidePayments, transactions, transfers } from "@/db/schema";

/**
 * What goes with entries a bulk delete just tombstoned, as `Transactions.remove` takes it with one. `taken` must match
 * those tombstones and no row written here, so every statement reads the same entries. Statements only: the caller
 * runs them in order, inside its own transaction.
 */
export function tombstonesWithEntries(db: Database, taken: SQL | undefined, now: Date) {
    const stamp = { deletedAt: now, updatedAt: now };
    const entries = db.select({ id: transactions.id }).from(transactions).where(taken);
    const moved = db
        .select({ id: transactions.transferId })
        .from(transactions)
        .where(and(taken, isNotNull(transactions.transferId)));
    const plans = db
        .select({ id: installmentPlans.id })
        .from(installmentPlans)
        .where(and(isNull(installmentPlans.deletedAt), inArray(installmentPlans.transactionId, entries)));
    const slots = db
        .select({ id: installments.id })
        .from(installments)
        .where(and(isNull(installments.deletedAt), inArray(installments.planId, plans)));
    return [
        () =>
            db
                .update(transfers)
                .set(stamp)
                .where(and(isNull(transfers.deletedAt), inArray(transfers.id, moved))),
        () =>
            db
                .update(transactions)
                .set(stamp)
                .where(
                    and(
                        isNull(transactions.deletedAt),
                        or(
                            inArray(transactions.transferId, moved),
                            inArray(transactions.feeForId, entries),
                            inArray(transactions.installmentId, slots)
                        )
                    )
                ),
        // Children first: they are found through a plan that is still live.
        () =>
            db
                .update(installments)
                .set(stamp)
                .where(and(isNull(installments.deletedAt), inArray(installments.planId, plans))),
        () =>
            db
                .update(outsidePayments)
                .set(stamp)
                .where(and(isNull(outsidePayments.deletedAt), inArray(outsidePayments.planId, plans))),
        () =>
            db
                .update(installmentPlans)
                .set(stamp)
                .where(and(isNull(installmentPlans.deletedAt), inArray(installmentPlans.transactionId, entries))),
    ];
}
