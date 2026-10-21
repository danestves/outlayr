import { beforeEach, describe, expect, it } from "@jest/globals";

import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";
import { amountParts, formatAmount } from "@/domain/money";

import { META_KEYS, setMeta } from "./app-meta-core";
import { selectSettings, settingsSnapshot } from "./settings";
import type { BoolSettingKey } from "./settings-core";
import {
    ordinalDay,
    parseBoolSetting,
    parseIntSetting,
    readBoolSetting,
    readNumberSetting,
    remoteEnrichmentOn,
    seedClockPreference,
    setBoolSetting,
    setNumberSetting,
} from "./settings-core";

const makeDb = migratedDatabase;

describe("the 12/24-hour clock", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("seeds the device's convention when the user has never chosen", async () => {
        await seedClockPreference(db, true);
        await expect(readBoolSetting(db, "use24HourClock")).resolves.toBe(true);
    });

    it("never overrules a stored choice, not even a stored false", async () => {
        await setBoolSetting(db, "use24HourClock", false);
        await seedClockPreference(db, true);
        await expect(readBoolSetting(db, "use24HourClock")).resolves.toBe(false);
    });

    it("does not re-seed once it has seeded", async () => {
        await seedClockPreference(db, true);
        await setBoolSetting(db, "use24HourClock", false);
        await seedClockPreference(db, true);
        await expect(readBoolSetting(db, "use24HourClock")).resolves.toBe(false);
    });
});

describe("settings read/write round-trip", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("upserts (a second write replaces the first)", async () => {
        await setNumberSetting(db, "firstWeekday", 2);
        await setNumberSetting(db, "firstWeekday", 1);
        await expect(readNumberSetting(db, "firstWeekday")).resolves.toBe(1);
    });

    it("holds the subscription notices on a key of their own", async () => {
        await setBoolSetting(db, "subscriptionReminders", true);
        await setBoolSetting(db, "showNotifications", false);
        await expect(readBoolSetting(db, "subscriptionReminders")).resolves.toBe(true);
        await expect(readBoolSetting(db, "showNotifications")).resolves.toBe(false);
    });
});

describe("the settings read behind the app-wide snapshot", () => {
    it("is unchanged by bookkeeping writes and reads a changed setting", async () => {
        const db = makeDb();
        await setBoolSetting(db, "showCents", true);
        const before = selectSettings(db).all();

        await setMeta(db, META_KEYS.syncCursor, "42");
        await setMeta(db, META_KEYS.syncedAt, "1760000000000");
        expect(selectSettings(db).all()).toStrictEqual(before);

        await setBoolSetting(db, "showCents", false);
        expect(settingsSnapshot(selectSettings(db).all()).bool("showCents")).toBe(false);
    });
});

describe("setting parsers", () => {
    it("falls back on absence and bad input", () => {
        expect(parseBoolSetting(null, true)).toBe(true);
        expect(parseBoolSetting("false", true)).toBe(false);
        expect(parseBoolSetting("true", false)).toBe(true);
        expect(parseIntSetting(null, 1)).toBe(1);
        expect(parseIntSetting("abc", 1)).toBe(1);
        expect(parseIntSetting("15", 1)).toBe(15);
    });
});

describe("time-frame labels", () => {
    it("renders English ordinals", () => {
        expect(ordinalDay(1)).toBe("1st");
        expect(ordinalDay(2)).toBe("2nd");
        expect(ordinalDay(3)).toBe("3rd");
        expect(ordinalDay(4)).toBe("4th");
        expect(ordinalDay(11)).toBe("11th");
        expect(ordinalDay(12)).toBe("12th");
        expect(ordinalDay(13)).toBe("13th");
        expect(ordinalDay(21)).toBe("21st");
    });
});

describe("showCents effect on formatting", () => {
    it("keeps cents when showCents is true (the default)", () => {
        const parts = amountParts(12.34, "USD", true);
        expect(parts.integer).toBe("12");
        expect(parts.fraction).toBe("34");
        expect(formatAmount(12.34, "USD", true)).toBe("$12.34");
        expect(formatAmount(12.34, "USD")).toBe("$12.34");
    });
});

describe("remoteEnrichmentOn", () => {
    it.each([
        [["aiEnrichment"], false],
        [["aiConsentV2"], false],
        [["aiConsentV2", "aiEnrichment"], true],
    ] as const)("with %j on, sends merchant names to an AI provider: %p", (keys, allowed) => {
        const on = new Set<BoolSettingKey>(keys);
        expect(remoteEnrichmentOn((key) => on.has(key))).toBe(allowed);
    });
});
