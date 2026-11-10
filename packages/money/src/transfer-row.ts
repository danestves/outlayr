import * as Effect from "effect/Effect";

import type { LedgerCalendar } from "./calendar";
import { frozenUsd } from "./canonical-usd";
import type { RateLookup } from "./rates";
import { roundMoney } from "./round";
import type { FeeSide } from "./transfer-reconcile";

export interface TransferFeeInput {
    amount: number;
    note?: string;
}

export interface TransferInput {
    date: Date;
    exchangeRate: number | null;
    exchangeRateType: string | null;
    fees?: Partial<Record<FeeSide, TransferFeeInput>>;
    fromAccountId: string;
    fromAmount: number;
    fromCurrency: string;
    /** Absent leaves an edited transfer's link alone, so an editor that never shows it cannot unlink it. */
    installmentPlanId?: string | null;
    note?: string;
    toAccountId: string;
    toAmount: number;
    toCurrency: string;
}

const FEE_SIDES = ["source", "destination"] as const satisfies readonly FeeSide[];

/** Why the ledger refuses this transfer, or null when it can move. */
export function transferRejection(input: TransferInput): "empty-leg" | "same-account" | null {
    if (input.fromAccountId === input.toAccountId) {
        return "same-account";
    }
    return input.fromAmount > 0 && input.toAmount > 0 ? null : "empty-leg";
}

export function feeCurrency(input: TransferInput, side: FeeSide): string {
    return side === "destination" ? input.toCurrency : input.fromCurrency;
}

export function chargedFees(input: TransferInput) {
    return FEE_SIDES.flatMap((side) => {
        const fee = input.fees?.[side];
        return fee === undefined ? [] : [{ fee, side }];
    });
}

export interface TransferFiling {
    calendar: LedgerCalendar;
    now: Date;
}

export function legColumns(
    input: TransferInput,
    fromAmountUsd: number | null,
    toAmountUsd: number | null,
    { calendar, now }: TransferFiling
) {
    const filed = calendar(input.date);
    return {
        date: input.date,
        day: filed.day,
        exchangeRate: input.exchangeRate,
        exchangeRateType: input.exchangeRateType,
        fromAccountId: input.fromAccountId,
        fromAmount: input.fromAmount,
        fromAmountUsd,
        fromCurrency: input.fromCurrency,
        month: filed.month,
        note: input.note ?? "",
        toAccountId: input.toAccountId,
        toAmount: input.toAmount,
        toAmountUsd,
        toCurrency: input.toCurrency,
        updatedAt: now,
        ...(input.installmentPlanId !== undefined && { installmentPlanId: input.installmentPlanId }),
    };
}

export function feeColumns(
    input: TransferInput,
    side: FeeSide,
    fee: TransferFeeInput,
    amountUsd: number | null,
    { calendar, now }: TransferFiling
) {
    const filed = calendar(input.date);
    return {
        accountId: side === "destination" ? input.toAccountId : input.fromAccountId,
        amount: fee.amount,
        amountUsd,
        currency: feeCurrency(input, side),
        date: input.date,
        day: filed.day,
        month: filed.month,
        note: fee.note ?? "",
        updatedAt: now,
    };
}

export function feeSideOf(transfer: { toAccountId: string }, fee: { accountId: string | null }): FeeSide {
    return fee.accountId === transfer.toAccountId ? "destination" : "source";
}

const USD_DECIMALS = 6;

export function carriedUsd(
    previous: { amount: number; amountUsd: number | null; currency: string | null; date: Date } | null,
    amount: number,
    currency: string,
    date: Date
): number | undefined {
    if (
        previous === null ||
        previous.amountUsd === null ||
        !(previous.amount > 0) ||
        previous.currency !== currency ||
        previous.date.getTime() !== date.getTime()
    ) {
        return undefined;
    }
    return previous.amount === amount
        ? previous.amountUsd
        : roundMoney((previous.amountUsd * amount) / previous.amount, USD_DECIMALS);
}

// One live fee per side survives, rewritten in place: a side's own row first, else a row whose side stopped charging,
// so a fee moved across keeps its id and the frozen USD that comes with it.
export function keptTransferFees<Fee extends { accountId: string | null }>(
    previous: { toAccountId: string },
    existing: readonly Fee[],
    charged: readonly { side: FeeSide }[]
) {
    const kept = new Map<FeeSide, Fee>();
    for (const { side } of charged) {
        const own = existing.find((fee) => feeSideOf(previous, fee) === side);
        if (own) {
            kept.set(side, own);
        }
    }
    for (const { side } of charged) {
        const spare = existing.find((fee) => ![...kept.values()].includes(fee));
        if (!kept.has(side) && spare) {
            kept.set(side, spare);
        }
    }
    return kept;
}

/**
 * Each leg freezes at its own market rate, so an off-market transfer moves net worth by the spread: receiving
 * 6000 Bs for $100 when the market pays 5550 is $8.11 earned.
 */
export const freezeTransfer = Effect.fn("TransferRow.freezeTransfer")(function* freezeTransfer<E>(
    lookup: RateLookup<E>,
    input: TransferInput
) {
    const amountUsd = (amount: number, currency: string) =>
        frozenUsd(lookup, amount, currency, input.date).pipe(Effect.map((frozen) => frozen.amountUsd));
    const [fromAmountUsd, toAmountUsd, fees] = yield* Effect.all(
        [
            amountUsd(input.fromAmount, input.fromCurrency),
            amountUsd(input.toAmount, input.toCurrency),
            Effect.all(
                chargedFees(input).map(({ fee, side }) =>
                    amountUsd(fee.amount, feeCurrency(input, side)).pipe(Effect.map((usd) => [side, usd] as const))
                ),
                { concurrency: "unbounded" }
            ),
        ],
        { concurrency: "unbounded" }
    );
    return { feesUsd: new Map(fees), fromAmountUsd, toAmountUsd };
});
