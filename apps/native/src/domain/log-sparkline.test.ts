import { describe, expect, it } from "vite-plus/test";

import { sparklineSeries } from "./log-sparkline";

const NOW = new Date("2026-07-27T13:00:00");

function row(iso: string, amount: number, income = false) {
    return { amount, date: new Date(iso), income };
}

describe("sparklineSeries", () => {
    it("has no series for all-time, which has no window to sample", () => {
        expect(sparklineSeries([], "net", "all", NOW)).toStrictEqual([]);
    });

    it("samples a week period at eight points ending today", () => {
        const points = sparklineSeries([], "net", "week", NOW);
        expect(points).toHaveLength(8);
        expect(points.at(-1)?.date.getTime()).toBe(new Date("2026-07-27T23:59:59").getTime());
    });

    it("counts today's rows, which are the whole point of the right-hand edge", () => {
        const points = sparklineSeries(
            [row("2026-07-26T09:00:00", 40), row("2026-07-27T09:00:00", 99)],
            "out",
            "week",
            NOW
        );

        expect(points.at(-2)?.amount).toBe(40);
        expect(points.at(-1)?.amount).toBe(99);
    });

    it("walks net forward as a running balance, including entries before the window", () => {
        const points = sparklineSeries(
            [
                // Predates the window, yet still sets the opening balance.
                row("2026-01-04T09:00:00", 500, true),
                row("2026-07-24T09:00:00", 200),
            ],
            "net",
            "week",
            NOW
        );
        expect(points.at(0)?.amount).toBe(500);
        expect(points.at(-1)?.amount).toBe(300);
    });

    it("buckets Out per sample instead of accumulating it", () => {
        const points = sparklineSeries(
            [row("2026-07-23T09:00:00", 40), row("2026-07-23T18:00:00", 10), row("2026-07-25T09:00:00", 7)],
            "out",
            "week",
            NOW
        );
        const nonZero = points.filter((point) => point.amount !== 0);
        expect(nonZero.map((point) => point.amount)).toStrictEqual([50, 7]);
    });

    it("keeps income out of the Out series and expense out of the In series", () => {
        const rows = [row("2026-07-23T09:00:00", 40), row("2026-07-23T10:00:00", 90, true)];
        const out = sparklineSeries(rows, "out", "week", NOW);
        const income = sparklineSeries(rows, "in", "week", NOW);
        expect(out.reduce((sum, point) => sum + point.amount, 0)).toBe(40);
        expect(income.reduce((sum, point) => sum + point.amount, 0)).toBe(90);
    });

    it("samples a year period monthly", () => {
        const points = sparklineSeries([], "net", "year", NOW);
        expect(points).toHaveLength(13);
    });

    it("keeps a month's last day in that month", () => {
        const points = sparklineSeries(
            [row("2026-05-31T09:00:00", 80), row("2026-06-01T09:00:00", 5)],
            "out",
            "year",
            NOW
        );
        const charged = points.filter((point) => point.amount > 0);

        expect(charged.map((point) => point.amount)).toStrictEqual([80, 5]);
        expect(charged[0]?.date.getMonth()).toBe(4);
        expect(charged[1]?.date.getMonth()).toBe(5);
    });
});
