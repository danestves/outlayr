import type { Locale } from "@outlayr/shared/i18n";

import type { Currency } from "../demo/money";
import { CASTS } from "../demo/sentence-model";

const AMOUNT =
    /(?:^|\s)((?:(USD|EUR|BRL|US\$|R\$|[$€])\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*(USD|EUR|BRL|R\$|[$€]))?)(?:[.!?,;:])?(?=\s|$)/gi;
const CONNECTOR_SUFFIX = {
    en: /\s+for$/i,
    de: /\s+für$/i,
    es: /\s+por$/i,
    fr: /\s+pour$/i,
    pt: /\s+por$/i,
} as const satisfies Record<Locale, RegExp>;
const PREFERRED_AMOUNT = /(?:USD|EUR|BRL|US\$|R\$|[$€]|[.,]\d)/i;
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
    currency: Currency | null;
    end: number;
    start: number;
}

function currencyOf(marker: string | undefined): Currency | null {
    switch (marker?.toUpperCase()) {
        case undefined: {
            return null;
        }
        case "€":
        case "EUR": {
            return "EUR";
        }
        case "R$":
        case "BRL": {
            return "BRL";
        }
        default: {
            return "USD";
        }
    }
}

function findAmount(text: string): AmountCandidate | null {
    let fallback: AmountCandidate | null = null;

    for (const match of text.matchAll(AMOUNT)) {
        const [matchedText, token, leadingCurrency, numberText, trailingCurrency] = match;
        if (token === undefined || numberText === undefined || match.index === undefined) {
            continue;
        }

        const amount = Number(numberText.replace(",", "."));
        if (!Number.isFinite(amount) || amount <= 0) {
            continue;
        }

        const candidate = {
            amount,
            currency: currencyOf(leadingCurrency ?? trailingCurrency),
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
        currency: amount?.currency ?? CASTS[locale].currency,
        merchant,
    };
}
