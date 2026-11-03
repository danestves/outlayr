import type { RateTable } from "@outlayr/money/valuation";
import { describe, expect, it } from "vite-plus/test";

import { notYetBilled, statementBalance, statementCycle } from "./card-statement";
import type { PlottedCell } from "./goal-balance-series";

const NO_RATES: RateTable = { earliest: () => null, get: () => null };
const CARD = { currency: "USD", initialBalance: 0 };

function cell(plotDay: string, amount: number, income: boolean): PlottedCell {
    return {
        amount,
        amountUsd: amount,
        currencyCode: "USD",
        dateKey: plotDay,
        income,
        plotDay,
        unconvertedCount: 0,
    } as PlottedCell;
}

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
const at = (year: number, month: number, date: number) => new Date(year, month - 1, date, 15).getTime();

describe("a card's statement cycle", () => {
    it("is due the month after it closes when the payment day comes first", () => {
        expect(statementCycle({ paymentDay: 10, statementDay: 25 }, at(2026, 11, 2))).toStrictEqual({
            closedOn: day(2026, 10, 25),
            dueOn: day(2026, 11, 10),
            nextCloseOn: day(2026, 11, 25),
        });
    });

    it("keeps the closing day open until it ends", () => {
        expect(statementCycle({ paymentDay: 10, statementDay: 25 }, at(2026, 10, 25)).closedOn).toStrictEqual(
            day(2026, 9, 25)
        );
    });

    it("closes and falls due on a short month's last day", () => {
        expect(statementCycle({ paymentDay: 30, statementDay: 31 }, at(2027, 3, 15))).toStrictEqual({
            closedOn: day(2027, 2, 28),
            dueOn: day(2027, 3, 30),
            nextCloseOn: day(2027, 3, 31),
        });
    });

    it("is due the same month when the payment day comes after the close", () => {
        const cycle = statementCycle({ paymentDay: 28, statementDay: 5 }, at(2027, 1, 3));
        expect(cycle.closedOn).toStrictEqual(day(2026, 12, 5));
        expect(cycle.dueOn).toStrictEqual(day(2026, 12, 28));
    });
});

describe("what a card's statement asks for", () => {
    const closedOn = day(2026, 10, 25);

    it("counts charges up to the close, less what came in since, and leaves later charges for the next one", () => {
        const cells = [
            cell("2026-10-03", 700, false),
            cell("2026-10-25", 280.18, false),
            cell("2026-10-28", 214.75, false),
            cell("2026-11-01", 300, true),
        ];
        expect(statementBalance(CARD, cells, NO_RATES, closedOn, 0)).toBe(680.18);
    });

    it("asks for nothing when the card was in your favor at the close", () => {
        const cells = [cell("2026-10-15", 91.58, false), cell("2026-10-27", 430, true)];
        expect(statementBalance({ ...CARD, initialBalance: 500 }, cells, NO_RATES, closedOn, 0)).toBe(0);
    });

    it("leaves out cuotas the bank bills on later statements", () => {
        const cells = [cell("2026-10-15", 1099, false)];
        expect(statementBalance(CARD, cells, NO_RATES, closedOn, 1007.42)).toBe(91.58);
    });
});

describe("cuotas billed after this statement", () => {
    const cycle = statementCycle({ paymentDay: 10, statementDay: 25 }, at(2026, 11, 2));

    it("sums what is left of cuotas due after the payment day, for orders bought by the close", () => {
        const plans = [
            {
                purchasedOn: day(2026, 10, 15),
                rows: [
                    { dueDate: day(2026, 11, 10), remaining: 91.58 },
                    { dueDate: day(2026, 12, 10), remaining: 91.58 },
                    { dueDate: day(2027, 1, 10), remaining: 50 },
                ],
            },
            { purchasedOn: day(2026, 10, 30), rows: [{ dueDate: day(2026, 12, 10), remaining: 40 }] },
            { purchasedOn: null, rows: [{ dueDate: day(2026, 12, 10), remaining: 40 }] },
        ];
        expect(notYetBilled(plans, cycle)).toBeCloseTo(141.58);
    });
});
