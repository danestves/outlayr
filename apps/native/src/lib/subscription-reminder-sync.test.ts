import { startOfDay } from "@outlayr/money/calendar";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { setBoolSetting } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import type { ReminderPermission } from "@/domain/reminder";

import { Reminders } from "./reminders";
import type { DatedReminder } from "./reminders";
import { syncSubscriptionReminders } from "./subscription-reminder-sync";

vi.mock("expo-notifications", () => ({}));

const mockReminders = {
    cancel: vi.fn<(ids: readonly string[]) => void>(),
    pendingIds: vi.fn<() => string[]>(),
    permission: vi.fn<() => ReminderPermission>(),
    schedule: vi.fn<(reminder: DatedReminder) => void>(),
};

const sync = (db: Database, cancel = (ids: readonly string[]) => Effect.sync(() => mockReminders.cancel(ids))) =>
    Effect.runPromise(
        syncSubscriptionReminders(db).pipe(
            Effect.provideService(Reminders, {
                cancel,
                pendingIds: () => Effect.sync(() => mockReminders.pendingIds()),
                permission: () => Effect.sync(() => mockReminders.permission()),
                request: () => Effect.succeed("granted"),
                schedule: (reminder) => Effect.sync(() => mockReminders.schedule(reminder)),
            })
        )
    );

const settle = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

describe("syncSubscriptionReminders", () => {
    let db: Database;

    beforeEach(async () => {
        db = migratedDatabase();
        mockReminders.cancel.mockClear();
        mockReminders.schedule.mockClear();
        mockReminders.pendingIds.mockReturnValue(["outlayr.sub-due.a"]);
        await Effect.runPromise(setBoolSetting(db, "subscriptionReminders", true));
    });

    it("leaves the armed queue alone when the permission could not be read", async () => {
        mockReminders.permission.mockReturnValue("unknown");

        await sync(db);

        expect(mockReminders.cancel).not.toHaveBeenCalled();
    });

    it("still silences the queue when the switch is off, whatever the permission", async () => {
        await Effect.runPromise(setBoolSetting(db, "subscriptionReminders", false));
        mockReminders.permission.mockReturnValue("unknown");

        await sync(db);

        expect(mockReminders.cancel).toHaveBeenCalledWith(["outlayr.sub-due.a"]);
    });

    it("drops the orphans when the permission is granted and nothing is due", async () => {
        mockReminders.permission.mockReturnValue("granted");

        await sync(db);

        expect(mockReminders.cancel).toHaveBeenCalledWith(["outlayr.sub-due.a"]);
    });

    it("arms a due charge with its copy and the row a tap opens", async () => {
        mockReminders.permission.mockReturnValue("granted");
        const today = new Date();
        await db.insert(transactions).values({
            amount: 7.06,
            currency: "USD",
            date: today,
            day: startOfDay(today),
            id: "prime",
            income: false,
            month: startOfDay(today),
            note: "Prime Video",
            recurringType: RECURRING_TYPE.monthly,
            reminderLeadDays: 1,
            updatedAt: today,
        });

        await sync(db);

        expect(mockReminders.schedule).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { charge: expect.any(String), subscription: "prime" },
                title: "$7.06 · Prime Video",
            })
        );
    });

    it("swaps the armed single notices for one digest once a second charge joins their morning", async () => {
        mockReminders.permission.mockReturnValue("granted");
        mockReminders.pendingIds.mockReturnValueOnce(["outlayr.sub-due.netflix", "outlayr.sub-due.prime"]);
        mockReminders.schedule.mockClear();
        const today = new Date();
        await db.insert(transactions).values(
            ["netflix", "prime"].map((id) => ({
                amount: 7.06,
                currency: "USD",
                date: today,
                day: startOfDay(today),
                id,
                income: false,
                month: startOfDay(today),
                note: id,
                recurringType: RECURRING_TYPE.monthly,
                reminderLeadDays: 1,
                updatedAt: today,
            }))
        );

        await sync(db);

        expect(mockReminders.cancel).toHaveBeenCalledWith(["outlayr.sub-due.netflix", "outlayr.sub-due.prime"]);
        expect(mockReminders.schedule.mock.calls).toStrictEqual([
            [expect.objectContaining({ data: { open: "log" }, title: "2 charges tomorrow" })],
        ]);
    });

    it("runs overlapping passes one at a time, so one cannot cancel what the other armed", async () => {
        mockReminders.permission.mockReturnValue("granted");
        const gate = Promise.withResolvers<undefined>();
        let cancels = 0;
        const held = () =>
            Effect.promise(async () => {
                cancels += 1;
                await gate.promise;
            });

        const both = Promise.all([sync(db, held), sync(db, held)]);
        await settle();
        await settle();
        expect(cancels).toBe(1);

        gate.resolve(undefined);
        await both;
        expect(cancels).toBe(2);
    });
});
