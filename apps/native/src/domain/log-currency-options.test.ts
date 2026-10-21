import { describe, expect, it } from "@jest/globals";

import { logCurrencyOptions } from "./log-currency-options";

describe("logCurrencyOptions", () => {
    it("leads with the ledger's currency whatever the period produced", () => {
        expect(
            logCurrencyOptions({
                favourites: [],
                global: "USD",
                produced: ["JPY", "EUR", "USD"],
            })
        ).toStrictEqual(["USD", "JPY", "EUR"]);
    });

    it("keeps favourites in the order they were arranged, not sorted", () => {
        expect(
            logCurrencyOptions({
                favourites: ["JPY", "EUR", "AUD"],
                global: "USD",
                produced: [],
            })
        ).toStrictEqual(["USD", "JPY", "EUR", "AUD"]);
    });

    it("appends produced currencies after every favourite, in their own order", () => {
        expect(
            logCurrencyOptions({
                favourites: ["EUR", "JPY"],
                global: "USD",
                produced: ["VES", "COP"],
            })
        ).toStrictEqual(["USD", "EUR", "JPY", "VES", "COP"]);
    });

    it("collapses codes that differ only in case, keeping the first spelling", () => {
        expect(
            logCurrencyOptions({
                favourites: ["USD", "eur"],
                global: "usd",
                produced: ["EUR"],
            })
        ).toStrictEqual(["usd", "eur"]);
    });

    it("drops empty and whitespace-only codes rather than offering a blank", () => {
        expect(
            logCurrencyOptions({
                favourites: ["", " "],
                global: "USD",
                produced: ["\t", "EUR"],
            })
        ).toStrictEqual(["USD", "EUR"]);
    });

    it("trims the padding a hand-edited stored list would carry", () => {
        expect(
            logCurrencyOptions({
                favourites: [" EUR "],
                global: "USD",
                produced: ["EUR", " JPY"],
            })
        ).toStrictEqual(["USD", "EUR", "JPY"]);
    });

    describe("when a favourite cannot be reached", () => {
        const reaches =
            (...codes: string[]) =>
            (code: string) =>
                codes.includes(code);

        it("drops a favourite no rate can express a figure in", () => {
            expect(
                logCurrencyOptions({
                    convertible: reaches("JPY"),
                    favourites: ["CHF", "JPY"],
                    global: "EUR",
                    produced: [],
                })
            ).toStrictEqual(["EUR", "JPY"]);
        });

        it("keeps the ledger's own currency even when nothing can reach it", () => {
            expect(
                logCurrencyOptions({
                    convertible: () => false,
                    favourites: [],
                    global: "VES",
                    produced: [],
                })
            ).toStrictEqual(["VES"]);
        });

        it("keeps a produced code even when nothing can reach it", () => {
            expect(
                logCurrencyOptions({
                    convertible: () => false,
                    favourites: [],
                    global: "USD",
                    produced: ["VES"],
                })
            ).toStrictEqual(["USD", "VES"]);
        });

        it("tests the trimmed code, not the stored spelling", () => {
            expect(
                logCurrencyOptions({
                    convertible: reaches("EUR"),
                    favourites: [" EUR "],
                    global: "USD",
                    produced: [],
                })
            ).toStrictEqual(["USD", "EUR"]);
        });
    });
});
