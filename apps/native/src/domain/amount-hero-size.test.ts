import { describe, expect, it } from "@jest/globals";

import { AMOUNT_HERO_MAX_SIZE, AMOUNT_HERO_MIN_SIZE, amountHeroFontSize, amountHeroLength } from "./amount-hero-size";

const IPHONE_CONTENT_WIDTH = 353;

describe("amountHeroLength", () => {
    it("omits the fraction for a zero-minor-unit currency", () => {
        expect(amountHeroLength(1234, 0)).toBe(5);
    });

    it("counts one separator per group of three", () => {
        expect(amountHeroLength(4500, 2)).toBe(8);
        expect(amountHeroLength(453_333_333, 2)).toBe(14);
    });

    it("measures the magnitude, so a negative is the same width", () => {
        expect(amountHeroLength(-4500, 2)).toBe(amountHeroLength(4500, 2));
    });
});

describe("amountHeroFontSize", () => {
    it("leaves a short figure at full size", () => {
        expect(amountHeroFontSize(0, 2, IPHONE_CONTENT_WIDTH)).toBe(AMOUNT_HERO_MAX_SIZE);
        expect(amountHeroFontSize(450, 2, IPHONE_CONTENT_WIDTH)).toBe(AMOUNT_HERO_MAX_SIZE);
    });

    it("shrinks a figure that would overflow", () => {
        const size = amountHeroFontSize(453_333_333, 2, IPHONE_CONTENT_WIDTH);
        expect(size).toBeLessThan(AMOUNT_HERO_MAX_SIZE);
        expect(size * amountHeroLength(453_333_333, 2) * 0.58).toBeLessThanOrEqual(IPHONE_CONTENT_WIDTH);
    });

    it("never goes below the floor", () => {
        expect(amountHeroFontSize(Number.MAX_SAFE_INTEGER, 2, IPHONE_CONTENT_WIDTH)).toBe(AMOUNT_HERO_MIN_SIZE);
    });

    it("falls back to the floor before the width is known", () => {
        expect(amountHeroFontSize(4500, 2, 0)).toBe(AMOUNT_HERO_MIN_SIZE);
    });
});
