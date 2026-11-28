import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { buildRateTable } from "@outlayr/money/valuation";
import { describe, expect, it, test } from "vite-plus/test";

import type { CategoryMeta } from "./insights";
import type { RecapRow } from "./month-recap";
import { recapWeek } from "./recap-week";
import { weekRecap } from "./week-recap";

const at = (year: number, month: number, day: number, hour = 12, minute = 0): Date =>
    new Date(year, month - 1, day, hour, minute);

const NOW = at(2026, 11, 3);
const DAY = (year: number, month: number, day: number): Date => new Date(year, month - 1, day);
const SUNDAY = DAY(2026, 11, 1);

function row(overrides: Partial<RecapRow> = {}): RecapRow {
    return {
        amount: 10,
        amountUsd: 10,
        categoryId: null,
        currency: "USD",
        date: at(2026, 11, 1),
        income: false,
        parentId: null,
        ...overrides,
    };
}

function recap(rows: RecapRow[], firstWeekday = 1, week = SUNDAY, categoriesById = new Map()) {
    return weekRecap({
        categoriesById,
        firstWeekday,
        now: NOW,
        rows,
        valuation: { displayCurrency: "USD", rates: buildRateTable([]) },
        week,
    });
}

describe("weekRecap bounds", () => {
    it("moves the boundary with firstWeekday", () => {
        const rows = [
            row({ date: at(2026, 10, 31, 23, 50) }),
            row({ date: at(2026, 11, 1, 0, 10) }),
            row({ date: at(2026, 11, 2) }),
        ];

        const sunday = recap(rows, 1);
        expect(sunday.start).toStrictEqual(SUNDAY);
        expect(sunday.entries).toBe(2);
        expect(sunday.priorEntries).toBe(1);

        const mondayStart = recap(rows, 2, at(2026, 11, 2));
        expect(mondayStart.start).toStrictEqual(DAY(2026, 11, 2));
        expect(mondayStart.entries).toBe(1);
        expect(mondayStart.priorEntries).toBe(2);
    });

    it("leaves the prior week's spending out of this week", () => {
        const result = recap([row({ amount: 5, date: at(2026, 10, 27) }), row({ amount: 20 })]);

        expect(result.spent).toBe(20);
        expect(result.priorSpent).toBe(5);
        expect(result.spentChange).toBe(3);
    });

    it("reports no change without prior spending", () => {
        expect(recap([row()]).spentChange).toBeNull();
    });

    it("drops rows dated after now from the week", () => {
        const result = recap([row(), row({ date: at(2026, 11, 5), amount: 100 })]);

        expect(result.entries).toBe(1);
        expect(result.spent).toBe(10);
        expect(result.daysLogged).toBe(1);
    });
});

describe("weekRecap shape", () => {
    it("charts seven days and marks the ones with entries", () => {
        const result = recap([row({ date: at(2026, 11, 1, 9) }), row({ date: at(2026, 11, 2, 18) })]);

        expect(result.daily).toStrictEqual([10, 10, 0, 0, 0, 0, 0]);
        expect(result.days).toStrictEqual([true, true, false, false, false, false, false]);
        expect(result.daysLogged).toBe(2);
    });

    it("names the top category and counts income as an entry, not as spending", () => {
        const categoriesById = new Map<string, CategoryMeta>([
            [
                "food",
                {
                    color: null,
                    emoji: null,
                    icon: null,
                    id: "food",
                    income: false,
                    name: "Groceries",
                    parentId: null,
                },
            ],
        ]);

        const result = recap(
            [
                row({ amount: 30, categoryId: "food", date: at(2026, 11, 1) }),
                row({ amount: 900, date: at(2026, 11, 2), income: true }),
            ],
            1,
            SUNDAY,
            categoriesById
        );

        expect(result.spent).toBe(30);
        expect(result.entries).toBe(2);
        expect(result.topCategory).toStrictEqual({ amount: 30, name: "Groceries" });
    });
});

describe("recapWeek", () => {
    it("clamps a key from the future to the last completed week", () => {
        expect(recapWeek("2026-11-01", NOW, 1)).toStrictEqual(DAY(2026, 10, 25));
        expect(recapWeek("2026-12-06", NOW, 1)).toStrictEqual(DAY(2026, 10, 25));
    });

    it("falls back to the last completed week for a missing or impossible key", () => {
        expect(recapWeek(undefined, NOW, 1)).toStrictEqual(DAY(2026, 10, 25));
        expect(recapWeek("2026-02-30", NOW, 1)).toStrictEqual(DAY(2026, 10, 25));
    });

    it("keeps a Monday-start key after the first weekday moves to Sunday", () => {
        expect(recapWeek("2026-10-26", NOW, 1)).toStrictEqual(DAY(2026, 10, 26));
    });
});

const inHavana = (...args: number[]): unknown =>
    JSON.parse(
        execFileSync(
            process.execPath,
            ["--import", "tsx", join(import.meta.dirname, "dst-probe.ts"), "week-recap", ...args.map(String)],
            { encoding: "utf-8", env: { ...process.env, TZ: "America/Havana" } }
        )
    );

// Cuba skips 00:00 on 2026-03-08, so that Sunday-start week begins at 01:00. Rows: Mar 14 23:30 and Mar 15 00:30.
test("cuts weeks at local midnight where DST skips 00:00", () => {
    const rows = [2026, 2, 14, 23, 30, 2026, 2, 15, 0, 30];
    expect(inHavana(2026, 2, 20, 12, 0, ...rows, 2026, 2, 8, 12, 0)).toStrictEqual({
        entries: 1,
        priorEntries: 0,
        priorSpent: 0,
        spent: 10,
    });
    expect(inHavana(2026, 2, 27, 12, 0, ...rows, 2026, 2, 15, 12, 0)).toStrictEqual({
        entries: 1,
        priorEntries: 1,
        priorSpent: 10,
        spent: 10,
    });
});
