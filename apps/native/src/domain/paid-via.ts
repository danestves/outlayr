import { cardFeeAmount } from "./card-fee";
import type { CardFee } from "./card-fee";
import { merchantKey } from "./merchant-resolver";

export const PAID_VIA = ["pagoMovil", "transfer", "sameBankTransfer", "card", "cash"] as const;

export type PaidVia = (typeof PAID_VIA)[number];

/** The BCV's ceiling on a Pago Móvil or an interbank transfer, which every Venezuelan bank charges. */
const BOLIVAR_TRANSFER_FEE: CardFee = { kind: "percent", min: 14, rate: 0.003 };

export function isPaidVia(value: string | null | undefined): value is PaidVia {
    return PAID_VIA.some((via) => via === value);
}

export function paidViaFee(via: PaidVia | null): CardFee | null {
    return via === "pagoMovil" || via === "transfer" ? BOLIVAR_TRANSFER_FEE : null;
}

export function paidViaCharge(via: PaidVia | null, amount: number): number | null {
    const fee = paidViaFee(via);
    return fee === null || amount <= 0 ? null : cardFeeAmount(fee, amount, "VES");
}

export interface PaidViaMemory {
    byMerchant: ReadonlyMap<string, PaidVia>;
    latest: PaidVia | null;
}

/** Reads `rows` newest first, so each merchant keeps the way it was last paid. */
export function paidViaMemory(rows: readonly { note: string; paidVia: string | null }[]): PaidViaMemory {
    const byMerchant = new Map<string, PaidVia>();
    let latest: PaidVia | null = null;
    for (const { note, paidVia } of rows) {
        if (!isPaidVia(paidVia)) {
            continue;
        }
        latest ??= paidVia;
        const key = merchantKey(note);
        if (key !== "" && !byMerchant.has(key)) {
            byMerchant.set(key, paidVia);
        }
    }
    return { byMerchant, latest };
}

export function rememberedPaidVia(memory: PaidViaMemory, merchant: string): PaidVia | null {
    return memory.byMerchant.get(merchantKey(merchant)) ?? memory.latest;
}
