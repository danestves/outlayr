import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { Meta } from "@/data/app-meta-core";
import { markReminderChosen } from "@/data/onboarding-core";
import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";
import type { ReminderPermission } from "@/domain/reminder";

import { armChosenReminder as arm } from "./chosen-reminder";
import { freshEntries } from "./fresh-entries";
import { Reminders } from "./reminders";

vi.mock("expo-notifications", () => ({}));

const mockPermission = vi.fn<() => Promise<ReminderPermission>>();
const mockRequest = vi.fn<() => Promise<ReminderPermission>>();

const armChosenReminder = (db: Database) =>
    Effect.runPromise(
        arm(db).pipe(
            Effect.provideService(Reminders, {
                cancel: () => Effect.void,
                pendingIds: () => Effect.succeed([]),
                permission: () => Effect.promise(() => mockPermission()),
                request: () => Effect.promise(() => mockRequest()),
                schedule: () => Effect.void,
            })
        )
    );

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

        expect(mockRequest).toHaveBeenCalledOnce();
        await expect(Effect.runPromise(Meta.get(db, "showNotifications"))).resolves.toBe(true);
    });

    it("leaves a reminder the user switched off alone, even with permission granted", async () => {
        mockPermission.mockResolvedValue("granted");
        await Effect.runPromise(Meta.set(db, "showNotifications", false));

        await armChosenReminder(db);

        expect(mockRequest).not.toHaveBeenCalled();
        await expect(Effect.runPromise(Meta.get(db, "showNotifications"))).resolves.toBe(false);
        await expect(Effect.runPromise(Meta.get(db, "reminderAsked"))).resolves.toBe(true);
    });

    it("keeps the ask for the next save when the permission read fails", async () => {
        mockPermission.mockResolvedValueOnce("unknown");

        await armChosenReminder(db);

        expect(mockRequest).not.toHaveBeenCalled();
        await expect(Effect.runPromise(Meta.get(db, "reminderAsked"))).resolves.toBe(false);

        await armChosenReminder(db);

        expect(mockRequest).toHaveBeenCalledOnce();
    });

    it("keeps the ask when an entry starts arriving during the permission read", async () => {
        mockPermission.mockImplementationOnce(async () => {
            freshEntries.mark("arriving", new Date());
            return "undetermined";
        });

        await armChosenReminder(db);

        expect(mockRequest).not.toHaveBeenCalled();
        await expect(Effect.runPromise(Meta.get(db, "reminderAsked"))).resolves.toBe(false);
        freshEntries.settle("arriving");
    });

    it("does not ask again after a refusal", async () => {
        mockRequest.mockResolvedValue("denied");

        await armChosenReminder(db);
        await armChosenReminder(db);

        expect(mockRequest).toHaveBeenCalledOnce();
        await expect(Effect.runPromise(Meta.get(db, "showNotifications"))).resolves.toBe(false);
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

        expect(mockRequest).toHaveBeenCalledOnce();
        await expect(Effect.runPromise(Meta.get(db, "showNotifications"))).resolves.toBe(true);
    });

    it("leaves a skipped offer alone", async () => {
        const skipped = migratedDatabase();

        await armChosenReminder(skipped);

        expect(mockPermission).not.toHaveBeenCalled();
        await expect(Effect.runPromise(Meta.get(skipped, "showNotifications"))).resolves.toBe(false);
    });
});
