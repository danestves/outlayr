import { describe, expect, it } from "vite-plus/test";

import type { CategoryBreakdownEntry } from "@/data/insights";

import { layoutBlocks, squarify } from "./blocks";

const OCTOBER = [1850, 628.92, 407.48, 134.6, 120.5, 112.34, 85, 75.2, 73.98, 34.98];

function entry(id: string, amount: number): CategoryBreakdownEntry {
    return { amount, color: "#53915A", delta: null, emoji: null, fraction: 0, icon: null, id, name: id };
}

describe("insights blocks", () => {
    it("tiles the box with one rect per value, each sized by its share", () => {
        const width = 362;
        const height = 308;
        const total = OCTOBER.reduce((sum, value) => sum + value, 0);
        const rects = squarify(OCTOBER, width, height);

        expect(rects).toHaveLength(OCTOBER.length);
        for (const [index, rect] of rects.entries()) {
            expect(rect.width * rect.height).toBeCloseTo((OCTOBER[index] / total) * width * height, 6);
            expect(rect.x).toBeGreaterThanOrEqual(-1e-9);
            expect(rect.y).toBeGreaterThanOrEqual(-1e-9);
            expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1e-9);
            expect(rect.y + rect.height).toBeLessThanOrEqual(height + 1e-9);
        }
        for (const [index, a] of rects.entries()) {
            for (const b of rects.slice(index + 1)) {
                const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
                const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
                expect(overlapX <= 1e-9 || overlapY <= 1e-9).toBe(true);
            }
        }
    });

    it("folds a block too thin to see into the rest, and keeps blocks that fit", () => {
        const day = layoutBlocks([entry("rent", 1850), entry("netflix", 22.99)], 362, 188);
        expect(day.shown.map((e) => e.id)).toStrictEqual(["rent"]);
        expect(day.rest.map((e) => e.id)).toStrictEqual(["netflix"]);
        expect(Math.min(day.rects[1].width, day.rects[1].height)).toBeGreaterThanOrEqual(12);

        const month = layoutBlocks(
            OCTOBER.map((amount, index) => entry(`c${index}`, amount)),
            362,
            308
        );
        expect(month.rest).toStrictEqual([]);
        expect(month.shown).toHaveLength(OCTOBER.length);
    });
});
