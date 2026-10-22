import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { isNull } from "drizzle-orm";

import { TOMBSTONED_BUDGET, TOMBSTONED_MAIN_BUDGET } from "@/data/budgets-core";
import type { Database } from "@/db/client";
import {
    budgets,
    installmentPlans,
    installments,
    mainBudget,
    outsideMoves,
    outsidePayments,
    transactions,
    transfers,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";

export type EraseScope = "transactions" | "everything";

// The one mark left on a scrubbed tombstone: `deletedTransactionsQuery` reads tombstones, and this tells an erase's
// wreckage from a single deleted entry the user may want back.
export const ERASED_DATE = new Date(0);

// Keeps only what replication needs (id, `deletedAt`, `updatedAt`); not-null columns take a neutral value. The schedule
// is retired to `none` so `repairOrphanedRecurrence` can't mint a successor from an erased row.
export const ERASED_TRANSACTION = {
    accountId: null,
    amount: 0,
    amountUsd: null,
    categoryId: null,
    currency: null,
    customColor: null,
    date: ERASED_DATE,
    day: ERASED_DATE,
    details: null,
    emoji: null,
    exchangeRate: null,
    exchangeRateType: null,
    feeForId: null,
    feeRate: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    imageUri: null,
    income: false,
    installmentId: null,
    month: ERASED_DATE,
    note: "",
    onceRecurring: false,
    paidVia: null,
    recurringAnchorDay: null,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: RECURRING_TYPE.none,
    reminderLeadDays: null,
    transferId: null,
} as const;

/** The two account ids stay: both are `notNull`, so blanking them would point the row at no account. */
const ERASED_TRANSFER = {
    date: ERASED_DATE,
    dateCreated: ERASED_DATE,
    day: ERASED_DATE,
    exchangeRate: null,
    exchangeRateType: null,
    fromAmount: 0,
    fromAmountUsd: null,
    fromCurrency: "",
    installmentPlanId: null,
    month: ERASED_DATE,
    note: "",
    toAmount: 0,
    toAmountUsd: null,
    toCurrency: "",
} as const;

// Tombstoned, not dropped: a hard delete leaves nothing to replicate, so the first pull would hand the ledger back.
// Already-tombstoned rows are skipped so a second erase doesn't re-stamp and push unchanged rows.
export async function eraseLedger(db: Database, scope: EraseScope): Promise<void> {
    const now = new Date();

    await withTransaction(db, async () => {
        await db
            .update(transactions)
            .set({ ...ERASED_TRANSACTION, deletedAt: now, updatedAt: now })
            .where(isNull(transactions.deletedAt));
        await db
            .update(transfers)
            .set({ ...ERASED_TRANSFER, deletedAt: now, updatedAt: now })
            .where(isNull(transfers.deletedAt));
        await db
            .update(installments)
            .set({ amount: 0, deletedAt: now, dueDate: ERASED_DATE, updatedAt: now })
            .where(isNull(installments.deletedAt));
        await db
            .update(outsidePayments)
            .set({ amount: 0, amountUsd: null, date: ERASED_DATE, deletedAt: now, updatedAt: now })
            .where(isNull(outsidePayments.deletedAt));
        await db
            .update(outsideMoves)
            .set({ amount: 0, amountUsd: null, date: ERASED_DATE, deletedAt: now, note: "", updatedAt: now })
            .where(isNull(outsideMoves.deletedAt));
        await db
            .update(installmentPlans)
            .set({ dateCreated: ERASED_DATE, deletedAt: now, updatedAt: now })
            .where(isNull(installmentPlans.deletedAt));

        if (scope !== "everything") {
            return;
        }
        await db
            .update(budgets)
            .set({ ...TOMBSTONED_BUDGET, deletedAt: now, updatedAt: now })
            .where(isNull(budgets.deletedAt));
        await db
            .update(mainBudget)
            .set({ ...TOMBSTONED_MAIN_BUDGET, deletedAt: now, updatedAt: now })
            .where(isNull(mainBudget.deletedAt));
    });
}
