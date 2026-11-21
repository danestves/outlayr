import { assert, date, integer, property } from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import {
    addDays,
    addLocalDays,
    addLocalMonths,
    monthPeriodStart,
    startOfDay,
    startOfLocalDay,
    startOfWeek,
} from "./calendar";

const ZONES = ["UTC", "America/Caracas", "America/Sao_Paulo", "America/New_York", "Europe/Madrid"];
const instant = date({
    max: new Date(Date.UTC(2031, 0, 1)),
    min: new Date(Date.UTC(2020, 0, 1)),
    noInvalidDate: true,
});
const epoch = integer({ max: Date.UTC(2031, 0, 1), min: Date.UTC(2020, 0, 1) });
const shift = integer({ max: 400, min: -400 });
const firstWeekday = integer({ max: 7, min: 1 });
const firstDayOfMonth = integer({ max: 28, min: 1 });
const months = integer({ max: 24, min: -24 });

const dayParts = (value: Date): readonly number[] => [value.getFullYear(), value.getMonth(), value.getDate()];

const expectedDay = (value: Date, days: number): readonly number[] => {
    const moved = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate() + days));
    return [moved.getUTCFullYear(), moved.getUTCMonth(), moved.getUTCDate()];
};

describe.each(ZONES)("calendar on a %s host", (zone) => {
    let hostZone: string | undefined;

    beforeAll(() => {
        hostZone = process.env.TZ;
        process.env.TZ = zone;
    });

    afterAll(() => {
        if (hostZone === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = hostZone;
        }
    });

    it("advances exactly the requested calendar days and back", () => {
        assert(
            property(instant, shift, (value, days) => {
                const moved = addDays(value, days);

                expect(dayParts(moved)).toStrictEqual(expectedDay(value, days));
                expect(dayParts(addDays(moved, -days))).toStrictEqual(dayParts(value));
            })
        );
    });

    it("puts every instant in exactly one day bucket", () => {
        assert(
            property(instant, (value) => {
                const start = startOfDay(value);
                const next = startOfDay(addDays(value, 1));

                expect(start.getTime()).toBeLessThanOrEqual(value.getTime());
                expect(value.getTime()).toBeLessThan(next.getTime());
            })
        );
    });

    it("puts every instant in exactly one week bucket", () => {
        assert(
            property(instant, firstWeekday, (value, weekday) => {
                const start = startOfWeek(value, weekday);
                const next = startOfWeek(addDays(value, 7), weekday);

                expect(start.getTime()).toBeLessThanOrEqual(value.getTime());
                expect(value.getTime()).toBeLessThan(next.getTime());
                expect((start.getDay() - (weekday - 1) + 7) % 7).toBe(0);
            })
        );
    });

    it("puts every instant in exactly one month bucket", () => {
        assert(
            property(instant, firstDayOfMonth, (value, anchor) => {
                const start = monthPeriodStart(value, anchor);
                const next = monthPeriodStart(addDays(start, 32), anchor);

                expect(start.getTime()).toBeLessThanOrEqual(value.getTime());
                expect(value.getTime()).toBeLessThan(next.getTime());
                expect(start.getDate()).toBe(anchor);
                expect(next.getDate()).toBe(anchor);
            })
        );
    });

    it("floors to a local midnight and returns there after any day shift", () => {
        assert(
            property(epoch, shift, (at, days) => {
                const start = startOfLocalDay(at);

                expect(start).toBeLessThanOrEqual(at);
                expect(at).toBeLessThan(startOfLocalDay(addLocalDays(at, 1)));
                expect(addLocalDays(addLocalDays(at, days), -days)).toBe(start);
            })
        );
    });

    it("clamps a month shift to the target month's last day", () => {
        assert(
            property(instant, months, (value, count) => {
                const shifted = addLocalMonths(value.getTime(), count);
                const total = value.getFullYear() * 12 + value.getMonth() + count;
                const year = Math.floor(total / 12);
                const month = total - year * 12;
                const lastDay = new Date(year, month + 1, 0).getDate();

                expect([shifted.getFullYear(), shifted.getMonth(), shifted.getDate()]).toStrictEqual([
                    year,
                    month,
                    Math.min(value.getDate(), lastDay),
                ]);
            })
        );
    });
});
