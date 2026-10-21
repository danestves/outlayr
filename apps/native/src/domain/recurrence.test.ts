import { describe, expect, it } from "@jest/globals";
import { ensureRecurringType, nextDate, nextLanding, RECURRING_TYPE, schedulePreview } from "@outlayr/money/recurrence";

const at = (y: number, m: number, day: number): Date => new Date(y, m - 1, day);

const ymd = (d: Date | null): [number, number, number] | null =>
    d == null ? null : [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe("advancing one occurrence", () => {
    it("advances each cadence by its own unit", () => {
        expect(ymd(nextDate(at(2026, 3, 10), RECURRING_TYPE.daily, 1))).toStrictEqual([2026, 3, 11]);
        expect(ymd(nextDate(at(2026, 3, 10), RECURRING_TYPE.weekly, 1))).toStrictEqual([2026, 3, 17]);
        expect(ymd(nextDate(at(2026, 3, 10), RECURRING_TYPE.monthly, 1))).toStrictEqual([2026, 4, 10]);
        expect(ymd(nextDate(at(2026, 3, 10), RECURRING_TYPE.yearly, 1))).toStrictEqual([2027, 3, 10]);
    });

    it("multiplies by the coefficient", () => {
        expect(ymd(nextDate(at(2026, 3, 10), RECURRING_TYPE.daily, 5))).toStrictEqual([2026, 3, 15]);
        expect(ymd(nextDate(at(2026, 3, 10), RECURRING_TYPE.weekly, 2))).toStrictEqual([2026, 3, 24]);
        expect(ymd(nextDate(at(2026, 3, 10), RECURRING_TYPE.monthly, 3))).toStrictEqual([2026, 6, 10]);
    });

    it("clamps a day the target month does not have", () => {
        expect(ymd(nextDate(at(2026, 1, 31), RECURRING_TYPE.monthly, 1))).toStrictEqual([2026, 2, 28]);
        expect(ymd(nextDate(at(2026, 3, 31), RECURRING_TYPE.monthly, 1))).toStrictEqual([2026, 4, 30]);
        expect(ymd(nextDate(at(2024, 2, 29), RECURRING_TYPE.yearly, 1))).toStrictEqual([2025, 2, 28]);
    });

    it("re-anchors to the schedule's own day rather than the day it last clamped to", () => {
        expect(ymd(nextDate(at(2026, 2, 28), RECURRING_TYPE.monthly, 1, 31))).toStrictEqual([2026, 3, 31]);
        expect(ymd(nextDate(at(2026, 2, 28), RECURRING_TYPE.monthly, 1, 30))).toStrictEqual([2026, 3, 30]);
    });

    it("clamps the anchor again when the target month is still too short", () => {
        expect(ymd(nextDate(at(2026, 1, 31), RECURRING_TYPE.monthly, 1, 31))).toStrictEqual([2026, 2, 28]);
        expect(ymd(nextDate(at(2026, 2, 28), RECURRING_TYPE.monthly, 2, 31))).toStrictEqual([2026, 4, 30]);
    });

    it("re-anchors a yearly cadence back onto the leap day", () => {
        expect(ymd(nextDate(at(2025, 2, 28), RECURRING_TYPE.yearly, 1, 29))).toStrictEqual([2026, 2, 28]);
        expect(ymd(nextDate(at(2027, 2, 28), RECURRING_TYPE.yearly, 1, 29))).toStrictEqual([2028, 2, 29]);
    });

    it("keeps the charge's time of day", () => {
        const advanced = nextDate(new Date(2026, 0, 15, 14, 30, 5), RECURRING_TYPE.monthly, 1);
        expect(advanced).not.toBeNull();
        expect(advanced?.getHours()).toBe(14);
        expect(advanced?.getMinutes()).toBe(30);
    });

    it("treats a coefficient that cannot mean anything as one step", () => {
        expect(ymd(nextDate(at(2026, 3, 10), RECURRING_TYPE.daily, 0))).toStrictEqual([2026, 3, 11]);
        expect(ymd(nextDate(at(2026, 3, 10), RECURRING_TYPE.daily, -4))).toStrictEqual([2026, 3, 11]);
        expect(ymd(nextDate(at(2026, 3, 10), RECURRING_TYPE.daily, 2.4))).toStrictEqual([2026, 3, 12]);
    });

    it("has no next occurrence without a cadence", () => {
        expect(nextDate(at(2026, 3, 10), RECURRING_TYPE.none, 1)).toBeNull();
        expect(nextDate(at(2026, 3, 10), 99, 1)).toBeNull();
    });
});

describe("the next landing after today", () => {
    const now = new Date(2026, 2, 20, 10, 30);

    it("walks past the charges that have already settled", () => {
        expect(ymd(nextLanding(at(2026, 1, 15), RECURRING_TYPE.monthly, 1, null, now))).toStrictEqual([2026, 4, 15]);
    });

    it("skips a charge landing today — today is not ahead of today", () => {
        expect(ymd(nextLanding(at(2026, 1, 20), RECURRING_TYPE.monthly, 1, null, now))).toStrictEqual([2026, 4, 20]);
    });

    it("restores the anchor day after a short month instead of keeping the clamp", () => {
        expect(ymd(nextLanding(at(2026, 1, 31), RECURRING_TYPE.monthly, 1, null, now))).toStrictEqual([2026, 3, 31]);
    });

    it("takes an explicit anchor when the carrier's own day already clamped", () => {
        expect(ymd(nextLanding(at(2026, 2, 28), RECURRING_TYPE.monthly, 1, null, now, 31))).toStrictEqual([
            2026, 3, 31,
        ]);
    });

    it("returns a charge ahead of today even on the very next day", () => {
        expect(ymd(nextLanding(at(2026, 3, 21), RECURRING_TYPE.monthly, 1, null, now))).toStrictEqual([2026, 3, 21]);
    });

    it("has no landing for a future charge that carries no cadence", () => {
        expect(nextLanding(at(2026, 4, 1), RECURRING_TYPE.none, 1, null, now)).toBeNull();
    });

    it("returns a charge ahead of today that lands on the end date itself", () => {
        expect(ymd(nextLanding(at(2026, 4, 1), RECURRING_TYPE.monthly, 1, at(2026, 4, 1), now))).toStrictEqual([
            2026, 4, 1,
        ]);
    });

    it("has no landing when the charge ahead of today is past the end date", () => {
        expect(nextLanding(at(2026, 4, 1), RECURRING_TYPE.monthly, 1, at(2026, 3, 25), now)).toBeNull();
    });

    it("stops once the schedule runs past its end date", () => {
        expect(nextLanding(at(2026, 1, 15), RECURRING_TYPE.monthly, 1, at(2026, 4, 1), now)).toBeNull();
    });

    it("allows a landing on the end date itself", () => {
        expect(ymd(nextLanding(at(2026, 1, 15), RECURRING_TYPE.monthly, 1, at(2026, 4, 15), now))).toStrictEqual([
            2026, 4, 15,
        ]);
    });
});

describe("ensureRecurringType", () => {
    it("defaults a cadence-less type to monthly", () => {
        expect(ensureRecurringType(RECURRING_TYPE.none)).toBe(RECURRING_TYPE.monthly);
    });

    it("leaves an already-set cadence untouched", () => {
        expect(ensureRecurringType(RECURRING_TYPE.weekly)).toBe(RECURRING_TYPE.weekly);
        expect(ensureRecurringType(RECURRING_TYPE.yearly)).toBe(RECURRING_TYPE.yearly);
    });
});

describe("the charges a schedule is about to make", () => {
    const shown = (charges: ReturnType<typeof schedulePreview>) =>
        charges.map((charge) => [...(ymd(charge.date) ?? []), charge.clamped]);

    it("walks the first payment forward, excluding the payment itself", () => {
        expect(shown(schedulePreview(at(2026, 8, 7), RECURRING_TYPE.monthly, 3, 3))).toStrictEqual([
            [2026, 11, 7, false],
            [2027, 2, 7, false],
            [2027, 5, 7, false],
        ]);
    });

    it("marks only the charges a short month pulled off the anchor", () => {
        expect(shown(schedulePreview(at(2027, 1, 31), RECURRING_TYPE.monthly, 1, 3))).toStrictEqual([
            [2027, 2, 28, true],
            [2027, 3, 31, false],
            [2027, 4, 30, true],
        ]);
    });

    it("never marks a cadence that steps in whole days", () => {
        expect(shown(schedulePreview(at(2026, 8, 7), RECURRING_TYPE.daily, 18, 3))).toStrictEqual([
            [2026, 8, 25, false],
            [2026, 9, 12, false],
            [2026, 9, 30, false],
        ]);
    });

    it("has nothing to show without a cadence", () => {
        expect(schedulePreview(at(2026, 8, 7), RECURRING_TYPE.none, 1, 3)).toStrictEqual([]);
        expect(schedulePreview(at(2026, 8, 7), RECURRING_TYPE.monthly, 1, 0)).toStrictEqual([]);
    });
});
