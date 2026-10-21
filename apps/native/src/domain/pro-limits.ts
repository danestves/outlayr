import { isPerson } from "@outlayr/money/account-kind";

import { isInstallmentAppAccount } from "./institution-map";

export const FREE_ACCOUNTS = 2;
export const FREE_BUDGETS = 2;
export const FREE_CURRENCIES = 1;
/** People sit outside every other cap: they never count as accounts, installment apps or currencies. */
export const FREE_PEOPLE = 3;
/** Never counts toward {@link FREE_ACCOUNTS} nor uses up the free currency. Cards and loans are plain accounts. */
export const FREE_INSTALLMENT_APPS = 2;
/** Live payoff plans: one paid off has ended and no longer counts. */
export const FREE_PAYOFF_PLANS = 2;

interface CappedAccount {
    readonly currency: string;
    readonly kind: string;
    readonly name: string;
}

export function blocksNewBudget(
    categoryId: string | null,
    budgetedCategoryIds: readonly string[],
    capped: boolean
): boolean {
    if (categoryId === null || !capped) {
        return false;
    }
    return !budgetedCategoryIds.includes(categoryId);
}

export function fullAccountCaps(accounts: readonly Omit<CappedAccount, "currency">[], locked: boolean) {
    const apps = accounts.filter(isInstallmentAppAccount).length;
    return {
        accounts: locked && accounts.length - apps >= FREE_ACCOUNTS,
        installmentApps: locked && apps >= FREE_INSTALLMENT_APPS,
    };
}

const uncapped = (account: CappedAccount) => isPerson(account) || isInstallmentAppAccount(account);

export function blocksNewCurrency(account: CappedAccount, others: readonly CappedAccount[], locked: boolean): boolean {
    if (!locked || uncapped(account)) {
        return false;
    }
    const distinct = new Set(others.filter((other) => !uncapped(other)).map((other) => other.currency));
    return distinct.size >= FREE_CURRENCIES && !distinct.has(account.currency);
}

// An edit that moves it between plain accounts and installment apps (renaming "Cashea" to "Visa") can fill a cap.
export function fillsFullCap(
    caps: ReturnType<typeof fullAccountCaps>,
    account: Omit<CappedAccount, "currency">,
    before: Omit<CappedAccount, "currency"> | null
): boolean {
    const app = isInstallmentAppAccount(account);
    return (before === null || isInstallmentAppAccount(before) !== app) && caps[app ? "installmentApps" : "accounts"];
}

// Keeping a currency the account already holds never blocks, even on a ledger over the cap from an earlier Pro run.
// Renaming an installment app or person into a plain account claims its currency.
export function blocksSavedCurrency(
    account: CappedAccount,
    before: CappedAccount | null,
    others: readonly CappedAccount[],
    locked: boolean
): boolean {
    const kept =
        before !== null &&
        before.currency === account.currency &&
        !isPerson(before) &&
        !isInstallmentAppAccount(before);
    return !kept && blocksNewCurrency(account, others, locked);
}
