import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";
import { startOfWeek } from "@outlayr/money/calendar";

import { runtimeLanguage, setRuntimeLanguage } from "@/i18n/runtime";

import {
    formatChargeDate,
    formatDayHeader,
    formatDueDay,
    formatTime,
    formatUpcomingDate,
    formatWeekdayDay,
    monthAbbrev,
    monthAbbrevTitle,
    weekdayInitial,
} from "./dates";

// 2026-07-22 is a Wednesday; 2026-07-27 a Monday.
const WEDNESDAY = new Date("2026-07-22T15:30:00");
const NOW = new Date("2026-07-27T13:00:00");

/** The runtime language is process-wide, so no test may leave it moved. */
function underRuntimeLanguage(language: "en" | "es", body: () => void): void {
    const before = runtimeLanguage();
    setRuntimeLanguage(language);
    try {
        body();
    } finally {
        setRuntimeLanguage(before);
    }
}

describe("startOfWeek", () => {
    it("walks back to Sunday by default", () => {
        expect(startOfWeek(WEDNESDAY).getDate()).toBe(19);
    });

    it("walks back to Monday when the setting says so", () => {
        expect(startOfWeek(WEDNESDAY, 2).getDate()).toBe(20);
    });

    it("stays put when the day already is the first weekday", () => {
        expect(startOfWeek(NOW, 2).getDate()).toBe(27);
    });
});

describe("month names", () => {
    it("indexes December off the end of the year rather than wrapping", () => {
        const december = new Date("2026-12-01T09:00:00");
        expect(monthAbbrevTitle(december, "en")).toBe("Dec");
        expect(monthAbbrevTitle(december, "es")).toBe("dic");
    });
});

describe("weekdayInitial", () => {
    it("takes the letter the language actually uses", () => {
        expect(weekdayInitial(WEDNESDAY, "en")).toBe("W");
        // Spanish writes X for miércoles to tell it from martes.
        expect(weekdayInitial(WEDNESDAY, "es")).toBe("X");
        expect(weekdayInitial(NOW, "en")).toBe("M");
        expect(weekdayInitial(NOW, "es")).toBe("L");
    });
});

describe("formatDayHeader", () => {
    it("names today and yesterday rather than dating them", () => {
        expect(formatDayHeader(NOW, NOW, "en")).toBe("TODAY");
        expect(formatDayHeader(new Date("2026-07-26T09:00:00"), NOW, "en")).toBe("YESTERDAY");
        expect(formatDayHeader(NOW, NOW, "es")).toBe("HOY");
        expect(formatDayHeader(new Date("2026-07-26T09:00:00"), NOW, "es")).toBe("AYER");
    });

    it("abbreviates the weekday and puts the day before the month", () => {
        expect(formatDayHeader(WEDNESDAY, NOW, "en")).toBe("WED, 22 JUL");
        expect(formatDayHeader(WEDNESDAY, NOW, "es")).toBe("MIÉ, 22 JUL");
    });

    it("adds a shortened year once the day falls before the current one", () => {
        const lastYear = new Date("2025-12-30T09:00:00");
        expect(formatDayHeader(lastYear, NOW, "en")).toBe("TUE, 30 DEC '25");
        expect(formatDayHeader(lastYear, NOW, "es")).toBe("MAR, 30 DIC '25");
    });
});

describe("formatUpcomingDate", () => {
    it("names only the day and month an entry lands on", () => {
        expect(formatUpcomingDate(WEDNESDAY, "en")).toBe("22 JUL");
        expect(formatUpcomingDate(WEDNESDAY, "es")).toBe("22 JUL");
        expect(formatUpcomingDate(new Date("2026-01-09T09:00:00"), "es")).toBe("9 ENE");
    });
});

