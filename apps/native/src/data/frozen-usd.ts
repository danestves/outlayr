import { canonicalUsd } from "@outlayr/money/canonical-usd";

import type { Database } from "@/db/client";

import { localRateLookup } from "./rates";

// Frozen at the rate of its own day, the contract `transactions.amountUsd` keeps. Signed: an account can open
// overdrawn, so the magnitude is canonicalized and the sign restored.
export async function frozenUsd(
    db: Database,
    amount: number,
    currency: string,
    date: Date
): Promise<{ amountUsd: number | null; exchangeRate: number | null }> {
    if (amount === 0) {
        return { amountUsd: 0, exchangeRate: null };
    }
    const { amountUsd, exchangeRate } = await canonicalUsd(localRateLookup(db), {
        amount: Math.abs(amount),
        currency,
        date,
        displayCurrency: currency,
    });
    return {
        amountUsd: amountUsd == null ? null : Math.sign(amount) * amountUsd,
        exchangeRate: exchangeRate ?? null,
    };
}

export async function frozenUsdAmount(
    db: Database,
    amount: number,
    currency: string,
    date: Date
): Promise<number | null> {
    const { amountUsd } = await frozenUsd(db, amount, currency, date);
    return amountUsd;
}
