import { roundMoney } from "@outlayr/money/round";

import type { Language } from "@/i18n/languages";
import { runtimeLanguage } from "@/i18n/runtime";

import { amountDigits, amountParts, withCurrencySymbol } from "./money";

/** "-" only when the figure shown is below zero; never a "+". */
export function formatSignedAmount(
    amount: number,
    code: string,
    showCents = true,
    language: Language = runtimeLanguage()
): string {
    const parts = amountParts(amount, code, showCents, language);
    const magnitude = withCurrencySymbol(parts, amountDigits(parts));
    return roundMoney(-amount, parts.minorUnits) > 0 ? `-${magnitude}` : magnitude;
}
