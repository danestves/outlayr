import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";

import { addLocalMonths, onUtcPickerDay, payDays, startOfLocalDay, tomorrowLocal, utcPickerDay } from "./local-day";

const inNewYork = (...args: (number | string)[]): string =>
    execFileSync(
        process.execPath,
        ["--import", "tsx", join(import.meta.dirname, "dst-probe.ts"), ...args.map(String)],
        {
            encoding: "utf-8",
            env: { ...process.env, TZ: "America/New_York" },
        }
    );

describe("the reader's calendar", () => {
    it("floors to the local midnight, not the epoch's", () => {
        const afternoon = new Date(2026, 7, 21, 15, 30);
        expect(startOfLocalDay(afternoon.getTime())).toBe(new Date(2026, 7, 21).getTime());
    });

    it("counts whole days across a clock change", () => {
        expect(inNewYork("days-between", 2027, 2, 13, 0, 0, 2027, 2, 15, 0, 0)).toBe("2");
    });

    it("offers tomorrow at midnight, whatever the hour now", () => {
        const late = new Date(2026, 7, 21, 23, 59).getTime();
        expect(tomorrowLocal(late)).toStrictEqual(new Date(2026, 7, 22));
    });

    it("clamps a month offset to the destination month's last day", () => {
        const endOfAugust = new Date(2026, 7, 31).getTime();
        expect(addLocalMonths(endOfAugust, 6)).toStrictEqual(new Date(2027, 1, 28));
    });

    it("keeps the day of the month where the destination has one", () => {
        expect(addLocalMonths(new Date(2026, 7, 15).getTime(), 6)).toStrictEqual(new Date(2027, 1, 15));
    });
});

describe("the Material date picker's UTC days", () => {
    it("opens on the entry's own local day, late in the evening too", () => {
        expect(utcPickerDay(new Date(2026, 9, 14, 23, 30))).toBe("2026-10-14T00:00:00.000Z");
    });

    it("moves to the picked day and keeps the time of day", () => {
        const entry = new Date(2026, 9, 14, 21, 45);
        const moved = onUtcPickerDay(new Date("2026-10-02T00:00:00.000Z"), entry);
        expect(moved).toStrictEqual(new Date(2026, 9, 2, 21, 45));
    });
});

describe("payDays", () => {
    it("offers tomorrow, the Friday after it, and a month end still ahead of tomorrow", () => {
        const days = (year: number, month: number, day: number) => {
            const { friday, monthEnd, tomorrow } = payDays(new Date(year, month, day, 15).getTime());
            return [tomorrow, friday, monthEnd].map((date) => `${date.getMonth() + 1}/${date.getDate()}`);
        };
        expect(days(2026, 9, 21)).toStrictEqual(["10/22", "10/23", "10/31"]);
        expect(days(2026, 9, 22)).toStrictEqual(["10/23", "10/30", "10/31"]);
        expect(days(2026, 9, 30)).toStrictEqual(["10/31", "11/6", "11/30"]);
        expect(days(2027, 1, 27)).toStrictEqual(["2/28", "3/5", "3/31"]);
    });
});
