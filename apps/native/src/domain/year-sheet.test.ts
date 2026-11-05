import { describe, expect, it } from "vite-plus/test";

import type { ProStatus } from "./pro-status";
import { yearSheetRenewal } from "./year-sheet";

const NOW = new Date(2026, 10, 5, 9);
const IN_FIVE_DAYS = new Date(2026, 10, 10, 9);
const LAST_YEAR = new Date(2025, 10, 10, 9).getTime();

const annual = (status: ProStatus) => ({ plan: { kind: "annual" as const }, status });

describe("yearSheetRenewal", () => {
    it("opens for a yearly plan that renews within a week", () => {
        const held = annual({ kind: "renews", on: IN_FIVE_DAYS });

        expect(yearSheetRenewal({ held, now: NOW, seenMs: 0 })).toStrictEqual(IN_FIVE_DAYS);
        expect(yearSheetRenewal({ held, now: new Date(2026, 10, 3, 9), seenMs: 0 })).toStrictEqual(IN_FIVE_DAYS);
        expect(yearSheetRenewal({ held, now: new Date(2026, 10, 2, 9), seenMs: 0 })).toBeNull();
        expect(yearSheetRenewal({ held, now: new Date(2026, 10, 10, 10), seenMs: 0 })).toBeNull();
    });

    it("opens once per renewal, and again a year later", () => {
        const held = annual({ kind: "renews", on: IN_FIVE_DAYS });

        expect(yearSheetRenewal({ held, now: NOW, seenMs: LAST_YEAR })).toStrictEqual(IN_FIVE_DAYS);
        expect(yearSheetRenewal({ held, now: NOW, seenMs: IN_FIVE_DAYS.getTime() })).toBeNull();
        expect(yearSheetRenewal({ held, now: NOW, seenMs: IN_FIVE_DAYS.getTime() - 86_400_000 })).toBeNull();
    });

    it("stays shut for a monthly plan, a cancelled one, a trial and no plan", () => {
        const on = IN_FIVE_DAYS;

        expect(
            yearSheetRenewal({
                held: { plan: { kind: "monthly" }, status: { kind: "renews", on } },
                now: NOW,
                seenMs: 0,
            })
        ).toBeNull();
        expect(yearSheetRenewal({ held: annual({ kind: "ends", on }), now: NOW, seenMs: 0 })).toBeNull();
        expect(yearSheetRenewal({ held: annual({ kind: "trial", on }), now: NOW, seenMs: 0 })).toBeNull();
        expect(yearSheetRenewal({ held: null, now: NOW, seenMs: 0 })).toBeNull();
    });
});
