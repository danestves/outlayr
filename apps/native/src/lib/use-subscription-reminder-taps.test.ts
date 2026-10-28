// @vitest-environment jsdom
import { addDays } from "@outlayr/money/calendar";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { occurrenceId } from "@/data/recurrence-backfill";
import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

const mockNavigate = vi.fn();
const mockRouter = { navigate: mockNavigate };
const mockTaps: { last: unknown; listener: ((response: unknown) => void) | null } = { last: null, listener: null };

vi.mock("@react-native-async-storage/async-storage", async () => {
    vi.stubGlobal("jest", vi);
    return import("@react-native-async-storage/async-storage/jest/async-storage-mock");
});
vi.mock("expo-core-spotlight", () => ({ __esModule: true, default: {} }));
vi.mock("expo-router", () => ({ useRouter: () => mockRouter }));
vi.mock("expo-notifications", () => ({
    addNotificationResponseReceivedListener: (listener: (response: unknown) => void) => {
        mockTaps.listener = listener;
        return { remove: vi.fn() };
    },
    clearLastNotificationResponse: () => {
        mockTaps.last = null;
    },
    getLastNotificationResponse: () => mockTaps.last,
}));

import { useSubscriptionReminderTaps } from "./use-subscription-reminder-taps";

const tap = (subscription: string, charge: string, date: number) => ({
    actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
    notification: {
        date,
        request: { content: { data: { charge, subscription } }, identifier: `outlayr.sub-due.${subscription}` },
    },
});

const settle = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

async function seed(
    db: Database,
    id: string,
    { deletedAt = null, recurringType = RECURRING_TYPE.none }: { deletedAt?: Date | null; recurringType?: number } = {}
): Promise<void> {
    const now = new Date();
    await db.insert(transactions).values({
        amount: 7.06,
        date: now,
        day: now,
        deletedAt,
        id,
        income: false,
        month: now,
        recurringType,
        updatedAt: now,
    });
}

describe("useSubscriptionReminderTaps", () => {
    let db: Database;

    beforeEach(() => {
        db = migratedDatabase();
        mockNavigate.mockClear();
        mockTaps.last = null;
        mockTaps.listener = null;
    });

    it("opens the subscription from a cold start once, then each later delivery of it", async () => {
        await seed(db, "prime", { recurringType: RECURRING_TYPE.monthly });
        mockTaps.last = tap("prime", "next", 1);

        await renderHook(() => useSubscriptionReminderTaps(db, true));
        mockTaps.listener?.(tap("prime", "next", 1));
        mockTaps.listener?.(tap("prime", "next", 2));
        await settle();

        expect(mockNavigate.mock.calls).toStrictEqual([["/transactions/prime"], ["/transactions/prime"]]);
    });

    it("opens the Log for a notice that folds several charges", async () => {
        await renderHook(() => useSubscriptionReminderTaps(db, true));
        mockTaps.listener?.({
            actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
            notification: {
                date: 5,
                request: { content: { data: { open: "log" } }, identifier: "outlayr.sub-due.digest.1.2" },
            },
        });
        await settle();

        expect(mockNavigate.mock.calls).toStrictEqual([["/"]]);
    });

    it("opens the add sheet from the daily reminder, dated to the day it asked about", async () => {
        await renderHook(() => useSubscriptionReminderTaps(db, true));
        const daily = (data: Record<string, string>, date: number) => ({
            actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
            notification: { date, request: { content: { data }, identifier: "outlayr.daily-reminder.1" } },
        });
        mockTaps.listener?.(daily({ date: "1760500000000", open: "create" }, 6));
        await settle();
        mockTaps.listener?.(daily({ open: "create" }, 7));
        await settle();

        expect(mockNavigate.mock.calls).toStrictEqual([
            ["/transactions/create?date=1760500000000"],
            ["/transactions/create"],
        ]);
    });

    it("opens the charge the notice announced once it has landed, not last cycle's", async () => {
        await seed(db, "prime");
        await seed(db, "landed", { recurringType: RECURRING_TYPE.monthly });

        await renderHook(() => useSubscriptionReminderTaps(db, true));
        mockTaps.listener?.(tap("prime", "landed", 3));
        await settle();

        expect(mockNavigate.mock.calls).toStrictEqual([["/transactions/landed"]]);
    });

    it("lands the charge a tap announces before the sweep has, and opens it", async () => {
        const lastCharge = addDays(new Date(), -1);
        await db.insert(transactions).values({
            amount: 7.06,
            date: lastCharge,
            day: lastCharge,
            id: "prime",
            income: false,
            month: lastCharge,
            onceRecurring: true,
            recurringType: RECURRING_TYPE.daily,
            reminderLeadDays: 0,
            updatedAt: lastCharge,
        });
        const charge = occurrenceId("prime", addDays(lastCharge, 1));

        await renderHook(() => useSubscriptionReminderTaps(db, true));
        mockTaps.listener?.(tap("prime", charge, 4));
        await settle();

        expect(mockNavigate.mock.calls).toStrictEqual([[`/transactions/${charge}`]]);
    });

    it("stays put when neither the charge nor a live subscription is left", async () => {
        await seed(db, "retired");
        await seed(db, "deleted", { deletedAt: new Date(), recurringType: RECURRING_TYPE.monthly });
        await seed(db, "voided", { deletedAt: new Date() });

        await renderHook(() => useSubscriptionReminderTaps(db, true));
        mockTaps.listener?.(tap("retired", "missing", 3));
        mockTaps.listener?.(tap("deleted", "voided", 4));
        mockTaps.listener?.(tap("missing", "missing", 5));
        await settle();

        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
