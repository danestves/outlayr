import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";
import { amountParts, formatAmount } from "@/domain/money";

import { Meta } from "./app-meta-core";
import type { BoolSettingKey } from "./app-meta-registry";
import { selectSettings, settingsSnapshot } from "./settings";
import { mirrorTimeZone, ordinalDay, remoteEnrichmentOn, seedClockPreference } from "./settings-core";

const makeDb = migratedDatabase;

describe("the 12/24-hour clock", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("seeds the device's convention when the user has never chosen", async () => {
        await Effect.runPromise(seedClockPreference(db, true));
        await expect(Effect.runPromise(Meta.get(db, "use24HourClock"))).resolves.toBe(true);
    });

    it("never overrules a stored choice, not even a stored false", async () => {
        await Effect.runPromise(Meta.set(db, "use24HourClock", false));
        await Effect.runPromise(seedClockPreference(db, true));
        await expect(Effect.runPromise(Meta.get(db, "use24HourClock"))).resolves.toBe(false);
    });

    it("does not re-seed once it has seeded", async () => {
        await Effect.runPromise(seedClockPreference(db, true));
        await Effect.runPromise(Meta.set(db, "use24HourClock", false));
        await Effect.runPromise(seedClockPreference(db, true));
        await expect(Effect.runPromise(Meta.get(db, "use24HourClock"))).resolves.toBe(false);
    });
});

describe("the mirrored time zone", () => {
    it("rewrites on a change of this device's zone, never over another device's pulled zone", async () => {
        const db = makeDb();
        const stored = () => Effect.runPromise(Meta.get(db, "timeZone"));
        await Effect.runPromise(mirrorTimeZone(db, "America/Caracas"));
        await Effect.runPromise(Meta.set(db, "timeZone", "Pacific/Niue"));

        await Effect.runPromise(mirrorTimeZone(db, "America/Caracas"));
        await expect(stored()).resolves.toBe("Pacific/Niue");

        await Effect.runPromise(mirrorTimeZone(db, "Europe/Madrid"));
        await expect(stored()).resolves.toBe("Europe/Madrid");
    });
});

describe("settings read/write round-trip", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("upserts (a second write replaces the first)", async () => {
        await Effect.runPromise(Meta.set(db, "firstWeekday", 2));
        await Effect.runPromise(Meta.set(db, "firstWeekday", 1));
        await expect(Effect.runPromise(Meta.get(db, "firstWeekday"))).resolves.toBe(1);
    });

    it("holds the subscription notices on a key of their own", async () => {
        await Effect.runPromise(Meta.set(db, "subscriptionReminders", true));
        await Effect.runPromise(Meta.set(db, "showNotifications", false));
        await expect(Effect.runPromise(Meta.get(db, "subscriptionReminders"))).resolves.toBe(true);
        await expect(Effect.runPromise(Meta.get(db, "showNotifications"))).resolves.toBe(false);
    });
});

describe("the settings read behind the app-wide snapshot", () => {
    it("is unchanged by bookkeeping writes and reads a changed setting", async () => {
        const db = makeDb();
        await Effect.runPromise(Meta.set(db, "showCents", true));
        const before = selectSettings(db).all();

        await Effect.runPromise(Meta.set(db, "syncCursor", 42));
        await Effect.runPromise(Meta.set(db, "syncedAt", 1_760_000_000_000));
        expect(selectSettings(db).all()).toStrictEqual(before);

        await Effect.runPromise(Meta.set(db, "showCents", false));
        expect(settingsSnapshot(selectSettings(db).all()).get("showCents")).toBe(false);
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
