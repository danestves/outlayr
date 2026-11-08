import { describe, expect, it } from "vite-plus/test";

import { lineWindow } from "./line-window";

describe("lineWindow", () => {
    it("draws every line that overlaps the viewport and its overscan, and none far above it", () => {
        // A day header (32 px) above every nine rows (51 px), 3,000 lines deep.
        const heights = Array.from({ length: 3000 }, (_, index) => (index % 10 === 0 ? 32 : 51));
        const offsets = [0];
        for (const height of heights) {
            offsets.push((offsets.at(-1) ?? 0) + height);
        }
        const scrolled = 60_000;
        const { first, last } = lineWindow(offsets, scrolled, 900);

        expect(offsets[first + 1]).toBeGreaterThan(scrolled - 1500);
        expect(offsets[first]).toBeLessThanOrEqual(scrolled - 1500);
        expect(offsets[last]).toBeGreaterThanOrEqual(scrolled + 900 + 1500);
        expect(offsets[last - 1]).toBeLessThan(scrolled + 900 + 1500);
        expect(lineWindow(offsets, 0, 900).first).toBe(0);
        expect(lineWindow(offsets, 10_000_000, 900)).toStrictEqual({ first: 3000, last: 3000 });
    });
});
