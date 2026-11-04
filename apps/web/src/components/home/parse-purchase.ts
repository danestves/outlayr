import type { Locale } from "@/lib/i18n";

import type { Currency } from "../demo/money";
import { CASTS } from "../demo/sentence-model";

const AMOUNT = /(?:^|\s)((?:US\$|[$€])?\s*(\d+(?:[.,]\d{1,2})?))(?:[.!?,;:])?(?=\s|$)/gi;
const CONNECTOR_SUFFIX = {
    en: /\s+for$/i,
    es: /\s+por$/i,
} as const satisfies Record<Locale, RegExp>;
const PREFERRED_AMOUNT = /(?:US\$|[$€]|[.,]\d)/i;
const WHITESPACE = /\s+/g;
const WORD = /(^|\s)\S/g;

export interface ParsedPurchase {
    amount: number | null;
    category: string | null;
    currency: Currency;
    merchant: string;
}

interface AmountCandidate {
    amount: number;
    currency: Currency;
    end: number;
    start: number;
}

function findAmount(text: string): AmountCandidate | null {
    let fallback: AmountCandidate | null = null;

    for (const match of text.matchAll(AMOUNT)) {
        const [matchedText, token, numberText] = match;
        if (token === undefined || numberText === undefined || match.index === undefined) {
            continue;
        }

        const amount = Number(numberText.replace(",", "."));
        if (!Number.isFinite(amount) || amount <= 0) {
            continue;
        }

        const candidate = {
            amount,
            currency: token.includes("€") ? "EUR" : "USD",
            end: match.index + matchedText.length,
            start: match.index,
        } satisfies AmountCandidate;

        if (PREFERRED_AMOUNT.test(token)) {
            return candidate;
        }
        fallback ??= candidate;
    }

    return fallback;
}

export function parsePurchase(text: string, locale: Locale): ParsedPurchase {
    const amount = findAmount(text);
    const typedMerchant = (amount === null ? text : `${text.slice(0, amount.start)} ${text.slice(amount.end)}`)
        .trim()
        .replaceAll(WHITESPACE, " ")
        .replace(CONNECTOR_SUFFIX[locale], "");
    const merchantKey = typedMerchant.toLowerCase();
    const merchant =
        CASTS[locale].recentMerchants.expense.find((name) => name.toLowerCase() === merchantKey) ??
        typedMerchant.replaceAll(WORD, (letter) => letter.toUpperCase());

    return {
        amount: amount?.amount ?? null,
        category: CASTS[locale].knownMerchants.get(merchantKey) ?? null,
        currency: amount?.currency ?? "USD",
        merchant,
    };
}
