import { describe, expect, it } from "@jest/globals";

import { EVERY_OPTIONS, EVERY_ORDER } from "./installment-draft";
import { planFromRows } from "./installment-plan-phrase";
import { generateSchedule } from "./installments";
import type { InstallmentInterval } from "./installments";

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

const schedule = (interval: InstallmentInterval, purchaseDay: Date, count = 4, upfront = 0) =>
    generateSchedule({ amount: { total: 100 }, count, currency: "USD", interval, purchaseDay, upfront });

describe("planFromRows", () => {
    it.each(EVERY_ORDER)("reads a %s schedule back as the cadence that made it", (every) => {
        const plan = planFromRows(schedule(EVERY_OPTIONS[every], day(2026, 10, 14)));
        expect(plan?.interval).toStrictEqual(EVERY_OPTIONS[every]);
    });

    it("reads a Cashea plan with its upfront", () => {
        expect(planFromRows(schedule(EVERY_OPTIONS.days14, day(2026, 10, 14), 3, 150))).toStrictEqual({
            count: 3,
            interval: { every: 14, kind: "days" },
            upfront: true,
        });
    });

    it("keeps a plan bought on the 31st monthly through the months that clamp it", () => {
        const rows = schedule(EVERY_OPTIONS.monthly, day(2026, 1, 31), 4);
        expect(rows.map((row) => row.dueDate)).toStrictEqual([
            day(2026, 2, 28),
            day(2026, 3, 31),
            day(2026, 4, 30),
            day(2026, 5, 31),
        ]);
        expect(planFromRows(rows)?.interval).toStrictEqual({ every: 1, kind: "months" });
    });

    it("calls two cuotas on the same day of consecutive months monthly, not every 31 days", () => {
        const rows = [day(2026, 1, 15), day(2026, 2, 15)].map((dueDate, index) => ({
            amount: 50,
            dueDate,
            sequence: index + 1,
        }));
        expect(planFromRows(rows)?.interval).toStrictEqual({ every: 1, kind: "months" });
    });

    it("finds the 15th and last day across February when the plan starts on the last day", () => {
        const rows = [day(2026, 1, 31), day(2026, 2, 15), day(2026, 2, 28), day(2026, 3, 15)].map((dueDate, index) => ({
            amount: 25,
            dueDate,
            sequence: index + 1,
        }));
        expect(planFromRows(rows)?.interval).toStrictEqual({ days: [15, "last"], kind: "semimonthly" });
    });

    it("gives up on a schedule with a moved cuota", () => {
        const rows = schedule(EVERY_OPTIONS.days14, day(2026, 10, 14)).map((row) =>
            row.sequence === 2 ? { ...row, dueDate: day(2026, 11, 14) } : row
        );
        expect(planFromRows(rows)).toBeNull();
    });

    it("has no cadence to read from a single cuota", () => {
        expect(planFromRows(schedule(EVERY_OPTIONS.days14, day(2026, 10, 14), 1, 50))).toStrictEqual({
            count: 1,
            interval: null,
            upfront: true,
        });
    });
});
