import { isPerson } from "@outlayr/money/account-kind";
import { isInstallmentAppAccount } from "@outlayr/money/institution-map";

import type { LedgerBooks } from "@/lib/ledger-books";

type UsageBooks = Pick<LedgerBooks, "accounts" | "budgets" | "savingsGoals">;

const isApp = (account: UsageBooks["accounts"][number]) =>
    isInstallmentAppAccount({ kind: account.kind ?? "", name: account.name });

export function planUsage({ accounts, budgets, savingsGoals }: UsageBooks) {
    const open = accounts.filter((account) => account.deletedAt === null && (account.archivedAt ?? null) === null);
    const apps = open.filter(isApp);
    const plain = open.filter((account) => !isPerson(account) && !isApp(account));
    const openIds = new Set(open.map((account) => account.localId));
    return {
        accounts: plain.length,
        budgets: budgets.filter((budget) => budget.deletedAt === null && budget.categoryId !== null).length,
        currencies: new Set(plain.map((account) => account.currency)).size,
        installmentApps: apps.length,
        payoffPlans: savingsGoals.filter(
            (goal) => goal.deletedAt === null && goal.targetAmount === 0 && openIds.has(goal.accountId)
        ).length,
    };
}
