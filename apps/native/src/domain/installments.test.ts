import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";

import { generateSchedule, planStanding, splitTotal } from "./installments";
import type { ScheduleTemplate } from "./installments";

const inNewYork = (...args: number[]): string =>
    execFileSync(
        process.execPath,
        ["--import", "tsx", join(import.meta.dirname, "dst-probe.ts"), "installments", ...args.map(String)],
        { encoding: "utf-8", env: { ...process.env, TZ: "America/New_York" } }
    );

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

const dueDays = (template: ScheduleTemplate) =>
    generateSchedule(template).map(({ dueDate }) => [dueDate.getMonth() + 1, dueDate.getDate()]);

const base = { amount: { each: 20 }, count: 3, currency: "USD", purchaseDay: day(2026, 10, 18) } as const;

describe("generateSchedule", () => {
    it("puts a Cashea order's upfront on the purchase day and its cuotas every 14 days", () => {
        const schedule = generateSchedule({
            ...base,
            interval: { every: 14, kind: "days" },
            purchaseDay: new Date(2026, 9, 18, 15, 40),
            upfront: 60,
        });
        expect(schedule).toStrictEqual([
            { amount: 60, dueDate: day(2026, 10, 18), sequence: 0 },
            { amount: 20, dueDate: day(2026, 11, 1), sequence: 1 },
            { amount: 20, dueDate: day(2026, 11, 15), sequence: 2 },
            { amount: 20, dueDate: day(2026, 11, 29), sequence: 3 },
        ]);
    });

    it("counts days from an explicit first due date, and accepts a single installment", () => {
        const schedule = generateSchedule({
            ...base,
            count: 1,
            firstDue: day(2026, 11, 2),
            interval: { every: 30, kind: "days" },
        });
        expect(schedule).toStrictEqual([{ amount: 20, dueDate: day(2026, 11, 2), sequence: 1 }]);
    });

    it("clamps a month-end day to short months without drifting after them", () => {
        const fromPurchase = {
            ...base,
            count: 4,
            interval: { every: 1, kind: "months" },
            purchaseDay: day(2027, 1, 31),
        } as const;
        expect(dueDays(fromPurchase)).toStrictEqual([
            [2, 28],
            [3, 31],
            [4, 30],
            [5, 31],
        ]);
        expect(dueDays({ ...fromPurchase, firstDue: day(2028, 1, 31) })).toStrictEqual([
            [1, 31],
            [2, 29],
            [3, 31],
            [4, 30],
        ]);
    });

    it("falls on two fixed days a month, clamping the last day", () => {
        const kueski = { ...base, count: 4, interval: { days: [15, "last"], kind: "semimonthly" } } as const;
        expect(dueDays({ ...kueski, purchaseDay: day(2027, 1, 20) })).toStrictEqual([
            [1, 31],
            [2, 15],
            [2, 28],
            [3, 15],
        ]);
        const lysto = { ...kueski, interval: { days: [16, 1], kind: "semimonthly" } } as const;
        expect(dueDays({ ...lysto, firstDue: day(2026, 11, 1) })).toStrictEqual([
            [11, 1],
            [11, 16],
            [12, 1],
            [12, 16],
        ]);
    });

    it("does not repeat a day when both fixed days clamp onto it", () => {
        const schedule = { ...base, interval: { days: [30, "last"], kind: "semimonthly" } } as const;
        expect(dueDays({ ...schedule, purchaseDay: day(2027, 2, 1) })).toStrictEqual([
            [2, 28],
            [3, 30],
            [3, 31],
        ]);
    });

    it("splits a total in whole cents with the remainder in the last installment", () => {
        expect(splitTotal(40, 3, "USD")).toStrictEqual([13.33, 13.33, 13.34]);
        expect(splitTotal(1000, 3, "JPY")).toStrictEqual([333, 333, 334]);
        const schedule = generateSchedule({ ...base, amount: { total: 100 }, interval: { every: 14, kind: "days" } });
        expect(schedule.map((row) => row.amount)).toStrictEqual([33.33, 33.33, 33.34]);
    });

    it("keeps local midnights across a DST change", () => {
        expect(inNewYork(2027, 2, 1, 0, 0, 14)).toBe("[[2027,2,15,0],[2027,2,29,0],[2027,3,12,0]]");
        expect(inNewYork(2027, 0, 31, 0, 0, 1)).toBe("[[2027,1,28,0],[2027,2,31,0],[2027,3,30,0]]");
    });
});

