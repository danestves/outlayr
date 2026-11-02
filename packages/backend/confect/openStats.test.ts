import { describe, expect, it } from "vite-plus/test";

import { accountStats, monthDates, recentMonths, WEEK_MS, weeksFromRows } from "./openStats";

const NOW = Date.UTC(2026, 10, 1, 0, 10);

describe("open stats bucketing", () => {
    it("counts synced accounts cumulatively per rolling week and as additions per UTC month", () => {
        const createdAt = [Date.UTC(2026, 8, 30, 23, 59), Date.UTC(2026, 9, 1, 0, 0), NOW - WEEK_MS - 1, NOW - 1];
        const { months, weeks } = accountStats(createdAt, NOW);

        expect(weeks.slice(-3)).toStrictEqual([2, 3, 4]);
        expect(months.slice(-3)).toStrictEqual([
            { added: 1, month: "2026-09" },
            { added: 2, month: "2026-10" },
            { added: 1, month: "2026-11" },
        ]);
    });

    it("places PostHog rows by weeks ago with the current week last and gaps as zero", () => {
        const weeks = weeksFromRows([
            [0, 149, 340, 28],
            [2, 29, 71, 5],
            [12, 9, 41, 4],
        ]);

        expect(weeks).toHaveLength(12);
        expect(weeks.at(-1)).toStrictEqual({ countries: 28, entries: 340, people: 149 });
        expect(weeks.at(-2)).toStrictEqual({ countries: 0, entries: 0, people: 0 });
        expect(weeks.at(-3)).toStrictEqual({ countries: 5, entries: 71, people: 29 });
    });

    it("spans each month to its last day and stops the current one at today", () => {
        expect(recentMonths(Date.UTC(2026, 0, 15)).slice(-2)).toStrictEqual(["2025-12", "2026-01"]);
        expect(monthDates("2026-02", NOW)).toStrictEqual({ endDate: "2026-02-28", startDate: "2026-02-01" });
        expect(monthDates("2026-11", NOW)).toStrictEqual({ endDate: "2026-11-01", startDate: "2026-11-01" });
    });
});
