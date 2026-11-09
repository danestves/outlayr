import { ERASED_DATE, ERASED_TRANSACTION, ERASED_TRANSFER } from "@outlayr/money/erase";
import { isNotNull, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { Meta } from "@/data/app-meta-core";
import { TOMBSTONED_BUDGET, TOMBSTONED_MAIN_BUDGET } from "@/data/budgets-core";
import type { Database } from "@/db/client";
import {
    accounts,
    budgetPlans,
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

export { ERASED_DATE, ERASED_TRANSACTION, ERASED_TRANSFER } from "@outlayr/money/erase";

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
            yield* query(scope, () =>
                db.update(accounts).set({ checkedAt: null, updatedAt: now }).where(isNotNull(accounts.checkedAt))
            );
            yield* Meta.remove(db, ["autologWaiting"]);

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
            yield* query(scope, () =>
                db
                    .update(budgetPlans)
                    .set({ amount: null, currency: null, deletedAt: now, updatedAt: now })
                    .where(isNull(budgetPlans.deletedAt))
            );
        }),
        (cause) => new EraseLedgerError({ cause, scope })
    );
});
