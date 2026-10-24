import { CURRENCY_META, PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";

const symbolKey = (symbol: string): string => symbol.replaceAll(/[.,\s]/g, "");

const BY_SYMBOL = new Map<string, string[]>();
for (const code of PICKABLE_CURRENCY_CODES) {
    const symbol = symbolKey(CURRENCY_META[code].symbol);
    const existing = BY_SYMBOL.get(symbol);
    if (existing) {
        existing.push(code);
    } else {
        BY_SYMBOL.set(symbol, [code]);
    }
}

const CODES = new Set<string>(PICKABLE_CURRENCY_CODES);

export const SYMBOL_ALIASES = { U$S: "USD", US$: "USD" } as const satisfies Record<string, string>;
const ALIAS_CODE = new Map<string, string>(Object.entries(SYMBOL_ALIASES));

/**
 * e.g. "€12,40" → "EUR". Null unless the text identifies exactly one currency: a bare "$12.40" is shared by USD,
 * CAD, AUD, MXN and more.
 */
export function detectCurrency(text: string | null | undefined): string | null {
    if (!text) {
        return null;
    }

    // An ISO code wins and is checked before symbols, since some currencies (AED) use their code as their symbol.
    for (const token of text.toUpperCase().match(/[A-Z]{3}/g) ?? []) {
        if (CODES.has(token)) {
            return token;
        }
    }

    const symbol = text
        .replaceAll(/[\d.,\s  ]/g, "")
        .replaceAll(/^[-+]|[-+]$/g, "")
        .trim();
    if (!symbol) {
        return null;
    }

    const alias = ALIAS_CODE.get(symbol);
    if (alias) {
        return alias;
    }

    const matches = BY_SYMBOL.get(symbol);
    return matches?.length === 1 ? matches[0] : null;
}
