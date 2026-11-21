import { array, assert, boolean, double, integer, property, record } from "fast-check";
import { describe, expect, it } from "vite-plus/test";

import { carryWindows, effectiveLimit, rolloverCarry, rolloverCarryFrom } from "./budget-rollover";
import { lastMsBefore, spentForMain } from "./budget-spent";
import { BUDGET_TYPE } from "./budget-window";
import { roundMoney } from "./round";

const monthsBack = integer({ max: 24, min: 1 });
const wholeLimit = integer({ max: 10_000, min: 0 });
const currentStart = new Date(2026, 6, 1);
const current = { end: new Date(2026, 7, 1), start: currentStart };
const anchorFor = (months: number) => new Date(2026, 6 - months, 1);
const windowInput = (months: number, limit: number) => ({
    anchor: anchorFor(months),
    current,
    limit,
    type: BUDGET_TYPE.month,
});

const atBoundary = boolean();
const rowCents = integer({ max: 1_000_000, min: 0 });
const row = record({ atEnd: atBoundary, cents: rowCents, windowIndex: integer({ max: 23, min: 0 }) });

describe("effectiveLimit", () => {
    it("never hands a budget a negative allowance", () => {
        assert(
            property(
                double({ max: 1_000_000, min: -1_000_000, noDefaultInfinity: true, noNaN: true }),
                double({ max: 1_000_000, min: -1_000_000, noDefaultInfinity: true, noNaN: true }),
                (limit, carry) => {
                    const amount = effectiveLimit(limit, carry);

                    expect(amount).toBeGreaterThanOrEqual(0);
                    expect(effectiveLimit(limit, carry + 1)).toBeGreaterThanOrEqual(amount);
                }
            )
        );
    });
});

describe("rolloverCarry", () => {
    it("walks exactly the closed periods back to the anchor", () => {
        assert(
            property(monthsBack, wholeLimit, (months, limit) => {
                const input = { ...windowInput(months, limit), spentIn: () => 0 };
                const { windows } = carryWindows(input);
                const carry = rolloverCarry(input);

                expect(windows).toHaveLength(months);
                expect(carry.credit).toBe(months * limit);
            })
        );
    });

    it("credits each closed period its own leftover", () => {
        assert(
            property(monthsBack, wholeLimit, integer({ max: 500, min: 0 }), (months, limit, seed) => {
                const { windows } = carryWindows(windowInput(months, limit));
                const spends = windows.map((_, index) => (index * seed) % 500);
                const spentIn = (start: Date) => {
                    const index = windows.findIndex((window) => window.start.getTime() === start.getTime());
                    return spends[index] ?? 0;
                };
                const expected = spends.reduce((sum, spend) => sum + limit - spend, 0);

                expect(rolloverCarry({ ...windowInput(months, limit), spentIn }).credit).toBe(expected);
            })
        );
    });

    it("agrees with the row-scoped walk on every boundary date", () => {
        assert(
            property(monthsBack, wholeLimit, array(row, { maxLength: 8 }), (months, limit, drafts) => {
                const input = windowInput(months, limit);
                const { windows } = carryWindows(input);
                const rows = drafts.map((draft) => {
                    const window = windows[draft.windowIndex % windows.length];
                    return {
                        amount: draft.cents / 100,
                        categoryId: null,
                        date: new Date(draft.atEnd ? (window?.end.getTime() ?? 0) : (window?.start.getTime() ?? 0)),
                        parentId: null,
                    };
                });
                const fromRows = rolloverCarryFrom(rows, null, input);
                const fromSpent = rolloverCarry({
                    ...input,
                    spentIn: (start, end) => spentForMain(rows, start, lastMsBefore(end)),
                });

                expect(fromRows.periods).toBe(fromSpent.periods);
                expect(roundMoney(fromRows.credit, 2)).toBe(roundMoney(fromSpent.credit, 2));
            })
        );
    });
});
