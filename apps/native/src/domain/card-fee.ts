import type { CardFee } from "@outlayr/money/card-fee";

import type { Language } from "@/i18n/languages";

import { numberLocale } from "./money";
import { numpadToNumber } from "./numpad";

export { cardFeeAmount, cardFeeBase } from "@outlayr/money/card-fee";
export type { CardFee } from "@outlayr/money/card-fee";

export type FeeDraft =
    | { kind: "none" }
    | { kind: "percent"; rate: number }
    | { kind: "typed"; text: string; unit: "percent" }
    | { currency: string; kind: "typed"; text: string; unit: "amount" };

export const NO_FEE: FeeDraft = { kind: "none" };

export function cardFeeOf(draft: FeeDraft): CardFee | null {
    if (draft.kind === "none") {
        return null;
    }
    if (draft.kind === "percent") {
        return draft.rate > 0 ? { kind: "percent", rate: draft.rate } : null;
    }
    const typed = numpadToNumber(draft.text);
    if (typed <= 0) {
        return null;
    }
    return draft.unit === "percent"
        ? { kind: "percent", rate: typed / 100 }
        : { amount: typed, currency: draft.currency, kind: "amount" };
}

export function formatFeeRate(rate: number, language: Language): string {
    const percent = String(Number((rate * 100).toFixed(2)));
    return `${percent.replace(".", numberLocale(language).decimal)}%`;
}

export function feeDraftOf(fee: { amount: number; currency: string | null; feeRate: number | null } | null): FeeDraft {
    if (fee === null) {
        return NO_FEE;
    }
    return fee.feeRate === null
        ? { currency: fee.currency ?? "USD", kind: "typed", text: String(fee.amount), unit: "amount" }
        : { kind: "percent", rate: fee.feeRate };
}
