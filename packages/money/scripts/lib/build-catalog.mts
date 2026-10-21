import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export type CatalogDecimals = 0 | 2 | 3 | 6;

export interface CatalogMeta {
    name: string;
    symbol: string;
}

interface CatalogOverride extends Partial<CatalogMeta> {
    decimals?: CatalogDecimals;
}

export interface BuiltCatalog {
    codes: string[];
    decimals: Record<string, CatalogDecimals>;
    meta: Record<string, CatalogMeta>;
}

/**
 * The only fraction-digit counts the money engine and `CURRENCY_DECIMALS` support. A
 * provider currency outside them (CLF's 4) must fail the build, not ship an exponent the
 * rounding path cannot express.
 */
const ALLOWED_DECIMALS = new Set<number>([0, 2, 3, 6]);

function readJson(relativePath: string) {
    return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf-8"));
}

/**
 * Pure over the committed inputs (provider codes, pinned CLDR, `overrides.json`), so the drift
 * test and the generator agree byte-for-byte. Per field: override, then CLDR, then the bare code.
 */
export function buildCatalog(): BuiltCatalog {
    const codes: string[] = readJson("../provider-codes.json");
    const overrides: Record<string, CatalogOverride> = readJson("../overrides.json");
    const cldrCurrencies = require("cldr-numbers-modern/main/en/currencies.json").main.en.numbers.currencies;
    const cldrFractions = require("cldr-core/supplemental/currencyData.json").supplemental.currencyData.fractions;
    const defaultDigits = Number(cldrFractions.DEFAULT._digits);

    const decimals: Record<string, CatalogDecimals> = {};
    const meta: Record<string, CatalogMeta> = {};
    for (const code of codes) {
        const override = overrides[code] ?? {};
        const cldr = cldrCurrencies[code] ?? {};
        const digits = Number(override.decimals ?? cldrFractions[code]?._digits ?? defaultDigits);
        if (!ALLOWED_DECIMALS.has(digits)) {
            throw new Error(
                `Currency ${code} carries ${digits} fraction digits; only 0, 2, 3 or 6 are supported. Handle the new exponent before regenerating the catalog.`
            );
        }
        decimals[code] = digits as CatalogDecimals;
        meta[code] = {
            name: override.name ?? cldr.displayName ?? code,
            symbol: override.symbol ?? cldr.symbol ?? cldr["symbol-alt-narrow"] ?? code,
        };
    }
    return { codes, decimals, meta };
}
