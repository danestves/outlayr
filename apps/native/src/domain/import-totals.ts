import { currencyTotals } from "@outlayr/money/currency-totals";
import type { CurrencyBucket } from "@outlayr/money/currency-totals";

interface TotalledEntry {
    amount: number;
    currency?: string | null;
    income: boolean;
}

export function importCurrencyEntry({ amount, currency, income }: TotalledEntry, ledgerCurrency: string) {
    return { amount, amountUsd: null, currency: currency ?? ledgerCurrency, income };
}

// Zero is zero in any currency, so an empty selection still shows the ledger's figure.
export function importOutTotals(entries: readonly TotalledEntry[], ledgerCurrency: string): CurrencyBucket[] {
    const out = entries.filter((entry) => !entry.income).map((entry) => importCurrencyEntry(entry, ledgerCurrency));
    return out.length === 0
        ? [{ amount: 0, currencyCode: ledgerCurrency, transactionCount: 0 }]
        : currencyTotals(out, ledgerCurrency);
}
