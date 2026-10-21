import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import type { BudgetWindow } from "@outlayr/money/budget-window";

import { buildBurndown } from "./budget-burndown";

const inNewYork = (...args: (number | string)[]): string =>
    execFileSync(
        process.execPath,
        ["--import", "tsx", join(import.meta.dirname, "dst-probe.ts"), ...args.map(String)],
        {
            encoding: "utf-8",
            env: { ...process.env, TZ: "America/New_York" },
        }
    );

const at = (y: number, m: number, day: number): Date => new Date(y, m - 1, day);

const JULY: BudgetWindow = { end: at(2026, 8, 1), start: at(2026, 7, 1) };

function expense(
    day: number,
    amount: number,
    categoryId: string | null = null,
    parentId: string | null = null
): ExpenseContribution {
    return { amount, categoryId, date: at(2026, 7, day), parentId };
}

/** The simulator's July 2026 Log: $2,881.50 against a $2,000 limit, matching a known screenshot. */
const REAL_JULY: ExpenseContribution[] = [
    expense(1, 15),
    expense(9, 90),
    expense(15, 35),
    expense(18, 22),
    expense(20, 60),
    expense(21, 8.75),
    expense(22, 45),
    expense(22, 12.75),
    expense(23, 20),
    expense(23, 2500),
    expense(23, 12.5),
    expense(23, 42.5),
    expense(23, 18),
];

describe("buildBurndown", () => {
    it("reports the day the balance first went negative", () => {
        const result = buildBurndown(REAL_JULY, {
            limit: 2000,
            now: at(2026, 7, 25),
            window: JULY,
        });

        expect(result.runwayDay).toBe(23);
        expect(result.runwayDate).toStrictEqual(at(2026, 7, 23));
    });

    it("leaves the runway empty while the budget still holds", () => {
        const result = buildBurndown([expense(3, 120)], {
            limit: 2000,
            now: at(2026, 7, 25),
            window: JULY,
        });

        expect(result.runwayDay).toBeNull();
        expect(result.runwayDate).toBeNull();
    });

    it("stops the actual series at today rather than the window end", () => {
        const result = buildBurndown(REAL_JULY, {
            limit: 2000,
            now: at(2026, 7, 25),
            window: JULY,
        });

        expect(result.totalDays).toBe(31);
        expect(result.points).toHaveLength(25);
        expect(result.points.at(-1)?.day).toBe(25);
    });

    it("carries the balance across days with no spending", () => {
        const result = buildBurndown([expense(1, 100)], {
            limit: 500,
            now: at(2026, 7, 4),
            window: JULY,
        });

        expect(result.points.map((p) => p.balance)).toStrictEqual([400, 400, 400, 400]);
    });

    it("counts a subcategory's spending toward its parent's budget", () => {
        const rows = [
            expense(2, 30, "dining", null),
            expense(3, 45, "coffee", "dining"),
            expense(4, 90, "transport", null),
        ];

        const result = buildBurndown(rows, {
            categoryId: "dining",
            limit: 500,
            now: at(2026, 7, 10),
            window: JULY,
        });

        expect(result.points.at(-1)?.spent).toBe(75);
    });

    it("ignores expenses outside the window", () => {
        const rows = [
            { amount: 999, categoryId: null, date: at(2026, 6, 30), parentId: null },
            expense(5, 40),
            { amount: 777, categoryId: null, date: at(2026, 8, 2), parentId: null },
        ];

        const result = buildBurndown(rows, {
            limit: 500,
            now: at(2026, 7, 10),
            window: JULY,
        });

        expect(result.points.at(-1)?.spent).toBe(40);
    });

    it("keeps a lone outlier from dominating the projection", () => {
        const result = buildBurndown(REAL_JULY, {
            limit: 2000,
            now: at(2026, 7, 25),
            window: JULY,
        });

        // A mean rate would spread the one $2,500 charge over 31 days and forecast -$1,573.
        expect(result.projectedBalance != null && result.projectedBalance > -1100).toBeTruthy();
        expect(result.projectedBalance).toBe(-970.54);
    });

    it("keeps forecasting for someone who only shops some days", () => {
        const rows = [expense(1, 300), expense(2, 300), expense(3, 300)];

        const result = buildBurndown(rows, {
            limit: 2000,
            now: at(2026, 7, 10),
            window: JULY,
        });

        // $300 a shop, 3 shops in 10 days, 21 days left: 300 * 0.3 * 21 = 1890.
        expect(result.projectedBalance).toBe(2000 - 900 - 1890);
    });

    it("forecasts no more spending for a window with no spending yet", () => {
        const result = buildBurndown([], { limit: 2000, now: at(2026, 7, 20), window: JULY });

        expect(result.projectedBalance).toBe(2000);
    });

    it("withholds the projection while too little of the window has elapsed", () => {
        const result = buildBurndown([expense(1, 900)], {
            limit: 2000,
            now: at(2026, 7, 2),
            window: JULY,
        });

        expect(result.projectedBalance).toBeNull();
    });

    it("buckets by calendar day so a DST shift cannot smear spending", () => {
        expect(inNewYork("burndown", 2026, 10, 1, 0, 0, 2026, 11, 1, 0, 0, 2026, 10, 5, 0, 0, 2026, 10, 3, 0, 0)).toBe(
            "[10,10,30,30,30]"
        );
    });

    it("counts rows from the window start through the last millisecond of today, and no others", () => {
        const row = (date: Date): ExpenseContribution => ({ amount: 1, categoryId: null, date, parentId: null });
        const justBefore = new Date(JULY.start.getTime() - 1);
        const lastMs = new Date(at(2026, 7, 11).getTime() - 1);
        const nextDay = at(2026, 7, 11);

        const options = { limit: 10, now: at(2026, 7, 10), window: JULY };

        const result = buildBurndown([row(justBefore), row(JULY.start), row(lastMs), row(nextDay)], options);

        expect(result.points.at(-1)?.spent).toBe(2);
        expect(result).toStrictEqual(buildBurndown([row(JULY.start), row(lastMs)], options));
    });

    it.each([
        ["fall back (25h day)", [2026, 10, 1, 0, 0, 2026, 11, 1, 0, 0, 2026, 10, 20, 9, 30]],
        ["spring forward (23h day)", [2026, 2, 1, 0, 0, 2026, 3, 1, 0, 0, 2026, 2, 25, 9, 30]],
    ])("buckets rows at every hour of the day like per-row day offsets across %s", (_name, args) => {
        const { actual, expected } = JSON.parse(inNewYork("burndown-grid", ...args));

        expect(actual).toStrictEqual(expected);
    });
});
