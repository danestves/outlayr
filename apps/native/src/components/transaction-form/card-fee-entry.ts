import type { CardFeeInput } from "@/data/card-fees-core";
import type { Transaction } from "@/data/transactions-core";
import { cardFeeAmount } from "@/domain/card-fee";
import type { CardFee } from "@/domain/card-fee";

export interface EntryFee {
    currency: string;
    fee: CardFee | null;
    followsPaidVia: boolean;
}

export function chargedFee({ currency, fee }: EntryFee, base: number | null): number | null {
    if (fee === null || (fee.kind === "amount" && fee.currency !== currency)) {
        return null;
    }
    if (fee.kind === "percent" && base === null) {
        return null;
    }
    const charged = cardFeeAmount(fee, base ?? 0, currency);
    return charged > 0 ? charged : null;
}

export function feeInputOf(
    entry: EntryFee,
    row: Pick<Transaction, "feeForId" | "transferId"> | undefined,
    base: number | null,
    shared: { categoryId: string | null; note: string }
): CardFeeInput | null | undefined {
    if (row?.transferId != null || row?.feeForId != null) {
        return undefined;
    }
    const { currency, fee, followsPaidVia } = entry;
    if (fee === null) {
        return null;
    }
    if (followsPaidVia) {
        const charged = chargedFee(entry, base);
        return charged === null ? null : { ...shared, amount: charged, currency, rate: null };
    }
    return fee.kind === "percent"
        ? { ...shared, amount: null, currency, rate: fee.rate }
        : { ...shared, amount: fee.amount, currency: fee.currency, rate: null };
}
