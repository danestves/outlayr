import { describe, expect, it } from "@jest/globals";

import { allocationsFor, isBalanced, rebalance, unallocated } from "./split";
import type { Allocation } from "./split";

const entry = (id: string, amount: number, categoryId: string | null) => ({
    amount,
    categoryId,
    id,
});

describe("attributing an entry", () => {
    it("reads an unsplit entry as one allocation of its whole amount", () => {
        expect(allocationsFor(entry("t1", 40, "food"), [])).toStrictEqual([{ amount: 40, categoryId: "food" }]);
    });

    it("uses the explicit allocations when the entry has them", () => {
        const explicit: Allocation[] = [
            { amount: 25, categoryId: "food" },
            { amount: 15, categoryId: "travel" },
        ];
        expect(allocationsFor(entry("t1", 40, "food"), explicit)).toStrictEqual(explicit);
    });

    it("does not hand back the caller's own array to mutate", () => {
        const explicit: Allocation[] = [{ amount: 40, categoryId: "food" }];
        const result = allocationsFor(entry("t1", 40, "food"), explicit);
        result[0].amount = 999;
        expect(explicit[0].amount).toBe(40);
    });
});

describe("whether a split adds up", () => {
    it("accepts parts that sum to the entry", () => {
        expect(
            isBalanced(
                40,
                [
                    { amount: 25, categoryId: "a" },
                    { amount: 15, categoryId: "b" },
                ],
                2
            )
        ).toBe(true);
    });

    it("refuses parts that fall short", () => {
        expect(isBalanced(40, [{ amount: 25, categoryId: "a" }], 2)).toBe(false);
    });

    it("reports how far off a split is, with a sign", () => {
        expect(unallocated(40, [{ amount: 25, categoryId: "a" }], 2)).toBe(15);
        expect(unallocated(40, [{ amount: 55, categoryId: "a" }], 2)).toBe(-15);
    });
});

describe("editing one part of a split", () => {
    const two: Allocation[] = [
        { amount: 25, categoryId: "a" },
        { amount: 15, categoryId: "b" },
    ];

    it("balances a three-decimal currency at its own minor units", () => {
        // At two decimals, 10.01 would save against a 10.005 entry and still read as balanced.
        const parts = rebalance(
            10.005,
            [
                { amount: 0, categoryId: "a" },
                { amount: 0, categoryId: "b" },
            ],
            1,
            5,
            3
        );

        expect(parts).toStrictEqual([
            { amount: 5.005, categoryId: "a" },
            { amount: 5, categoryId: "b" },
        ]);
        expect(isBalanced(10.005, parts, 3)).toBe(true);
    });

    it("takes the difference out of another part so it stays balanced", () => {
        const next = rebalance(40, two, 0, 30, 2);
        expect(next.map((part) => part.amount)).toStrictEqual([30, 10]);
        expect(isBalanced(40, next, 2)).toBe(true);
    });

    it("absorbs into an earlier part when the last one is being edited", () => {
        const next = rebalance(40, two, 1, 30, 2);
        expect(next.map((part) => part.amount)).toStrictEqual([10, 30]);
        expect(isBalanced(40, next, 2)).toBe(true);
    });

    it("refuses to make a part negative", () => {
        const next = rebalance(40, two, 0, -5, 2);
        expect(next[0].amount).toBe(0);
    });

    it("leaves a lone part alone rather than balancing against nothing", () => {
        const one: Allocation[] = [{ amount: 40, categoryId: "a" }];
        expect(rebalance(40, one, 0, 25, 2)).toStrictEqual([{ amount: 25, categoryId: "a" }]);
    });

    it("ignores an index that is not there", () => {
        expect(rebalance(40, two, 7, 10, 2)).toStrictEqual(two);
    });
});
