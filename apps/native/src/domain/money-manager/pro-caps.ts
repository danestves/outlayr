import { isPerson } from "@outlayr/money/account-kind";

import { isInstallmentAppAccount } from "@/domain/institution-map";
import { FREE_ACCOUNTS, FREE_BUDGETS, FREE_CURRENCIES, FREE_INSTALLMENT_APPS } from "@/domain/pro-limits";

import type { MmImportPlan, OutlayrLedgerState } from "./types";

export type ImportCap = "accounts" | "budgets" | "currencies" | "installmentApps";

const CAPS = ["accounts", "budgets", "currencies", "installmentApps"] as const satisfies readonly ImportCap[];

const FREE = {
    accounts: FREE_ACCOUNTS,
    budgets: FREE_BUDGETS,
    currencies: FREE_CURRENCIES,
    installmentApps: FREE_INSTALLMENT_APPS,
} as const;

// Mirrors `pro-limits`: people and installment apps sit outside the account and currency caps.
const capped = (account: { kind: string; name: string }) => !isPerson(account) && !isInstallmentAppAccount(account);

/**
 * The free caps this import would push past, with the count it would leave behind. A ledger already over a cap from
 * an earlier Pro run is not held back by an import that adds nothing to it.
 */
export function importCapsPassed(plan: MmImportPlan, ledger: OutlayrLedgerState) {
    const created = plan.accounts.filter((account) => account.existingId === null);
    const held = ledger.accounts.filter(capped);
    const added = created.filter(capped);
    const heldApps = ledger.accounts.filter(isInstallmentAppAccount).length;
    const before = {
        accounts: held.length,
        budgets: ledger.budgetCategoryIds.length,
        currencies: new Set(held.map((account) => account.currency)).size,
        installmentApps: heldApps,
    };
    const after = {
        accounts: held.length + added.length,
        budgets: before.budgets + plan.budgets.length,
        currencies: new Set([...held, ...added].map((account) => account.currency)).size,
        installmentApps: heldApps + created.filter(isInstallmentAppAccount).length,
    };
    return CAPS.filter((cap) => after[cap] > FREE[cap] && after[cap] > before[cap]).map((cap) => ({
        cap,
        count: after[cap],
        free: FREE[cap],
    }));
}
