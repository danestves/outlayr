import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { buildRateTable } from "@outlayr/money/valuation";
import { describe, expect, it } from "vite-plus/test";

import { monthRecap } from "./month-recap";
import type { RecapRow } from "./month-recap";

const at = (year: number, month: number, day: number, hour = 12, minute = 0): Date =>
    new Date(year, month - 1, day, hour, minute);

const NOW = at(2026, 11, 3);

function row(overrides: Partial<RecapRow> = {}): RecapRow {
    return {
        amount: 10,
        amountUsd: 10,
        categoryId: null,
        currency: "USD",
        date: at(2026, 10, 5),
        income: false,
        parentId: null,
        ...overrides,
    };
}

function recap(rows: RecapRow[], displayCurrency = "USD", rates = buildRateTable([])) {
    return monthRecap({
        categoriesById: new Map(),
        month: at(2026, 10, 15),
        now: NOW,
        rows,
        valuation: { displayCurrency, rates },
    });
}

describe("monthRecap money", () => {
    const rates = buildRateTable([
        { date: "2026-10-05", quote: "VES", rate: 36 },
        { date: "2026-11-02", quote: "VES", rate: 40 },
    ]);

    it("prices foreign spending at the entry's rate and at today's", () => {
        const result = recap([row({ amount: 10, amountUsd: 10, currency: "USD" })], "VES", rates);
        expect(result.spent).toBe(360);
        expect(result.spentAtTodayRate).toBe(400);
        expect(result.inflation).toBe(40);
    });

    it("leaves display-currency spending out of the inflation line", () => {
        const result = recap([row({ amount: 500, amountUsd: 13.88, currency: "VES" })], "VES", rates);
        expect(result.spent).toBe(500);
        expect(result.inflation).toBeNull();
    });

    it("compares against the previous month and ignores income", () => {
        const result = recap([
            row({ amount: 100, amountUsd: 100, date: at(2026, 9, 20) }),
            row({ amount: 150, amountUsd: 150 }),
            row({ amount: 900, amountUsd: 900, income: true }),
        ]);
        expect(result.spent).toBe(150);
        expect(result.priorSpent).toBe(100);
        expect(result.spentChange).toBe(0.5);
    });
});

describe("monthRecap days", () => {
    it("counts a day once and keeps the month's edge entries to their own month", () => {
        const result = recap([
            row({ date: at(2026, 9, 30, 23, 50) }),
            row({ date: at(2026, 10, 1, 0, 10) }),
            row({ date: at(2026, 10, 1, 18) }),
            row({ date: at(2026, 10, 31, 23, 30), income: true }),
            row({ date: at(2026, 11, 1, 0, 5) }),
        ]);
        expect(result.daysInMonth).toBe(31);
        expect(result.daysLogged).toBe(2);
        expect(result.entries).toBe(3);
        expect([result.days[0], result.days[30], result.days[15]]).toStrictEqual([true, true, false]);
    });
});

describe("loggedDays across clock changes", () => {
    const inNewYork = (month: [number, number], moments: number[][]): { daysInMonth: number; logged: number[] } =>
        JSON.parse(
            execFileSync(
                process.execPath,
                [
                    "--import",
                    "tsx",
                    join(import.meta.dirname, "dst-probe.ts"),
                    "logged-days",
                    JSON.stringify({ at: moments, month }),
                ],
                { encoding: "utf-8", env: { ...process.env, TZ: "America/New_York" } }
            )
        );

    it("keeps the 23-hour spring day and its neighbours apart", () => {
        const result = inNewYork(
            [2027, 2],
            [
                [2027, 2, 14, 0, 30],
                [2027, 2, 14, 23, 30],
                [2027, 2, 15, 0, 10],
                [2027, 2, 31, 23, 59],
            ]
        );
        expect(result).toStrictEqual({ daysInMonth: 31, logged: [14, 15, 31] });
    });

    it("counts 30 days in a month that holds the 25-hour fall day", () => {
        const result = inNewYork(
            [2026, 10],
            [
                [2026, 10, 1, 0, 30],
                [2026, 10, 1, 23, 30],
                [2026, 10, 30, 23, 59],
                [2026, 11, 1, 0, 0],
            ]
        );
        expect(result).toStrictEqual({ daysInMonth: 30, logged: [1, 30] });
    });
});
