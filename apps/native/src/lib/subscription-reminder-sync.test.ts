import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { startOfDay } from "@outlayr/money/calendar";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import * as Effect from "effect/Effect";

import { setBoolSetting } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

jest.mock("./reminders", () => ({
    cancelReminders: jest.fn(async () => undefined),
    pendingReminderIds: jest.fn(async () => ["outlayr.sub-due.a"]),
    reminderPermission: jest.fn(),
    scheduleDatedReminder: jest.fn(async () => undefined),
}));

import * as reminders from "./reminders";
import { syncSubscriptionReminders } from "./subscription-reminder-sync";

const mockReminders = jest.mocked(reminders);

describe("syncSubscriptionReminders", () => {
    let db: Database;

    beforeEach(async () => {
        db = migratedDatabase();
        mockReminders.cancelReminders.mockClear();
        await Effect.runPromise(setBoolSetting(db, "subscriptionReminders", true));
    });

    it("leaves the armed queue alone when the permission could not be read", async () => {
        mockReminders.reminderPermission.mockResolvedValue("unknown");

        await syncSubscriptionReminders(db);

        expect(mockReminders.cancelReminders).not.toHaveBeenCalled();
    });

    it("still silences the queue when the switch is off, whatever the permission", async () => {
        await Effect.runPromise(setBoolSetting(db, "subscriptionReminders", false));
        mockReminders.reminderPermission.mockResolvedValue("unknown");

        await syncSubscriptionReminders(db);

        expect(mockReminders.cancelReminders).toHaveBeenCalledWith(["outlayr.sub-due.a"]);
    });

    it("drops the orphans when the permission is granted and nothing is due", async () => {
        mockReminders.reminderPermission.mockResolvedValue("granted");

        await syncSubscriptionReminders(db);

        expect(mockReminders.cancelReminders).toHaveBeenCalledWith(["outlayr.sub-due.a"]);
    });

    it("arms a due charge with its copy and the row a tap opens", async () => {
        mockReminders.reminderPermission.mockResolvedValue("granted");
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

        await syncSubscriptionReminders(db);

        expect(mockReminders.scheduleDatedReminder).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { charge: expect.any(String), subscription: "prime" },
                title: "$7.06 · Prime Video",
            })
        );
    });

    it("swaps the armed single notices for one digest once a second charge joins their morning", async () => {
        mockReminders.reminderPermission.mockResolvedValue("granted");
        mockReminders.pendingReminderIds.mockResolvedValueOnce(["outlayr.sub-due.netflix", "outlayr.sub-due.prime"]);
        mockReminders.scheduleDatedReminder.mockClear();
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

        await syncSubscriptionReminders(db);

        expect(mockReminders.cancelReminders).toHaveBeenCalledWith([
            "outlayr.sub-due.netflix",
            "outlayr.sub-due.prime",
        ]);
        expect(mockReminders.scheduleDatedReminder.mock.calls).toStrictEqual([
            [expect.objectContaining({ data: { open: "log" }, title: "2 charges tomorrow" })],
        ]);
    });
});
