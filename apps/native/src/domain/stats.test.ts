import { describe, expect, it } from "@jest/globals";

import { median } from "./stats";

describe("median", () => {
    it("returns null on an empty series", () => {
        expect(median([])).toBeNull();
    });

    it("returns the middle value on an odd count", () => {
        expect(median([5, 1, 3])).toBe(3);
    });

    it("averages the middle pair on an even count", () => {
        expect(median([1, 2, 3, 4])).toBe(2.5);
    });

    it("sorts numerically, not lexicographically", () => {
        expect(median([9, 10, 80])).toBe(10);
    });

    it("does not mutate the caller's array", () => {
        const input = [3, 1, 2];
        median(input);
        expect(input).toStrictEqual([3, 1, 2]);
    });
});
