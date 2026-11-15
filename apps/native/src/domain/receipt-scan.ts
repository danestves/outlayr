import { utcDateString } from "@outlayr/money/dates";
import { roundMoney } from "@outlayr/money/round";
import type { RateTable } from "@outlayr/money/valuation";

import { pendingCategoryFor } from "@/data/categories-core";
import type { PendingCategory } from "@/data/categories-core";
import type { ReceiptDraft, ReceiptItem } from "@/lib/cloud-ai";

import { minorUnitsFor } from "./money";
import { foldName, spokenDateToLocal, uniqueMatch } from "./voice-entry";
import type { AccountCandidate, CategoryCandidate } from "./voice-entry";

export interface ResolvedReceipt {
    accountId: string | null;
    accountUnresolved: boolean;
    amount: number;
    categoryId: string | null;
    categoryUnresolved: boolean;
    currency: string;
    currencySource: "printed" | "inferred";
    /** The receipt printed a code the ledger cannot price; `currency` is the ledger's as a stand-in. */
    currencyUnresolved: boolean;
    date: Date;
    domain: string | null;
    income: boolean;
    items: ReceiptItem[];
    merchant: string;
    pendingCategory: PendingCategory | null;
    paymentMethod: string | null;
    subtotal: number | null;
    tax: number | null;
    tip: number | null;
}

interface ResolveArgs {
    accounts: readonly AccountCandidate[];
    accountsOmitted?: boolean;
    categoriesOmitted?: boolean;
    categories: readonly CategoryCandidate[];
    currency: string;
    draft: ReceiptDraft;
    now: Date;
}

function roundLine(value: number | null, currency: string): number | null {
    return value === null ? null : roundMoney(value, minorUnitsFor(currency));
}

export function resolveReceipt({
    accounts,
    accountsOmitted = false,
    categories,
    categoriesOmitted = false,
    currency,
    draft,
    now,
}: ResolveArgs): ResolvedReceipt {
    const paid = draft.currency ?? currency;
    const sameKind = categories.filter((candidate) => candidate.income === draft.income);
    const proposed = draft.categoryName;
    const category = uniqueMatch(sameKind, proposed, (candidate) => candidate.name);
    const known = (name: string) =>
        sameKind.some((candidate) => candidate.name !== null && foldName(candidate.name) === foldName(name));
    const pendingCategory =
        proposed !== null && category === null && !categoriesOmitted && !known(proposed)
            ? pendingCategoryFor(proposed, draft.parentCategoryName ?? null)
            : null;
    const account = uniqueMatch(accounts, draft.accountName, (candidate) => candidate.name);
    return {
        accountId: account?.id ?? null,
        accountUnresolved: draft.accountName === null ? accountsOmitted : account === null,
        amount: roundMoney(draft.total, minorUnitsFor(paid)),
        categoryId: category?.id ?? null,
        categoryUnresolved: categoriesOmitted,
        currency: paid,
        currencySource: draft.currencySource,
        currencyUnresolved: draft.currencyUnresolved,
        date: spokenDateToLocal(draft.date, now),
        domain: draft.domain,
        income: draft.income,
        items: draft.items.map((item) => ({ ...item, price: roundMoney(item.price, minorUnitsFor(paid)) })),
        merchant: draft.merchant,
        paymentMethod: draft.paymentMethod,
        pendingCategory,
        subtotal: roundLine(draft.subtotal, paid),
        tax: roundLine(draft.tax, paid),
        tip: roundLine(draft.tip, paid),
    };
}

export function savableReceipt(
    receipt: ResolvedReceipt
): { categoryId: string | null; pendingCategory: PendingCategory | null } | null {
    const named = receipt.merchant.trim().length > 0;
    const placed = !(receipt.accountUnresolved || receipt.categoryUnresolved || receipt.currencyUnresolved);
    const filed = receipt.categoryId !== null || receipt.pendingCategory !== null;
    if (!filed || receipt.amount <= 0 || !named || !placed) {
        return null;
    }
    return { categoryId: receipt.categoryId, pendingCategory: receipt.pendingCategory };
}

export function formatQuantity(quantity: number): string {
    return String(Math.round(quantity * 1000) / 1000);
}

export interface Conversion {
    amount: number;
    /** How many units of the ledger's currency one unit of the receipt's buys. */
    rate: number;
}

function usableRate(rate: number | null): rate is number {
    return rate !== null && Number.isFinite(rate) && rate > 0;
}

export function conversionOf(receipt: ResolvedReceipt, ledgerCurrency: string, rates: RateTable): Conversion | null {
    if (receipt.currency === ledgerCurrency) {
        return null;
    }
    const dateKey = utcDateString(receipt.date.getTime());
    const perUsdPaid = receipt.currency === "USD" ? 1 : rates.get(receipt.currency, dateKey);
    const perUsdLedger = ledgerCurrency === "USD" ? 1 : rates.get(ledgerCurrency, dateKey);
    if (!(usableRate(perUsdPaid) && usableRate(perUsdLedger))) {
        return null;
    }
    const rate = perUsdLedger / perUsdPaid;
    return {
        amount: roundMoney(receipt.amount * rate, minorUnitsFor(ledgerCurrency)),
        rate,
    };
}
