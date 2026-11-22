import { array, assert, integer, property } from "fast-check";
import { describe, expect, it } from "vite-plus/test";

import { isBalanced, rebalance, unallocated } from "./split";

const cents = integer({ max: 10_000_000, min: 0 });
const partCents = array(cents, { maxLength: 5, minLength: 2 });
const totalCents = integer({ max: 10_000_000, min: 0 });

describe("attributing an entry", () => {
    it("reads rounded parts as balanced when their cents sum to the total", () => {
        assert(
            property(partCents, (parts) => {
                const allocations = parts.map((amount) => ({ amount: amount / 100, categoryId: null }));
                const total = parts.reduce((sum, amount) => sum + amount, 0) / 100;

                expect(unallocated(total, allocations, 2)).toBe(0);
            })
        );
    });

    it("leaves the absorber covering whatever the typed part did not", () => {
        assert(
            property(partCents, totalCents, integer({ max: 4, min: 0 }), (parts, total, at) => {
                const allocations = parts.map((amount) => ({ amount: amount / 100, categoryId: null }));
                const index = at % parts.length;
                const typed = parts[index] ?? 0;
                const next = rebalance(total / 100, allocations, index, typed / 100, 2);

                expect(isBalanced(total / 100, next, 2)).toBeTruthy();
            })
        );
    });
});
