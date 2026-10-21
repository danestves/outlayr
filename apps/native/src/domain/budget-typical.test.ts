import { describe, expect, it } from "@jest/globals";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";

import {
    closedWindowsBefore,
    EVERY_SCOPE,
    spendPerWindow,
    typicalOf,
    typicalSpend,
    windowsOver,
} from "./budget-typical";

const MONTH = BUDGET_TYPE.month;

function localKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function spendBy(byStart: Record<string, number>) {
    return (start: Date) => byStart[localKey(start)] ?? 0;
}

function monthWindow(year: number, month: number) {
    return { end: new Date(year, month + 1, 1), start: new Date(year, month, 1) };
}

describe("what a scope typically costs", () => {
    it("medians the closed windows and leaves the current one out", () => {
        const { typical, history } = typicalSpend({
            current: monthWindow(2026, 7),
            spentIn: spendBy({
                "2026-05-01": 300,
                "2026-06-01": 400,
                "2026-07-01": 500,
                // The current window, still being spent in.
                "2026-08-01": 20,
            }),
            type: MONTH,
        });

        expect(history).toStrictEqual([500, 400, 300, 0, 0, 0]);
        expect(typical).toBe(400);
    });

    it("ignores windows with no spending, which would median a real cost down to nothing", () => {
        const { typical } = typicalSpend({
            current: monthWindow(2026, 7),
            spentIn: spendBy({ "2026-06-01": 90, "2026-07-01": 110 }),
            type: MONTH,
        });

        // Four of the six windows are empty; padding them in would report 0.
        expect(typical).toBe(100);
    });

    it("reports no typical figure when nothing was ever spent", () => {
        const { typical, history } = typicalSpend({
            current: monthWindow(2026, 7),
            spentIn: () => 0,
            type: MONTH,
        });

        expect(typical).toBeNull();
        expect(history).toHaveLength(6);
    });

    it("stops at the start of the ledger rather than inventing empty windows behind it", () => {
        const { history } = typicalSpend({
            current: monthWindow(2026, 7),
            since: new Date(2026, 5, 1),
            spentIn: spendBy({ "2026-06-01": 200, "2026-07-01": 240 }),
            type: MONTH,
        });

        expect(history).toStrictEqual([240, 200]);
    });

    it("does not loop forever on a type whose period cannot step backwards", () => {
        const { history } = typicalSpend({
            current: monthWindow(2026, 7),
            spentIn: () => 10,
            type: 0,
        });

        expect(history).toStrictEqual([]);
    });
});

describe("how many recent windows went over a limit", () => {
    it("counts the windows that spent more than the limit", () => {
        expect(windowsOver([500, 400, 300, 0, 0, 0], 400)).toBe(1);
    });

    it("does not count a window that landed exactly on the limit", () => {
        expect(windowsOver([400], 400)).toBe(0);
    });
});

describe("spend per scope per window", () => {
    const windows = [monthWindow(2026, 7), monthWindow(2026, 6)];

    function expense(date: Date, amount: number, categoryId: string | null, parentId: string | null = null) {
        return { amount, categoryId, date, parentId };
    }

    it("files an expense under its category, its parent and the whole ledger", () => {
        const totals = spendPerWindow([expense(new Date(2026, 7, 3), 40, "coffee", "food")], windows);

        expect(totals.get("coffee")).toStrictEqual([40, 0]);
        expect(totals.get("food")).toStrictEqual([40, 0]);
        expect(totals.get(EVERY_SCOPE)).toStrictEqual([40, 0]);
    });

    it("keeps an uncategorised expense out of every scope but the whole ledger", () => {
        const totals = spendPerWindow([expense(new Date(2026, 7, 3), 25, null)], windows);

        expect(totals.get(EVERY_SCOPE)).toStrictEqual([25, 0]);
        expect(totals.size).toBe(1);
    });

    it("drops an expense that falls outside every window", () => {
        const totals = spendPerWindow([expense(new Date(2026, 2, 3), 90, "food")], windows);

        expect(totals.size).toBe(0);
    });

    it("puts an expense on the window's last instant in that window, not the next", () => {
        const lastInstant = new Date(2026, 7, 31, 23, 59, 59, 999);
        const totals = spendPerWindow([expense(lastInstant, 10, "food")], [monthWindow(2026, 7)]);

        expect(totals.get("food")).toStrictEqual([10]);
    });

    it("reads the same as a per-scope walk", () => {
        const rows = [
            expense(new Date(2026, 7, 2), 100, "food"),
            expense(new Date(2026, 7, 20), 50, "coffee", "food"),
            expense(new Date(2026, 6, 9), 300, "food"),
        ];
        const totals = spendPerWindow(
            rows,
            closedWindowsBefore({ count: 2, current: monthWindow(2026, 8), type: MONTH })
        );

        expect(totals.get("food")).toStrictEqual([150, 300]);
        expect(typicalOf(totals.get("food") ?? [])).toBe(225);
    });
});
