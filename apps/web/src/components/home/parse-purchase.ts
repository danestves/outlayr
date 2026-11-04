import type { Locale } from "@/lib/i18n";

import { CASTS } from "../demo/sentence-model";

const AMOUNT = /(?:^|\s)(?:US\$|[$€])?\s*(\d+(?:[.,]\d{1,2})?)(?=\s|$)/i;
const WORD = /(^|\s)\S/g;

export interface ParsedPurchase {
    amount: number | null;
    category: string | null;
    merchant: string;
}

export function parsePurchase(text: string, locale: Locale): ParsedPurchase {
    const match = AMOUNT.exec(text);
    const amount = match === null ? Number.NaN : Number(match[1]?.replace(",", "."));
    const merchant = (
        match === null ? text : `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`
    )
        .trim()
        .replaceAll(WORD, (letter) => letter.toUpperCase());

    return {
        amount: Number.isFinite(amount) && amount > 0 ? amount : null,
        category: CASTS[locale].knownMerchants.get(merchant.toLowerCase()) ?? null,
        merchant,
    };
}
