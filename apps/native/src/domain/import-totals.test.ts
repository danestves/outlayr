import { describe, expect, it } from "@jest/globals";

import { importOutTotals } from "./import-totals";

describe("importOutTotals", () => {
    it("keeps a row's own currency instead of the ledger's", () => {
        const totals = importOutTotals([{ amount: 7, currency: "EUR", income: false }], "USD");
        expect(totals.map(({ amount, currencyCode }) => [currencyCode, Math.abs(amount)])).toStrictEqual([["EUR", 7]]);
    });

    it("falls back to the ledger currency for rows that state none", () => {
        const totals = importOutTotals([{ amount: 5, income: false }], "USD");
        expect(totals.map(({ currencyCode }) => currencyCode)).toStrictEqual(["USD"]);
    });

    it("buckets mixed currencies apart and leaves income out", () => {
        const totals = importOutTotals(
            [
                { amount: 7, currency: "EUR", income: false },
                { amount: 3, currency: "USD", income: false },
                { amount: 100, currency: "USD", income: true },
            ],
            "USD"
        );
        expect(totals.map(({ amount, currencyCode }) => [currencyCode, Math.abs(amount)]).sort()).toStrictEqual([
            ["EUR", 7],
            ["USD", 3],
        ]);
    });

    it("shows a zero in the ledger currency when nothing goes out", () => {
        expect(importOutTotals([{ amount: 9, currency: "EUR", income: true }], "USD")).toStrictEqual([
            { amount: 0, currencyCode: "USD", transactionCount: 0 },
        ]);
    });
});
