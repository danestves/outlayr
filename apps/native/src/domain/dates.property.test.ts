import { assert, date, integer, property } from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { dayOfMonth, formatDayMonth, formatTime, monthAbbrevTitle } from "./dates";
import { addLocalDays, daysBetween, localDayKey, startOfLocalDay } from "./local-day";

const ZONES = ["UTC", "America/Caracas", "America/Sao_Paulo", "America/New_York", "Europe/Madrid"];
const instant = date({
    max: new Date(Date.UTC(2031, 0, 1)),
    min: new Date(Date.UTC(2020, 0, 1)),
    noInvalidDate: true,
});
const epoch = integer({ max: Date.UTC(2031, 0, 1), min: Date.UTC(2020, 0, 1) });
const shift = integer({ max: 400, min: -400 });

describe.each(ZONES)("dates on a %s host", (zone) => {
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

    it("renders a day key back as the local day it names", () => {
        assert(
            property(instant, (value) => {
                const key = localDayKey(value.getTime());

                expect(formatDayMonth(key, "en")).toBe(`${dayOfMonth(value, "en")} ${monthAbbrevTitle(value, "en")}`);
            })
        );
    });

    it("counts calendar days across a clock shift rather than 24-hour spans", () => {
        assert(
            property(epoch, shift, (at, days) => {
                const start = startOfLocalDay(at);
                const moved = startOfLocalDay(addLocalDays(at, days));

                expect(daysBetween(start, moved)).toBe(days);
            })
        );
    });

    it("writes a 24-hour clock that reads back as the same time", () => {
        assert(
            property(instant, (value) => {
                const text = formatTime(value, true, "en");
                const [hours, minutes] = text.split(":").map(Number);

                expect(hours).toBe(value.getHours());
                expect(minutes).toBe(value.getMinutes());
            })
        );
    });

    it("maps midnight and noon onto twelve rather than zero", () => {
        assert(
            property(instant, (value) => {
                const text = formatTime(value, false, "en");
                const [clock = "", meridiem = ""] = text.split(" ");
                const [hour = "0"] = clock.split(":");

                expect(text).toMatch(/^(?:1[0-2]|[1-9]):[0-5]\d (?:AM|PM)$/);
                expect(Number(hour)).toBe(value.getHours() % 12 === 0 ? 12 : value.getHours() % 12);
                expect(meridiem).toBe(value.getHours() >= 12 ? "PM" : "AM");
            })
        );
    });
});
