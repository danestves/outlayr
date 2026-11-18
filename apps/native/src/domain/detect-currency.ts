import { CURRENCY_META, PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import type { PickableCode } from "@outlayr/money/catalog";

const symbolKey = (symbol: string): string => symbol.replaceAll(/[.,\s]/g, "");

// The catalog keeps one international symbol per currency ("MX$", "CN¥"), but a bank prints the one used at home:
// a Mexican "$", a Chinese "¥", a Peruvian "S/.". Keys are as printed, since the notification parser matches them.
const LOCAL_MARKS = {
    $: ["AUD", "CAD", "HKD", "MXN", "NZD", "TWD", "XCD"],
    $U: ["UYU"],
    AU$: ["AUD"],
    "B/.": ["PAB"],
    C$: ["CAD"],
    Gs: ["PYG"],
    RD$: ["DOP"],
    Rs: ["INR"],
    S$: ["SGD"],
    "S/": ["PEN"],
    "S/.": ["PEN"],
    "¥": ["CNY"],
    元: ["CNY"],
    円: ["JPY"],
    "￥": ["CNY", "JPY"],
} as const satisfies Record<string, readonly PickableCode[]>;

export const LOCAL_SYMBOLS: readonly string[] = Object.keys(LOCAL_MARKS);

const BY_SYMBOL = new Map<string, string[]>();
for (const code of PICKABLE_CURRENCY_CODES) {
    const symbol = symbolKey(CURRENCY_META[code].symbol);
    BY_SYMBOL.set(symbol, [...(BY_SYMBOL.get(symbol) ?? []), code]);
}

// "¥" stays yen when nothing says yuan, as it read before the local marks existed.
const OWNER = new Map(
    [...BY_SYMBOL].flatMap(([symbol, [code, ...rest]]) => (rest.length === 0 ? [[symbol, code]] : []))
);

for (const [mark, codes] of Object.entries(LOCAL_MARKS)) {
    const symbol = symbolKey(mark);
    BY_SYMBOL.set(symbol, [...new Set([...(BY_SYMBOL.get(symbol) ?? []), ...codes])]);
}

const CODES = new Set<string>(PICKABLE_CURRENCY_CODES);

export const SYMBOL_ALIASES = { U$S: "USD", US$: "USD", USDT: "USD", USDt: "USD" } as const satisfies Record<
    string,
    string
>;
const ALIAS_CODE = new Map<string, string>(Object.entries(SYMBOL_ALIASES));

/**
 * e.g. "€12,40" → "EUR". A symbol several currencies print ("$", "Bs") takes the first of `preferred` it can mean,
 * then the catalog's sole owner ("¥" → JPY), and is otherwise null.
 */
export function detectCurrency(
    text: string | null | undefined,
    preferred: readonly (string | null | undefined)[] = []
): string | null {
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
        .replaceAll(/[\d.,\s  ]/g, "")
        .replaceAll(/^[-+]|[-+]$/g, "")
        .trim();
    if (!symbol) {
        return null;
    }

    const alias = ALIAS_CODE.get(symbol);
    if (alias) {
        return alias;
    }

    const candidates = BY_SYMBOL.get(symbol);
    if (!candidates || candidates.length === 1) {
        return candidates?.[0] ?? null;
    }
    return preferred.find((code) => code != null && candidates.includes(code)) ?? OWNER.get(symbol) ?? null;
}
