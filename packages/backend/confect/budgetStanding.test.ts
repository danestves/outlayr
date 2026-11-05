// @vitest-environment node
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { buildRateTable } from "@outlayr/money/valuation";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { budgetStanding, wall } from "./mcpLedger";

const HOUR_MS = 3_600_000;

const standingIn = (
    offsetHours: number,
    type: number,
    startDate: string,
    now: string,
    spentThrough: (start: Date) => number = () => 0,
    rollover = false
) => {
    const offsetAt = () => offsetHours * HOUR_MS;
    const start = Date.parse(startDate);
    return budgetStanding(
        { amount: 100, amountUsd: 100, currency: "USD", dateCreated: start, rollover, startDate: start, type },
        rollover,
        spentThrough,
        { currency: "USD", now: wall(Date.parse(now), offsetAt()), offsetAt, rates: buildRateTable([]) }
    );
};

describe.each(["UTC", "America/Caracas", "America/New_York", "Asia/Tokyo"])("budgetStanding on a %s host", (zone) => {
    let hostZone: string | undefined;

    beforeAll(() => {
        hostZone = process.env.TZ;
        process.env.TZ = zone;
    });

    afterAll(() => {
        if (hostZone === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = hostZone;
        }
    });

    it("ends a monthly window on the last day of its month, whatever zone the host is in", () => {
        const standing = standingIn(-4, BUDGET_TYPE.month, "2026-10-01T04:00:00Z", "2026-10-15T16:00:00Z");

        expect([standing.from, standing.to]).toStrictEqual(["2026-10-01", "2026-10-31"]);
    });

    it("keeps a window anchored on the 15th to the 14th of the next month", () => {
        const standing = standingIn(-4, BUDGET_TYPE.month, "2026-09-15T04:00:00Z", "2026-10-20T16:00:00Z");

        expect([standing.from, standing.to]).toStrictEqual(["2026-10-15", "2026-11-14"]);
    });

    it("carries what each closed month left, counting September as September", () => {
        const standing = standingIn(
            -4,
            BUDGET_TYPE.month,
            "2026-08-01T04:00:00Z",
            "2026-10-15T16:00:00Z",
            (start) => (start.getUTCMonth() === 8 ? 40 : 0),
            true
        );

        expect(standing.carryOver).toBe(160);
    });

    it("steps a yearly window across the clock change in a DST zone", () => {
        const standing = standingIn(-4, BUDGET_TYPE.year, "2026-01-01T04:00:00Z", "2026-10-20T16:00:00Z");

        expect([standing.from, standing.to]).toStrictEqual(["2026-01-01", "2026-12-31"]);
    });
});
