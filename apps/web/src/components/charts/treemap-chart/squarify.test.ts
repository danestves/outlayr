import { describe, expect, it } from "vite-plus/test";

import { fitTileLabel, labelInk, squarifyLayout } from "./squarify";

const area = ({ height, width }: { height: number; width: number }) => height * width;

describe("squarifyLayout", () => {
    it("gives every part an area proportional to its value and fills the box", () => {
        const values = [1850, 772, 407, 235, 191, 186];
        const total = values.reduce((sum, value) => sum + value, 0);
        const rects = squarifyLayout(values, 472, 178);

        for (const [index, rect] of rects.entries()) {
            expect(area(rect)).toBeCloseTo(((values[index] ?? 0) / total) * 472 * 178, 6);
        }
        expect(rects.reduce((sum, rect) => sum + area(rect), 0)).toBeCloseTo(472 * 178, 6);
    });

    it("keeps every tile inside the box without overlapping another", () => {
        const rects = squarifyLayout([50, 30, 20, 10, 5, 3, 1], 300, 200);

        for (const rect of rects) {
            expect(rect.x).toBeGreaterThanOrEqual(0);
            expect(rect.y).toBeGreaterThanOrEqual(0);
            expect(rect.x + rect.width).toBeLessThanOrEqual(300 + 1e-6);
            expect(rect.y + rect.height).toBeLessThanOrEqual(200 + 1e-6);
        }
        for (const [index, a] of rects.entries()) {
            for (const b of rects.slice(index + 1)) {
                const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
                const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
                expect(Math.min(overlapX, overlapY)).toBeLessThanOrEqual(1e-6);
            }
        }
    });

    it("favours wide tiles so horizontal labels fit when asked for an aspect", () => {
        const values = [1850, 771.52, 407.48, 234.6, 190.8, 186.21];
        const [rent, groceries, shopping, dining, subscriptions, transport] = squarifyLayout(values, 472, 178, 2.6);

        expect(rent).toMatchObject({ height: 178, x: 0, y: 0 });
        expect(groceries?.width).toBeCloseTo(472 - (rent?.width ?? 0), 6);
        expect(shopping?.y).toBeCloseTo(dining?.y ?? -1, 6);
        expect(subscriptions?.y).toBeCloseTo(transport?.y ?? -1, 6);
        expect(subscriptions?.height).toBeLessThan(shopping?.height ?? 0);
    });

    it("draws nothing for an empty total and treats negatives as zero", () => {
        expect(squarifyLayout([0, 0], 100, 100).every((rect) => area(rect) === 0)).toBe(true);
        const [refund, spend] = squarifyLayout([-40, 10], 100, 100);

        expect(area(refund ?? { height: 1, width: 1 })).toBe(0);
        expect(area(spend ?? { height: 0, width: 0 })).toBeCloseTo(10_000, 6);
    });
});

describe("fitTileLabel", () => {
    it("stacks name and value when there is room for both lines", () => {
        expect(fitTileLabel({ height: 80, width: 200, x: 0, y: 0 }, "Groceries", "$772")).toBe("stacked");
    });

    it("runs them on one line in a short tile", () => {
        expect(fitTileLabel({ height: 34, width: 150, x: 0, y: 0 }, "Transport", "$186")).toBe("inline");
    });

    it("drops the value before clipping it", () => {
        expect(fitTileLabel({ height: 34, width: 112, x: 0, y: 0 }, "Subscriptions", "$1,191.40")).toBe("name");
    });

    it("hides the label rather than clip the name", () => {
        expect(fitTileLabel({ height: 80, width: 40, x: 0, y: 0 }, "Subscriptions", "$191")).toBe("none");
        expect(fitTileLabel({ height: 20, width: 200, x: 0, y: 0 }, "Rent", "$1,850")).toBe("none");
    });
});

describe("labelInk", () => {
    it("picks the ink with more contrast against the fill", () => {
        expect(labelInk("#53915A", "dark", "light", "fallback")).toBe("dark");
        expect(labelInk("#1c1b13", "dark", "light", "fallback")).toBe("light");
    });

    it("falls back when the fill is not a literal colour", () => {
        expect(labelInk("var(--color-chart-1)", "dark", "light", "fallback")).toBe("fallback");
    });
});
