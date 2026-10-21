import { isPerson, toAccountKind } from "@outlayr/money/account-kind";
import { decimalsFor } from "@outlayr/money/currency";

import type { PaymentSource } from "@/data/installments-core";

// Stored the way the transfer editor stores a cross-currency move: rate as destination per source, typed `official`.
export function paymentSource(
    amount: number,
    from: { currency: string; id: string },
    toCurrency: string,
    rate: number | null
): PaymentSource | null {
    if (from.currency === toCurrency) {
        return {
            exchangeRate: 1,
            exchangeRateType: null,
            fromAccountId: from.id,
            fromAmount: amount,
            fromCurrency: from.currency,
        };
    }
    if (rate === null || !(rate > 0)) {
        return null;
    }
    const scale = 10 ** decimalsFor(from.currency);
    return {
        exchangeRate: rate,
        exchangeRateType: "official",
        fromAccountId: from.id,
        fromAmount: Math.round((amount / rate) * scale) / scale,
        fromCurrency: from.currency,
    };
}

export function paymentSources<T extends { readonly id: string; readonly kind: string }>(
    accounts: readonly T[],
    planAccountId: string | undefined
): T[] {
    const offered = accounts.filter((account) => account.id !== planAccountId && !isPerson(account));
    const card = (account: T) => toAccountKind(account.kind) === "liability";
    return [...offered.filter((account) => !card(account)), ...offered.filter(card)];
}