describe("formatTime", () => {
    const MIDNIGHT = new Date("2026-07-22T00:07:00");
    const NOON = new Date("2026-07-22T12:05:00");
    const AFTERNOON = new Date("2026-07-22T13:04:00");
    const EVENING = new Date("2026-07-22T21:04:00");

    it("keeps midnight and noon on 12 rather than 0", () => {
        expect(formatTime(MIDNIGHT, false, "en")).toBe("12:07 AM");
        expect(formatTime(NOON, false, "en")).toBe("12:05 PM");
    });

    it("drops the leading zero from a 12-hour hour", () => {
        expect(formatTime(AFTERNOON, false, "en")).toBe("1:04 PM");
        expect(formatTime(EVENING, false, "en")).toBe("9:04 PM");
    });

    it("pads the hour and drops the meridiem on a 24-hour clock", () => {
        expect(formatTime(MIDNIGHT, true, "en")).toBe("00:07");
        expect(formatTime(NOON, true, "en")).toBe("12:05");
        expect(formatTime(AFTERNOON, true, "en")).toBe("13:04");
        expect(formatTime(EVENING, true, "en")).toBe("21:04");
    });
});

describe("the language argument", () => {
    it("falls back to the live language, never to English", () => {
        underRuntimeLanguage("es", () => {
            expect(monthAbbrevTitle(WEDNESDAY)).toBe("jul");
            expect(monthAbbrev(WEDNESDAY)).toBe("JUL");
            expect(weekdayInitial(WEDNESDAY)).toBe("X");
            expect(formatDayHeader(WEDNESDAY, NOW)).toBe("MIÉ, 22 JUL");
            expect(formatDayHeader(NOW, NOW)).toBe("HOY");
            expect(formatTime(new Date("2026-07-22T21:04:00"))).toBe("9:04 p. m.");
        });
    });
});

describe("formatChargeDate", () => {
    it("writes the weekday and day in the language's own case", () => {
        expect(formatChargeDate(new Date(2026, 10, 7), NOW, "en")).toBe("Sat, 7 Nov");
        expect(formatChargeDate(new Date(2026, 10, 7), NOW, "es")).toBe("sáb, 7 nov");
    });

    it("adds the year only once the charge leaves the current one", () => {
        expect(formatChargeDate(new Date(2027, 1, 7), NOW, "en")).toBe("Sun, 7 Feb 2027");
    });
});

describe("formatDueDay", () => {
    const FIRE = new Date(2026, 9, 8, 8, 0);

    it("counts calendar days from the moment it is read, not elapsed hours", () => {
        expect(formatDueDay(new Date(2026, 9, 8), FIRE, "en")).toBe("Today");
        expect(formatDueDay(new Date(2026, 9, 9), FIRE, "en")).toBe("Tomorrow");
        expect(formatDueDay(new Date(2026, 9, 9), FIRE, "es")).toBe("Mañana");
    });

    it("names the weekday inside the week, capitalized", () => {
        expect(formatDueDay(new Date(2026, 9, 10), FIRE, "en")).toBe("Saturday");
        expect(formatDueDay(new Date(2026, 9, 14), FIRE, "es")).toBe("Miércoles");
    });

    it("dates a charge a week or more out", () => {
        expect(formatDueDay(new Date(2026, 9, 15), FIRE, "en")).toBe("Thu, 15 Oct");
        expect(formatDueDay(new Date(2026, 9, 15), FIRE, "es")).toBe("Jue, 15 oct");
    });
});

describe("formatWeekdayDay", () => {
    it("names the weekday in the language it is given", () => {
        expect(formatWeekdayDay(new Date(2026, 8, 27), "en")).toBe("Sun 27");
        expect(formatWeekdayDay(new Date(2026, 8, 27), "es")).toBe("dom 27");
    });
});

function headerInMadrid(...parts: number[]): string {
    const probe = join(import.meta.dirname, "dst-probe.ts");
    return execFileSync(process.execPath, ["--import", "tsx", probe, "header", ...parts.map(String)], {
        encoding: "utf-8",
        env: { ...process.env, TZ: "Europe/Madrid" },
    });
}

describe("naming yesterday across a clock shift", () => {
    it("still says YESTERDAY the day after springing forward", () => {
        expect(headerInMadrid(2025, 2, 30, 9, 0, 2025, 2, 31, 10, 0)).toBe("YESTERDAY");
    });

    it("still says YESTERDAY the day after falling back", () => {
        expect(headerInMadrid(2025, 9, 26, 9, 0, 2025, 9, 27, 10, 0)).toBe("YESTERDAY");
    });

    it("still names an ordinary day two days back", () => {
        expect(headerInMadrid(2025, 2, 29, 9, 0, 2025, 2, 31, 10, 0)).toBe("SAT, 29 MAR");
    });
});
