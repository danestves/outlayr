import { array, assert, boolean, constantFrom, integer, property, record } from "fast-check";
import { describe, expect, it } from "vite-plus/test";

import { currencyTotals } from "./currency-totals";
import { roundMoney } from "./round";

const entry = record({
    amount: integer({ max: 10_000_000, min: 0 }).map((value) => value / 100),
    currency: constantFrom("USD", "EUR", null),
    income: boolean(),
});
const sortKey = integer({ max: 1000, min: -1000 });

const displayed = (entries: Parameters<typeof currencyTotals>[0]) =>
    currencyTotals(entries, "USD").map((bucket) => ({
        amount: roundMoney(bucket.amount, 2),
        currencyCode: bucket.currencyCode,
        transactionCount: bucket.transactionCount,
    }));

describe("currencyTotals", () => {
    it("shows the same figures whatever order the rows arrive in", () => {
        assert(
            property(array(entry, { maxLength: 8 }), array(sortKey, { maxLength: 8 }), (entries, keys) => {
                const reordered = entries
                    .map((value, index) => ({ key: keys[index] ?? index, value }))
                    .toSorted((lhs, rhs) => lhs.key - rhs.key)
                    .map((one) => one.value);
                const expected = displayed(entries);

                expect(displayed(reordered)).toStrictEqual(expected);
                expect(expected.every((bucket) => Number.isFinite(bucket.amount))).toBeTruthy();
            })
        );
    });
});
