import { describe, expect, it } from "vite-plus/test";

import { placeLabels, stackBands } from "./layout";

describe("stackBands", () => {
    const values: Record<string, readonly number[]> = { base: [10, 20], top: [1, 2] };
    const valueAt = (key: string, index: number) => values[key]?.[index] ?? 0;

    it("sits each series on the running total of the ones below it", () => {
        const [base, top] = stackBands(["base", "top"], 2, valueAt);

        expect(base?.map((band) => [band.y1, band.y2])).toEqual([
            [0, 10],
            [0, 20],
        ]);
        expect(top?.map((band) => [band.y1, band.y2])).toEqual([
            [10, 11],
            [20, 22],
        ]);
    });

    it("moves the same totals when the order changes", () => {
        const [top, base] = stackBands(["top", "base"], 2, valueAt);

        expect(top?.[1]).toMatchObject({ y1: 0, y2: 2 });
        expect(base?.[1]).toMatchObject({ y1: 2, y2: 22 });
    });

    it("draws refunds and missing numbers as nothing instead of overlapping the band below", () => {
        const [base, dip, gap, top] = stackBands(["base", "dip", "gap", "top"], 1, (key) => {
            if (key === "dip") {
                return -5;
            }
            return key === "gap" ? Number.NaN : 10;
        });

        expect(base?.[0]).toMatchObject({ y1: 0, y2: 10 });
        expect(dip?.[0]).toMatchObject({ value: 0, y1: 10, y2: 10 });
        expect(gap?.[0]).toMatchObject({ value: 0, y1: 10, y2: 10 });
        expect(top?.[0]).toMatchObject({ y1: 10, y2: 20 });
    });
});

describe("placeLabels", () => {
    const bounds = { gap: 16, max: 100, min: 0 };

    it("leaves labels that already fit where they are", () => {
        const placed = placeLabels(
            [
                { id: "a", y: 10 },
                { id: "b", y: 60 },
            ],
            bounds
        );

        expect(placed.map((label) => label.y)).toEqual([10, 60]);
    });

    it("spreads colliding labels by at least the gap and keeps their order", () => {
        const placed = placeLabels(
            [
                { id: "b", y: 41 },
                { id: "a", y: 40 },
                { id: "c", y: 42 },
            ],
            bounds
        );

        expect(placed.map((label) => label.id)).toEqual(["a", "b", "c"]);
        expect(placed.map((label) => label.y)).toEqual([40, 56, 72]);
    });

    it("pushes a stack back inside when it would run past either edge", () => {
        const bottom = placeLabels(
            [
                { id: "a", y: 98 },
                { id: "b", y: 99 },
                { id: "c", y: 120 },
            ],
            bounds
        );
        const top = placeLabels(
            [
                { id: "a", y: -10 },
                { id: "b", y: 1 },
            ],
            bounds
        );

        expect(bottom.map((label) => label.y)).toEqual([68, 84, 100]);
        expect(top.map((label) => label.y)).toEqual([0, 16]);
    });
});
