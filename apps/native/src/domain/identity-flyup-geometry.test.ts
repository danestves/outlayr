import { describe, expect, it } from "@jest/globals";

import { floatTargetY } from "./identity-flyup-geometry";

const HERO_HALF = 82;

describe("floatTargetY", () => {
    it("centres the hero in the free area above the sheet", () => {
        expect(
            floatTargetY({
                containerHeight: 874,
                heroHalf: HERO_HALF,
                sheetHeight: 426,
            })
        ).toBe(224);
    });

    it("floors the hero below the top edge when the sheet leaves no room", () => {
        expect(
            floatTargetY({
                containerHeight: 874,
                heroHalf: HERO_HALF,
                sheetHeight: 800,
            })
        ).toBe(98);
    });
});
