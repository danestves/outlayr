import { isTransactionRateNeeded } from "@outlayr/money/rates";
import { describe, expect, it } from "vite-plus/test";

import {
    effectiveEntryRate,
    flipRateForQuote,
    formatQuotedRate,
    formatQuotedRateFigure,
    formatRateFigure,
    pairQuotedInverse,
    pairUnitSymbols,
    rateDeltaPercent,
    rateEntryText,
    transactionRateError,
    transactionRateOptions,
} from "./transaction-entry-rate";

describe("transaction entry rate policy", () => {
    it.each([
        ["an explicit rate over the suggestion", { exchangeRate: 40, exchangeRateType: "official" }, 40],
        ["the official suggestion when no rate is set", { exchangeRate: null, exchangeRateType: "official" }, 36.5],
        [
            "the EUR reference suggestion when no rate is set",
            { exchangeRate: null, exchangeRateType: "eur_reference" },
            42,
        ],
        ["nothing for a custom selection with no rate", { exchangeRate: null, exchangeRateType: "custom" }, null],
    ] as const)("records %s", (_, selection, rate) => {
        expect(effectiveEntryRate(selection, { eurReference: 42, official: 36.5 })).toBe(rate);
    });

    it("offers official and custom for every non-USD currency, adding EUR reference only for VES", () => {
        expect(transactionRateOptions("EUR")).toStrictEqual(["official", "custom"]);
        expect(transactionRateOptions("VES")).toStrictEqual(["official", "eur_reference", "custom"]);
        expect(transactionRateOptions("USD")).toStrictEqual([]);
    });

    it("requires a finite positive actual rate for a plain custom selection", () => {
        expect(transactionRateError("VES", { exchangeRate: null, exchangeRateType: "custom" })).toBe(
            "customRateRequired"
        );
        expect(transactionRateError("VES", { exchangeRate: 0, exchangeRateType: "custom" })).toBe("customRateRequired");
        expect(transactionRateError("VES", { exchangeRate: 55.5, exchangeRateType: "custom" })).toBeNull();
    });

    it("recognises only the nullable custom canonical triple as rate-needed", () => {
        expect(isTransactionRateNeeded({ amountUsd: null, exchangeRate: null, exchangeRateType: "custom" })).toBe(true);
        expect(isTransactionRateNeeded({ amountUsd: null, exchangeRate: null, exchangeRateType: "official" })).toBe(
            false
        );
        expect(isTransactionRateNeeded({ amountUsd: 100, exchangeRate: 55.5, exchangeRateType: "custom" })).toBe(false);
    });

    it("quotes EUR, GBP and its pegs, AUD, NZD and metals in USD per unit, and every other currency per USD", () => {
        expect(pairUnitSymbols("USD", "EUR")).toStrictEqual({ base: "€", quote: "$" });
        expect(pairUnitSymbols("USD", "NZD")).toStrictEqual({ base: "NZ$", quote: "$" });
        expect(pairUnitSymbols("USD", "VES")).toStrictEqual({ base: "$", quote: "Bs." });
        expect(pairUnitSymbols("USD", "GIP")).toStrictEqual({ base: "GIP", quote: "$" });
        expect(formatQuotedRate("XAU", 1 / 3500)).toBe("3500");
        expect(formatQuotedRate("EUR", 0.87113)).toBe("1.1479");
        expect(formatQuotedRate("VES", 55.555555)).toBe("55.5556");
    });

    it("flips only a positive rate of a USD-quoted currency", () => {
        expect(flipRateForQuote("EUR", 0.8)).toBe(1.25);
        expect(flipRateForQuote("EUR", 1.25)).toBe(0.8);
        expect(flipRateForQuote("VES", 55.5)).toBe(55.5);
        expect(flipRateForQuote("EUR", 0)).toBe(0);
    });

    it("leaves the keypad empty for a rate that does not reach its last decimal", () => {
        expect(rateEntryText(848.55123)).toBe("848.5512");
        expect(rateEntryText(0.0000121)).toBe("");
        expect(rateEntryText(0)).toBe("");
        expect(rateEntryText(-1)).toBe("");
    });

    it("shows a rate to the four decimals it is typed in, never fewer than two, with the language's grouping", () => {
        expect(formatRateFigure(1031.52, "en")).toBe("1,031.52");
        expect(formatRateFigure(848.5458, "en")).toBe("848.5458");
        expect(formatRateFigure(36.5, "en")).toBe("36.50");
        expect(formatRateFigure(25_803.1, "en")).toBe("25,803.10");
        expect(formatRateFigure(1031.5187999476, "en")).toBe("1,031.5188");
    });

    it("shows a rate below one at five significant digits", () => {
        expect(formatRateFigure(0.0011785, "en")).toBe("0.0011785");
        expect(formatQuotedRateFigure("EUR", 0.87113, "en")).toBe("1.1479");
    });

    it("names a unit by its code wherever its symbol is shared, keeping $ for the dollar", () => {
        expect(pairUnitSymbols("USD", "COP")).toStrictEqual({ base: "$", quote: "COP" });
        expect(pairUnitSymbols("SEK", "NOK")).toStrictEqual({ base: "SEK", quote: "NOK" });
        expect(pairUnitSymbols("USD", "SYP")).toStrictEqual({ base: "$", quote: "SYP" });
        expect(pairUnitSymbols("USD", "GBP")).toStrictEqual({ base: "£", quote: "$" });
        expect(pairUnitSymbols("USD", "KRW")).toStrictEqual({ base: "$", quote: "₩" });
    });

    it("measures a rate against a reference in the direction it is quoted", () => {
        expect(rateDeltaPercent("VES", 850, 850 / 1.01)).toBeCloseTo(1);
        expect(rateDeltaPercent("EUR", 1 / 1.16, 1 / 1.16 / 0.98)).toBeCloseTo(2.04, 2);
    });

    it("quotes a pair the way the market does whichever way the money moves", () => {
        expect(pairUnitSymbols("USD", "VES")).toStrictEqual({ base: "$", quote: "Bs." });
        expect(pairUnitSymbols("VES", "USD")).toStrictEqual({ base: "$", quote: "Bs." });
        expect(pairUnitSymbols("USD", "EUR")).toStrictEqual({ base: "€", quote: "$" });
        expect(pairQuotedInverse("VES", "USD", 1 / 848.5)).toBe(true);
        expect(pairQuotedInverse("USD", "VES", 848.5)).toBe(false);
        expect(pairQuotedInverse("USD", "KWD", 0.307)).toBe(false);
    });

    it("quotes two currencies of the same rank whichever way reads at least 1", () => {
        expect(pairQuotedInverse("IDR", "SGD", 1.3 / 16_300)).toBe(true);
        expect(pairQuotedInverse("SGD", "IDR", 16_300 / 1.3)).toBe(false);
        expect(pairQuotedInverse("EUR", "XAU", 0.0003)).toBe(true);
        expect(pairQuotedInverse("IDR", "SGD")).toBe(false);
    });
});
