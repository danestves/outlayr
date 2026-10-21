import { describe, expect, it } from "@jest/globals";
import { effectiveLimit, MAX_CARRY_PERIODS, rolloverCarry, rolloverCarryFrom } from "@outlayr/money/budget-rollover";
import { lastMsBefore, spentForCategory, spentForMain } from "@outlayr/money/budget-spent";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { advanceBudgetWindow, BUDGET_TYPE } from "@outlayr/money/budget-window";
import { addDays } from "@outlayr/money/calendar";

const MONTH = BUDGET_TYPE.month;

/** Local time, matching the budget math; UTC would shift every boundary by the host's offset. */
function localKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function spendBy(byStart: Record<string, number>) {
    return (start: Date) => byStart[localKey(start)] ?? 0;
}

function monthWindow(year: number, month: number) {
    return {
        end: new Date(year, month + 1, 1),
        start: new Date(year, month, 1),
    };
}

describe("carrying a budget forward", () => {
    it("carries nothing when the current window is the first one", () => {
        const carry = rolloverCarry({
            anchor: new Date(2026, 6, 1),
            current: monthWindow(2026, 6),
            limit: 500,
            spentIn: () => 0,
            type: MONTH,
        });
        expect(carry).toStrictEqual({ clamped: false, credit: 0, periods: 0 });
    });

    it("accumulates across several closed windows", () => {
        const carry = rolloverCarry({
            anchor: new Date(2026, 3, 1),
            current: monthWindow(2026, 6),
            limit: 500,
            spentIn: spendBy({
                "2026-04-01": 400,
                "2026-05-01": 700,
                "2026-06-01": 450,
            }),
            type: MONTH,
        });
        // +100, -200, +50
        expect(carry.credit).toBe(-50);
        expect(carry.periods).toBe(3);
    });

    it("never counts the current window against itself", () => {
        const carry = rolloverCarry({
            anchor: new Date(2026, 5, 1),
            current: monthWindow(2026, 6),
            limit: 500,
            spentIn: spendBy({ "2026-06-01": 300, "2026-07-01": 999 }),
            type: MONTH,
        });
        expect(carry.credit).toBe(200);
    });

    it("stops at the anchor rather than crediting windows before the budget", () => {
        const carry = rolloverCarry({
            anchor: new Date(2026, 5, 1),
            current: monthWindow(2026, 6),
            limit: 500,
            spentIn: spendBy({ "2026-04-01": 0, "2026-05-01": 0, "2026-06-01": 500 }),
            type: MONTH,
        });
        expect(carry.periods).toBe(1);
        expect(carry.credit).toBe(0);
    });

    it("reports a clamp instead of walking an anchor years back", () => {
        const carry = rolloverCarry({
            anchor: new Date(1990, 0, 1),
            current: monthWindow(2026, 6),
            limit: 0,
            spentIn: () => 0,
            type: MONTH,
        });
        expect(carry.periods).toBe(MAX_CARRY_PERIODS);
        expect(carry.clamped).toBe(true);
    });

    it("terminates on a type whose period cannot step backwards", () => {
        const carry = rolloverCarry({
            anchor: new Date(1990, 0, 1),
            current: monthWindow(2026, 6),
            limit: 500,
            spentIn: () => 0,
            type: 999,
        });
        expect(carry).toStrictEqual({ clamped: false, credit: 0, periods: 0 });
    });
});

describe("carrying a budget forward from ledger rows", () => {
    const NOW = new Date(2026, 6, 20, 15, 30);
    const ANCHOR = new Date(2025, 2, 15, 13);
    const FIRST_START = new Date(2025, 0, 1);

    function ledger(): ExpenseContribution[] {
        let seed = 42;
        const random = () => {
            seed = (seed * 16_807) % 2_147_483_647;
            return seed / 2_147_483_647;
        };
        const scopes = [
            { categoryId: "food", parentId: null },
            { categoryId: "groceries", parentId: "food" },
            { categoryId: "rent", parentId: null },
            { categoryId: null, parentId: null },
        ] as const;
        const rows: ExpenseContribution[] = [];
        const add = (date: Date) => {
            const scope = scopes[Math.floor(random() * scopes.length)] ?? scopes[0];
            // Valued amounts are not whole cents, so summation order shows.
            rows.push({ amount: (Math.round(random() * 20_000) / 100) * 1.0837, date, ...scope });
        };
        const from = new Date(2024, 11, 1);
        for (let day = from; day <= NOW; day = addDays(day, 1)) {
            add(day);
            add(new Date(day.getTime() - 1));
        }
        for (let count = 0; count < 2500; count += 1) {
            add(new Date(from.getTime() + Math.floor(random() * (NOW.getTime() - from.getTime()))));
        }
        return rows;
    }

    const rows = ledger();
    const cases = Object.values(BUDGET_TYPE).flatMap((type) => [
        { categoryId: "food", type },
        { categoryId: null, type },
    ]);

    it.each(cases)(
        "equals a spend pass per closed window (type $type, category $categoryId)",
        ({ categoryId, type }) => {
            const input = { anchor: ANCHOR, current: advanceBudgetWindow(FIRST_START, type, NOW), limit: 750.25, type };
            const perWindow = rolloverCarry({
                ...input,
                spentIn: (start, end) =>
                    categoryId === null
                        ? spentForMain(rows, start, lastMsBefore(end))
                        : spentForCategory(rows, categoryId, start, lastMsBefore(end)),
            });

            expect(perWindow.periods).toBeGreaterThan(0);
            expect(rolloverCarryFrom(rows, categoryId, input)).toStrictEqual(perWindow);
        }
    );
});

describe("the limit a window actually runs on", () => {
    it("adds an unspent carry to the target", () => {
        expect(effectiveLimit(500, 200)).toBe(700);
    });

    it("floors at zero rather than handing a negative target downstream", () => {
        expect(effectiveLimit(500, -900)).toBe(0);
    });
});
