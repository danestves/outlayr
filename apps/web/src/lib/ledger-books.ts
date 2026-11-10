import type { Doc } from "@outlayr/backend/convex/_generated/dataModel";
import type { LedgerRows } from "@outlayr/money/ledger-view";

export interface LedgerBooks extends LedgerRows {
    accounts: readonly Doc<"accounts">[];
    appMeta: readonly Pick<Doc<"appMeta">, "key" | "value">[];
    budgets: readonly Doc<"budgets">[];
    categories: readonly Doc<"categories">[];
    exchangeRates: readonly Doc<"exchangeRates">[];
    installmentPlans: readonly Doc<"installmentPlans">[];
    installments: readonly Doc<"installments">[];
    mainBudget: readonly Doc<"mainBudget">[];
    outsideMoves: readonly Doc<"outsideMoves">[];
    outsidePayments: readonly Doc<"outsidePayments">[];
    savingsGoals: readonly Doc<"savingsGoals">[];
    transactions: readonly Doc<"transactions">[];
    transfers: readonly Doc<"transfers">[];
}