describe("planStanding", () => {
    const rows = [
        { amount: 60, dueDate: day(2026, 10, 18), sequence: 0 },
        { amount: 13.33, dueDate: day(2026, 11, 1), sequence: 1 },
        { amount: 13.33, dueDate: day(2026, 11, 15), sequence: 2 },
        { amount: 13.34, dueDate: day(2026, 11, 29), sequence: 3 },
    ];

    it("allocates a partial payment oldest first and flags what is overdue", () => {
        const standing = planStanding(rows, 65, day(2026, 11, 2), "USD");
        expect(standing.rows.map(({ covered, overdue, status }) => [status, covered, overdue])).toStrictEqual([
            ["paid", 60, false],
            ["partial", 5, true],
            ["unpaid", 0, false],
            ["unpaid", 0, false],
        ]);
        expect(standing.next?.row.sequence).toBe(1);
        expect(standing.next?.remaining).toBe(8.33);
        expect(standing.remaining).toBe(35);
        expect(standing.installmentsPaid).toBe(0);
        expect(standing.finished).toBe(false);
    });

    it("counts an early payment against the oldest row, whatever day it arrives", () => {
        const standing = planStanding(rows, 73.33, day(2026, 10, 20), "USD");
        expect(standing.rows.map((row) => row.status)).toStrictEqual(["paid", "paid", "unpaid", "unpaid"]);
        expect(standing.installmentsPaid).toBe(1);
        expect(standing.installmentsTotal).toBe(3);
        expect(standing.next?.row.sequence).toBe(2);
    });

    it("finishes on the cent the schedule totals, and reports an overpayment", () => {
        expect(planStanding(rows, 100, day(2027, 1, 1), "USD")).toMatchObject({
            finished: true,
            next: null,
            overpaid: 0,
            remaining: 0,
        });
        expect(planStanding(rows, 105.5, day(2027, 1, 1), "USD")).toMatchObject({ finished: true, overpaid: 5.5 });
    });

    it("orders rows by due date before sequence once a row has been moved", () => {
        const moved = rows.map((row) => (row.sequence === 3 ? { ...row, dueDate: day(2026, 10, 25) } : row));
        const standing = planStanding(moved, 73.34, day(2026, 10, 26), "USD");
        expect(standing.rows.map((row) => [row.row.sequence, row.status])).toStrictEqual([
            [0, "paid"],
            [3, "paid"],
            [1, "unpaid"],
            [2, "unpaid"],
        ]);
    });
});

describe("planStanding with late fees", () => {
    const cashea = [
        { amount: 40, dueDate: day(2026, 10, 18), sequence: 0 },
        { amount: 33.8, dueDate: day(2026, 11, 1), sequence: 1 },
        { amount: 33.8, dueDate: day(2026, 11, 15), sequence: 2 },
        { amount: 33.8, dueDate: day(2026, 11, 29), fee: 4, sequence: 3 },
    ];

    it("owes a fee on the last cuota while an earlier one is overdue, and pays it last", () => {
        const late = planStanding(cashea, 40, day(2026, 11, 20), "USD");
        expect(late.rows.map(({ overdue, owed, status }) => [owed, status, overdue])).toStrictEqual([
            [40, "paid", false],
            [33.8, "unpaid", true],
            [33.8, "unpaid", true],
            [37.8, "unpaid", false],
        ]);
        expect(late).toMatchObject({ remaining: 105.4, scheduled: 145.4 });
        expect(late.next?.remaining).toBe(33.8);

        const partly = planStanding(cashea, 40 + 33.8 + 33.8 + 20, day(2026, 11, 20), "USD");
        expect(partly.next).toMatchObject({ covered: 20, remaining: 17.8, status: "partial" });

        expect(planStanding(cashea, 145.4, day(2026, 12, 1), "USD")).toMatchObject({ finished: true, remaining: 0 });
    });

    it("reopens a cuota already paid at its base once a fee lands on it", () => {
        const charged = cashea.map((row) => ({ ...row, fee: row.sequence === 1 ? 4 : 0 }));
        const standing = planStanding(charged, 40 + 33.8 + 33.8, day(2026, 11, 20), "USD");
        expect(standing.rows.map(({ remaining, status }) => [status, remaining])).toStrictEqual([
            ["paid", 0],
            ["paid", 0],
            ["partial", 4],
            ["unpaid", 33.8],
        ]);
        expect(standing.next?.row.sequence).toBe(2);
        expect(standing.installmentsPaid).toBe(1);
    });

    it("adds a fee to its cuota in whole cents", () => {
        const rows = [{ amount: 0.1, dueDate: day(2026, 11, 1), fee: 0.2, sequence: 1 }];
        expect(planStanding(rows, 0.3, day(2026, 11, 2), "USD")).toMatchObject({
            finished: true,
            overpaid: 0,
            remaining: 0,
            scheduled: 0.3,
        });
    });
});
