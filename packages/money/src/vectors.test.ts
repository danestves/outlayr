import { describe, expect, it } from "vite-plus/test";

import { CURRENCY_DECIMALS, PICKABLE_CURRENCY_CODES } from "./catalog.generated";
import { currencyDisplayFor, isPickableCurrency } from "./currency";
import { MoneyValidationError } from "./errors";
import { COMPUTE_USD_THROW_VECTORS, COMPUTE_USD_VECTORS, ROUND_MONEY_VECTORS } from "./fixtures";
import { computeAmountUSD } from "./rates";
import { convertFromUsd, roundMoney } from "./round";

describe("golden vectors — computeAmountUSD", () => {
    it.each(COMPUTE_USD_VECTORS)("$name", (vector) => {
        expect(computeAmountUSD(vector.input)).toBe(vector.expectedUSD);
    });

    it.each(COMPUTE_USD_THROW_VECTORS)("rejects: $name", (vector) => {
        expect(() => computeAmountUSD(vector.input)).toThrow(MoneyValidationError);
        expect(() => computeAmountUSD(vector.input)).toThrow(vector.messagePattern);
    });
});

describe("golden vectors — roundMoney half-even", () => {
    it.each(ROUND_MONEY_VECTORS)("$name", (vector) => {
        expect(roundMoney(vector.value, vector.decimals)).toBe(vector.expected);
    });
});

interface ConvertVector {
    amountUsd: number;
    code: string;
    expected: number;
    name: string;
    rate: number;
}

const CONVERT_FROM_USD_VECTORS: ConvertVector[] = [
    {
        amountUsd: 100,
        code: "EUR",
        expected: 87.43,
        name: "EUR two-decimal half-even (100 @ 0.87428 -> 87.43)",
        rate: 0.87428,
    },
    {
        amountUsd: 100,
        code: "JPY",
        expected: 14_852,
        name: "JPY zero-decimal (100 @ 148.52 -> 14852)",
        rate: 148.52,
    },
    {
        amountUsd: 100,
        code: "KWD",
        expected: 30.749,
        name: "KWD three-decimal dinar (100 @ 0.30749 -> 30.749)",
        rate: 0.30749,
    },
    {
        amountUsd: 87.428,
        code: "USD",
        expected: 87.428,
        name: "USD identity keeps sub-cent precision exactly (rate 1)",
        rate: 1,
    },
    {
        amountUsd: 1,
        code: "EUR",
        expected: 0.12,
        name: "half-even tie rounds down to even (0.125 -> 0.12)",
        rate: 0.125,
    },
    {
        amountUsd: -100,
        code: "EUR",
        expected: -87.43,
        name: "negative amount keeps its sign through half-even rounding",
        rate: 0.87428,
    },
    {
        // A hard USD peg, which a `base=USD` feed quotes at exactly 1.0. The
        // identity shortcut is USD to USD, not any rate of one.
        amountUsd: 87.428333,
        code: "BSD",
        expected: 87.43,
        name: "a USD-pegged code rounds at its own exponent despite a rate of 1",
        rate: 1,
    },
];

describe("golden vectors — convertFromUsd", () => {
    it.each(CONVERT_FROM_USD_VECTORS)("$name", (vector) => {
        expect(convertFromUsd(vector.amountUsd, vector.rate, vector.code)).toBe(vector.expected);
    });

    it("rejects a non-finite amount before applying the identity shortcut", () => {
        expect(() => convertFromUsd(Number.POSITIVE_INFINITY, 1, "USD")).toThrow(MoneyValidationError);
    });

    it("rejects a non-finite rate", () => {
        expect(() => convertFromUsd(100, Number.NaN, "EUR")).toThrow(MoneyValidationError);
    });
});

describe("currency fractional digits", () => {
    it("prices a small holding of gold instead of rounding it away", () => {
        expect(convertFromUsd(10, 0.0005, "XAU")).toBe(0.005);

        const perUsd = 1 / 3500;
        const held = convertFromUsd(100, perUsd, "XAU");
        expect(Number((held / perUsd).toFixed(2))).toBe(100);
    });

    it("covers every pickable currency code exactly once", () => {
        for (const code of PICKABLE_CURRENCY_CODES) {
            expect(CURRENCY_DECIMALS[code]).toBeDefined();
        }
        expect(Object.keys(CURRENCY_DECIMALS)).toHaveLength(PICKABLE_CURRENCY_CODES.length);
    });
});

describe(currencyDisplayFor, () => {
    it("returns generated metadata for a catalog code", () => {
        expect(currencyDisplayFor("VES")).toStrictEqual({
            name: "Venezuelan Bolívar",
            symbol: "Bs.",
        });
    });

    it("falls back to the bare code for a code absent from the catalog", () => {
        expect(currencyDisplayFor("ZZZ")).toStrictEqual({ name: "ZZZ", symbol: "ZZZ" });
    });
});

describe("provider-driven catalog coverage", () => {
    it("makes VES and metals pickable and drops BGN", () => {
        expect(isPickableCurrency("VES")).toBeTruthy();
        expect(isPickableCurrency("XAU")).toBeTruthy();
        expect(isPickableCurrency("BGN")).toBeFalsy();
    });
});
