import * as Effect from "effect/Effect";

import { frozenUsd } from "./canonical-usd";
import { decimalsFor } from "./currency";
import { utcDateString } from "./dates";
import type { RateLookup } from "./rates";
import { roundMoney } from "./round";

export type CardFee =
    | { amount: number; currency: string; kind: "amount" }
    | { kind: "percent"; min?: number; rate: number };

export type CardFeeInput = { categoryId: string | null; currency: string; note: string } & (
    | { amount: number; rate: null }
    | { amount: null; rate: number }
);

interface FeePurchase {
    accountId?: string | null;
    amount: number;
    amountUsd?: number | null;
    currency?: string | null;
    date: Date;
    day: Date;
    month: Date;
}

const roundToMinorUnits = (amount: number, code: string) => roundMoney(amount, decimalsFor(code));

export function cardFeeAmount(fee: CardFee, base: number, currency: string): number {
    return fee.kind === "amount"
        ? roundToMinorUnits(fee.amount, fee.currency)
        : Math.max(roundToMinorUnits(base * fee.rate, currency), fee.min ?? 0);
}

export function cardFeeBase(
    amount: number,
    currencies: { card: string; entry: string },
    toUsd: (amount: number) => number | null,
    cardPerUsd: number | null
): number | null {
    if (amount <= 0) {
        return null;
    }
    if (currencies.card === currencies.entry) {
        return amount;
    }
    const usd = currencies.entry === "USD" ? amount : toUsd(amount);
    if (usd === null) {
        return null;
    }
    if (currencies.card === "USD") {
        return roundToMinorUnits(usd, "USD");
    }
    return cardPerUsd === null ? null : roundToMinorUnits(usd * cardPerUsd, currencies.card);
}

const percentFee = Effect.fn("CardFee.percentFee")(function* percentFee<E>(
    lookup: RateLookup<E>,
    purchase: FeePurchase,
    rate: number,
    currency: string
) {
    const entry = purchase.currency ?? currency;
    const quote =
        currency === "USD" || currency === entry
            ? null
            : yield* lookup(currency, "official", utcDateString(purchase.date.getTime()));
    const base = cardFeeBase(
        purchase.amount,
        { card: currency, entry },
        () => purchase.amountUsd ?? null,
        quote?.rate ?? null
    );
    return base === null ? null : cardFeeAmount({ kind: "percent", rate }, base, currency);
});

export const cardFeeValues = Effect.fn("CardFee.cardFeeValues")(function* cardFeeValues<E>(
    lookup: RateLookup<E>,
    purchaseId: string,
    purchase: FeePurchase,
    fee: CardFeeInput
) {
    const charged = fee.rate === null ? fee.amount : yield* percentFee(lookup, purchase, fee.rate, fee.currency);
    const frozen = charged === null ? null : yield* frozenUsd(lookup, charged, fee.currency, purchase.date);
    return {
        accountId: purchase.accountId ?? null,
        amount: charged ?? 0,
        amountUsd: frozen?.amountUsd ?? null,
        categoryId: fee.categoryId,
        currency: fee.currency,
        date: purchase.date,
        day: purchase.day,
        deletedAt: null,
        feeForId: purchaseId,
        feeRate: fee.rate,
        income: false,
        month: purchase.month,
        note: fee.note,
    };
});

/** The input that recharges a saved fee on another occurrence of its purchase. */
export function savedFeeInput(fee: {
    amount: number;
    categoryId: string | null;
    currency: string;
    feeRate: number | null;
    note: string;
}): CardFeeInput {
    const shared = { categoryId: fee.categoryId, currency: fee.currency, note: fee.note };
    return fee.feeRate === null
        ? { ...shared, amount: fee.amount, rate: null }
        : { ...shared, amount: null, rate: fee.feeRate };
}

/** A rewritten fee keeps its frozen money unless the fee itself or the purchase's money moved. */
export function keptFeeValue(
    existing: { amount: number; amountUsd: number | null; currency: string | null; feeRate: number | null },
    values: { amount: number; currency: string; feeRate: number | null },
    moneyKept: boolean
) {
    const sameFee =
        existing.feeRate === values.feeRate &&
        existing.currency === values.currency &&
        (values.feeRate !== null || existing.amount === values.amount);
    return sameFee && moneyKept ? { amount: existing.amount, amountUsd: existing.amountUsd } : {};
}
