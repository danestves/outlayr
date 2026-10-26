import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";

import { getMeta, META_KEYS } from "@/data/app-meta-core";
import { markReminderChosen } from "@/data/onboarding-core";
import { readBoolSetting, setBoolSetting } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";
import type { ReminderPermission } from "@/domain/reminder";

import { armChosenReminder } from "./chosen-reminder";
import { reminderPermission, requestReminderPermission } from "./reminders";

jest.mock("./reminders", () => ({
    reminderPermission: jest.fn(),
    requestReminderPermission: jest.fn(),
}));

const mockPermission = jest.mocked(reminderPermission);
const mockRequest = jest.mocked(requestReminderPermission);

describe("armChosenReminder", () => {
    let db: Database;

    beforeEach(async () => {
        db = migratedDatabase();
        mockPermission.mockReset().mockResolvedValue("undetermined");
        mockRequest.mockReset().mockResolvedValue("granted");
        await Effect.runPromise(markReminderChosen(db));
    });

    it("asks after the first saved entry and turns the reminder on", async () => {
        await armChosenReminder(db);

        expect(mockRequest).toHaveBeenCalledTimes(1);
        await expect(Effect.runPromise(readBoolSetting(db, "showNotifications"))).resolves.toBe(true);
    });

    it("leaves a reminder the user switched off alone, even with permission granted", async () => {
        mockPermission.mockResolvedValue("granted");
        await Effect.runPromise(setBoolSetting(db, "showNotifications", false));

        await armChosenReminder(db);

        expect(mockRequest).not.toHaveBeenCalled();
        await expect(Effect.runPromise(readBoolSetting(db, "showNotifications"))).resolves.toBe(false);
        await expect(Effect.runPromise(getMeta(db, META_KEYS.reminderAsked))).resolves.toBe("true");
    });

    it("keeps the ask for the next save when the permission read fails", async () => {
        mockPermission.mockResolvedValueOnce("unknown");

        await armChosenReminder(db);

        expect(mockRequest).not.toHaveBeenCalled();
        await expect(Effect.runPromise(getMeta(db, META_KEYS.reminderAsked))).resolves.toBeNull();

        await armChosenReminder(db);

        expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it("does not ask again after a refusal", async () => {
        mockRequest.mockResolvedValue("denied");

        await armChosenReminder(db);
        await armChosenReminder(db);

        expect(mockRequest).toHaveBeenCalledTimes(1);
        await expect(Effect.runPromise(readBoolSetting(db, "showNotifications"))).resolves.toBe(false);
    });

    it("asks once when a second save lands while the prompt is up", async () => {
        let answer: (permission: ReminderPermission) => void = () => undefined;
        mockRequest.mockReturnValue(
            new Promise<ReminderPermission>((resolve) => {
                answer = resolve;
            })
        );

        const both = Promise.all([armChosenReminder(db), armChosenReminder(db)]);
        answer("granted");
        await both;

        expect(mockRequest).toHaveBeenCalledTimes(1);
        await expect(Effect.runPromise(readBoolSetting(db, "showNotifications"))).resolves.toBe(true);
    });

    it("leaves a skipped offer alone", async () => {
        const skipped = migratedDatabase();

        await armChosenReminder(skipped);

        expect(mockPermission).not.toHaveBeenCalled();
        await expect(Effect.runPromise(readBoolSetting(skipped, "showNotifications"))).resolves.toBe(false);
    });
});
