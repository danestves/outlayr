import { describe, expect, it } from "@jest/globals";

import {
    amountDigits,
    amountParts,
    formatAmount,
    formatFixed,
    minorUnitsFor,
    regionalLocale,
    roundToMinorUnits,
    symbolIsShared,
} from "./money";

const ARGENTINA = { decimalSeparator: ",", digitGroupingSeparator: ".", regionCode: "AR" };
const MEXICO = { decimalSeparator: ".", digitGroupingSeparator: ",", regionCode: "MX" };

describe("regionalLocale", () => {
    it("takes the marks from the device's region", () => {
        expect(regionalLocale("es", MEXICO)).toStrictEqual({ decimal: ".", group: ",", tag: "es-MX" });
        expect(regionalLocale("es", ARGENTINA)).toStrictEqual({ decimal: ",", group: ".", tag: "es-AR" });
    });

    it("falls back to Latin American Spanish and Brazilian Portuguese when the device cannot be read", () => {
        expect(regionalLocale("es", null)).toStrictEqual({ decimal: ".", group: ",", tag: "es-419" });
        expect(regionalLocale("pt", null)).toStrictEqual({ decimal: ",", group: ".", tag: "pt-BR" });
    });
});

describe("formatAmount", () => {
    it("puts the symbol first in both languages", () => {
        expect(formatAmount(1234.5, "USD", true, "en")).toBe("$1,234.50");
        expect(formatAmount(1234.5, "EUR", true, "es")).toBe("€1,234.50");
    });

    it("keeps a symbol that ends in a letter or a mark off the digits", () => {
        expect(formatAmount(1234.5, "VES", true, "en")).toBe("Bs.\u00A01,234.50");
        expect(formatAmount(1234.5, "CHF", true, "en")).toBe("CHF\u00A01,234.50");
    });

    it("emits no fraction for a zero-minor-unit currency", () => {
        expect(formatAmount(1234, "JPY", true, "en")).toBe("¥1,234");
    });

    it("drops the fraction when cents are switched off", () => {
        expect(formatAmount(1234.56, "USD", false, "en")).toBe("$1,235");
    });

    it("groups every three digits past a thousand", () => {
        expect(formatAmount(1_234_567.89, "USD", true, "en")).toBe("$1,234,567.89");
    });
});

describe("amountParts", () => {
    it("carries the locale so callers assemble their own strings correctly", () => {
        expect(amountParts(12.34, "EUR", true, "es")).toMatchObject({
            fraction: "34",
            integer: "12",
            minorUnits: 2,
            symbol: "€",
        });
    });

    it("reports the minor units the code actually stores", () => {
        expect(amountParts(1, "JPY", true, "en").minorUnits).toBe(0);
        expect(amountParts(1, "KWD", true, "en").minorUnits).toBe(3);
        expect(minorUnitsFor("KWD")).toBe(3);
    });
});

describe("amountDigits", () => {
    it("joins the fraction with the language's decimal mark", () => {
        expect(amountDigits(amountParts(1234.5, "USD", true, "en"))).toBe("1,234.50");
    });

    it("omits the mark entirely when there is no fraction", () => {
        expect(amountDigits(amountParts(1234, "JPY", true, "en"))).toBe("1,234");
    });
});

describe("symbolIsShared", () => {
    it("is true for a symbol more than one offered currency uses", () => {
        expect(symbolIsShared("USD")).toBe(true);
        expect(symbolIsShared("VES")).toBe(false);
    });
});

describe("roundToMinorUnits", () => {
    it("clamps precision to what the currency can hold", () => {
        expect(roundToMinorUnits(12.34, "JPY")).toBe(12);
        expect(roundToMinorUnits(12.345, "USD")).toBe(12.34);
        expect(roundToMinorUnits(12.3456, "KWD")).toBe(12.346);
    });
});

describe("formatFixed", () => {
    it("keeps the sign, drops it once rounding reaches zero, and groups the integer", () => {
        expect(formatFixed(-3.2, 1, "en")).toBe("-3.2");
        expect(formatFixed(-0.04, 1, "en")).toBe("0.0");
        expect(formatFixed(1234.5, 2, "en")).toBe("1,234.50");
    });
});
