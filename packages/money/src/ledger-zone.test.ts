import { describe, expect, it } from "vite-plus/test";

import { CALENDAR_DAY_VECTORS } from "./calendar-vectors";
import { filedOn, isoDay, monthWindow, utcOffsetOf, zoneOffsets } from "./ledger-zone";

const HOUR = 3_600_000;
const at = (iso: string) => Date.parse(iso);

function offsetsOf(timeZone: string) {
    const offsetAt = zoneOffsets(timeZone);
    if (offsetAt === null) {
        throw new Error(`unknown zone ${timeZone}`);
    }
    return offsetAt;
}

describe("calendar day vectors in the ledger zone", () => {
    it.each(CALENDAR_DAY_VECTORS)("$name", ({ day, instant, iso, month, zone }) => {
        const offsetAt = offsetsOf(zone);
        expect(filedOn(at(instant), offsetAt)).toStrictEqual({ day: at(day), month: at(month) });
        expect(isoDay(at(instant), offsetAt(at(instant)))).toBe(iso);
    });

    it.each(CALENDAR_DAY_VECTORS.flatMap(({ window, ...vector }) => (window ? [{ ...vector, window }] : [])))(
        "month window: $name",
        ({ instant, window, zone }) => {
            const now = at(instant);
            expect(monthWindow(now, offsetsOf(zone)(now), window.firstDayOfMonth, 0)).toStrictEqual({
                end: at(window.end),
                start: at(window.start),
            });
        }
    );
});

describe("utcOffsetOf", () => {
    it.each([
        { midnight: "2026-10-09T04:00:00Z", offset: -4 * HOUR },
        { midnight: "2026-10-08T22:00:00Z", offset: 2 * HOUR },
        { midnight: "2026-10-09T00:00:00Z", offset: 0 },
        { midnight: "2026-10-09T10:00:00Z", offset: -10 * HOUR },
        { midnight: "2026-06-08T12:00:00Z", offset: 12 * HOUR },
        { midnight: "2026-10-08T11:00:00Z", offset: 13 * HOUR },
    ])("reads $offset from a calendar day stored at $midnight", ({ midnight, offset }) => {
        expect(utcOffsetOf(at(midnight))).toBe(offset);
    });

    it.each([
        { east: 13 * HOUR, midnight: "2026-10-09T11:00:00Z", west: -11 * HOUR },
        { east: 14 * HOUR, midnight: "2026-10-09T10:00:00Z", west: -10 * HOUR },
    ])("tells $west from $east at $midnight by the zone's offset", ({ east, midnight, west }) => {
        expect(utcOffsetOf(at(midnight), west)).toBe(west);
        expect(utcOffsetOf(at(midnight), east)).toBe(east);
    });
});

const GMT_OFFSET = /GMT(?:([+-])(\d{2}):(\d{2}))?/;

function zoneRules(timeZone: string) {
    const format = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" });
    return (instant: number) => {
        const name = format.formatToParts(instant).find((part) => part.type === "timeZoneName")?.value ?? "";
        const [, sign, hours = "0", minutes = "0"] = GMT_OFFSET.exec(name) ?? [];
        return (sign === "-" ? -1 : 1) * (Number(hours) * 60 + Number(minutes)) * 60_000;
    };
}

describe("zoneOffsets", () => {
    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const DAY = 24 * HOUR;
    const from = at("2010-01-01T00:00:00Z");
    const to = at("2027-01-01T00:00:00Z");

    it.each([
        { moves: true, timeZone: "America/New_York" },
        { moves: true, timeZone: "Europe/London" },
        { moves: true, timeZone: "Australia/Lord_Howe" },
        { moves: true, timeZone: "America/Caracas" },
        { moves: true, timeZone: "Pacific/Apia" },
        { moves: true, timeZone: "Africa/Casablanca" },
        { moves: false, timeZone: "Asia/Kathmandu" },
    ])(
        "reads what the zone's own rules say at every instant, across its changes ($timeZone)",
        ({ moves, timeZone }) => {
            const offsetAt = zoneOffsets(timeZone);
            const rules = zoneRules(timeZone);
            const wrong: string[] = [];
            const check = (instant: number) => {
                if (offsetAt?.(instant) !== rules(instant)) {
                    wrong.push(new Date(instant).toISOString());
                }
            };
            for (let instant = from; instant < to; instant += 5.5 * HOUR) {
                check(instant);
            }
            let changes = 0;
            for (let day = from; day < to; day += DAY) {
                if (rules(day) === rules(day + DAY - 1)) {
                    continue;
                }
                changes += 1;
                let low = day;
                let high = day + DAY - 1;
                while (high - low > SECOND) {
                    const middle = low + Math.floor((high - low) / (2 * SECOND)) * SECOND;
                    if (rules(middle) === rules(low)) {
                        low = middle;
                    } else {
                        high = middle;
                    }
                }
                for (let instant = high - 3 * SECOND; instant <= high + 3 * SECOND; instant += SECOND / 4) {
                    check(instant);
                }
                for (let instant = day - DAY; instant < day + 2 * DAY; instant += 7 * MINUTE) {
                    check(instant);
                }
            }
            expect(changes > 0).toBe(moves);
            expect(wrong).toStrictEqual([]);
        }
    );

    it("rejects a zone it does not know", () => {
        expect(zoneOffsets("Mars/Olympus")).toBeNull();
    });
});

describe("monthWindow", () => {
    const caracas = -4 * HOUR;

    it("starts on payday and steps back across the year", () => {
        expect(monthWindow(at("2026-01-05T10:00:00Z"), caracas, 15, 0)).toStrictEqual({
            end: at("2026-01-15T04:00:00Z"),
            start: at("2025-12-15T04:00:00Z"),
        });
        expect(monthWindow(at("2026-01-05T10:00:00Z"), caracas, 15, 1).start).toBe(at("2025-11-15T04:00:00Z"));
    });
});
