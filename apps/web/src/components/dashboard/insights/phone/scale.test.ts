import { describe, expect, it } from "vite-plus/test";

import { floatingAxis, mirrorAxis, waterfall } from "./scale";

describe("floatingAxis", () => {
    it.each([[[17_420, 18_050, 21_300, 24_981]], [[120, 80, 40, 15]], [[-900, -400, 250]], [[5000, 5000, 5000]]])(
        "keeps every value of %j between its floor and its top",
        (values) => {
            const axis = floatingAxis(values, 4);
            expect(axis.floor).toBeLessThanOrEqual(Math.min(...values));
            expect(axis.top).toBeGreaterThanOrEqual(Math.max(...values));
        }
    );

    it("never draws below zero for a balance that stayed positive", () => {
        expect(floatingAxis([30, 900, 2400], 4).floor).toBe(0);
    });
});

describe("mirrorAxis", () => {
    it("puts income and spending on one scale, so equal money is equal height", () => {
        const axis = mirrorAxis(11_700, 5000, 2);
        const up = axis.lines.find((line) => line.at === 0);
        const down = axis.lines.at(-1);
        expect((axis.zero * axis.whole) / (up?.value ?? 0)).toBeCloseTo(
            (((down?.at ?? 0) - axis.zero) * axis.whole) / (down?.value ?? 0)
        );
    });
});

describe("waterfall", () => {
    it("starts each move where the one before it ended, and ends on this month's total", () => {
        const steps = waterfall(
            4000,
            [
                { delta: 900, id: "rent" },
                { delta: -300, id: "food" },
                { delta: 400, id: "fun" },
            ],
            5000
        );
        const [usual, rent, food, fun, now] = steps;
        expect(rent?.left).toBeCloseTo(usual?.width ?? 0);
        expect((food?.left ?? 0) + (food?.width ?? 0)).toBeCloseTo((rent?.left ?? 0) + (rent?.width ?? 0));
        expect(fun?.left).toBeCloseTo(food?.left ?? 0);
        expect(now?.width).toBeCloseTo((fun?.left ?? 0) + (fun?.width ?? 0));
    });
});
