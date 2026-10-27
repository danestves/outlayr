import { describe, expect, it, jest } from "@jest/globals";
import { sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Logger from "effect/Logger";

import { appMeta } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { settingChangeReaches, wakeSettingListeners } from "./database-changes";

describe("settingChangeReaches", () => {
    it("wakes a keyed listener only for its own keys", () => {
        const reminders = ["hideAmounts", "notificationHour"];
        expect(settingChangeReaches(new Set(["logInsightsTimeFrame", "colorScheme"]), reminders)).toBe(false);
        expect(settingChangeReaches(new Set(["colorScheme", "hideAmounts"]), reminders)).toBe(true);
    });

    it("wakes everyone when a deleted row hid the key, and no one for bookkeeping alone", () => {
        expect(settingChangeReaches(null, ["hideAmounts"])).toBe(true);
        expect(settingChangeReaches(null)).toBe(true);
        expect(settingChangeReaches(new Set())).toBe(false);
        expect(settingChangeReaches(new Set(["colorScheme"]))).toBe(true);
    });
});

describe("wakeSettingListeners", () => {
    it("wakes only the listener whose setting the changed row holds", async () => {
        const db = migratedDatabase();
        await db.insert(appMeta).values({ key: "colorScheme", value: "dark" });
        const [{ rowid }] = await db.all<{ rowid: number }>("select rowid from appMeta where key = 'colorScheme'");
        const scheme = jest.fn();
        const reminders = jest.fn();

        await Effect.runPromise(
            wakeSettingListeners({
                db,
                listeners: new Set([
                    { keys: ["colorScheme"], run: scheme },
                    { keys: ["notificationHour"], run: reminders },
                ]),
                rowIds: [rowid],
            })
        );

        expect(scheme).toHaveBeenCalledTimes(1);
        expect(reminders).not.toHaveBeenCalled();
    });

    it("wakes every listener when the changed rows cannot be read", async () => {
        const db = migratedDatabase();
        await db.run(sql`drop table appMeta`);
        const run = jest.fn();

        await Effect.runPromise(
            wakeSettingListeners({ db, listeners: new Set([{ keys: ["colorScheme"], run }]), rowIds: [9999] }).pipe(
                Effect.provide(Logger.layer([]))
            )
        );

        expect(run).toHaveBeenCalledTimes(1);
    });
});
