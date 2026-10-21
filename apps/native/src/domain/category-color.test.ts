import { describe, expect, it } from "@jest/globals";

import { CATEGORY_PALETTE } from "@/data/categories-core";

import { firstAvailableColor } from "./category-color";

describe("firstAvailableColor", () => {
    it("skips colors already used, in palette order", () => {
        const used = new Set([CATEGORY_PALETTE[0], CATEGORY_PALETTE[1]]);
        expect(firstAvailableColor(used)).toBe(CATEGORY_PALETTE[2]);
    });

    it("ignores colors outside the palette", () => {
        const used = new Set(["#123456"]);
        expect(firstAvailableColor(used)).toBe(CATEGORY_PALETTE[0]);
    });

    it("never returns a color the palette does not hold", () => {
        for (let taken = 0; taken <= CATEGORY_PALETTE.length + 3; taken += 1) {
            const used = new Set<string>(CATEGORY_PALETTE.slice(0, taken));
            expect(CATEGORY_PALETTE).toContain(firstAvailableColor(used));
        }
    });
});
