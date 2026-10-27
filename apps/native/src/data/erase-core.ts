import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { TOMBSTONED_BUDGET, TOMBSTONED_MAIN_BUDGET } from "@/data/budgets-core";
import type { Database } from "@/db/client";
import {
    budgets,
    installmentPlans,
    installments,
    mainBudget,
    outsideMoves,
    outsidePayments,
    transactionAttachments,
    transactions,
    transfers,
} from "@/db/schema";
import { transaction } from "@/db/transaction";

export type EraseScope = "transactions" | "everything";

export class EraseLedgerError extends Schema.TaggedError<EraseLedgerError>()("EraseLedgerError", {
    cause: Schema.Defect(),
    scope: Schema.Literals(["transactions", "everything"]),
}) {
    override get message(): string {
        return `Erasing ${this.scope} failed`;
    }
}

const query = <A>(scope: EraseScope, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new EraseLedgerError({ cause, scope }), try: run });

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
export const eraseLedger = Effect.fn("Erase.eraseLedger")(function* eraseLedger(db: Database, scope: EraseScope) {
    const now = new Date();

    yield* transaction(
        db,
        Effect.gen(function* write() {
            yield* query(scope, () =>
                db
                    .update(transactions)
                    .set({ ...ERASED_TRANSACTION, deletedAt: now, updatedAt: now })
                    .where(isNull(transactions.deletedAt))
            );
            yield* query(scope, () =>
                db
                    .update(transfers)
                    .set({ ...ERASED_TRANSFER, deletedAt: now, updatedAt: now })
                    .where(isNull(transfers.deletedAt))
            );
            yield* query(scope, () =>
                db
                    .update(installments)
                    .set({ amount: 0, deletedAt: now, dueDate: ERASED_DATE, updatedAt: now })
                    .where(isNull(installments.deletedAt))
            );
            yield* query(scope, () =>
                db
                    .update(outsidePayments)
                    .set({ amount: 0, amountUsd: null, date: ERASED_DATE, deletedAt: now, updatedAt: now })
                    .where(isNull(outsidePayments.deletedAt))
            );
            yield* query(scope, () =>
                db
                    .update(outsideMoves)
                    .set({ amount: 0, amountUsd: null, date: ERASED_DATE, deletedAt: now, note: "", updatedAt: now })
                    .where(isNull(outsideMoves.deletedAt))
            );
            yield* query(scope, () =>
                db
                    .update(transactionAttachments)
                    .set({ deletedAt: now, imageKey: null, imageUri: null, name: null, updatedAt: now })
                    .where(isNull(transactionAttachments.deletedAt))
            );
            yield* query(scope, () =>
                db
                    .update(installmentPlans)
                    .set({ dateCreated: ERASED_DATE, deletedAt: now, updatedAt: now })
                    .where(isNull(installmentPlans.deletedAt))
            );

            if (scope !== "everything") {
                return;
            }
            yield* query(scope, () =>
                db
                    .update(budgets)
                    .set({ ...TOMBSTONED_BUDGET, deletedAt: now, updatedAt: now })
                    .where(isNull(budgets.deletedAt))
            );
            yield* query(scope, () =>
                db
                    .update(mainBudget)
                    .set({ ...TOMBSTONED_MAIN_BUDGET, deletedAt: now, updatedAt: now })
                    .where(isNull(mainBudget.deletedAt))
            );
        }),
        (cause) => new EraseLedgerError({ cause, scope })
    );
});
