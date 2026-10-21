import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { eq, sql } from "drizzle-orm";

import { META_KEYS, setMeta } from "@/data/app-meta-core";
import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { freshEntries } from "./fresh-entries";
import { useDailyReminderSync } from "./reminder-sync";
import { PUBLISH_DEBOUNCE_MS } from "./sync-cadence";

type ChangeListener = (event: { rowId: number; tableName: string }) => void;

const mockChangeListeners = new Set<ChangeListener>();
jest.mock("expo-sqlite", () => ({
    addDatabaseChangeListener: (listener: ChangeListener) => {
        mockChangeListeners.add(listener);
        return {
            remove: () => {
                mockChangeListeners.delete(listener);
            },
        };
    },
}));

const mockArm = jest.fn<(db: Database) => Promise<void>>(async () => undefined);
const mockPermission = jest.fn(async () => "undetermined");
jest.mock("./chosen-reminder", () => ({
    armChosenReminder: (db: Database) => mockArm(db),
}));
jest.mock("./reminders", () => ({
    cancelReminders: async () => undefined,
    pendingReminderIds: async () => [],
    reminderPermission: () => mockPermission(),
    scheduleDatedReminder: async () => undefined,
}));
jest.mock("@/lib/use-foreground-sweep", () => ({ useForegroundSweep: () => undefined }));

describe("useDailyReminderSync", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockArm.mockClear();
        mockPermission.mockClear();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("arms the onboarding reminder on the user's own save, not on any write to the ledger", async () => {
        const db = migratedDatabase();
        await renderHook(() => useDailyReminderSync(db));

        await act(async () => {
            for (const listener of mockChangeListeners) {
                listener({ rowId: 1, tableName: "transactions" });
            }
            jest.advanceTimersByTime(PUBLISH_DEBOUNCE_MS);
        });
        expect(mockArm).not.toHaveBeenCalled();

        await act(async () => {
            freshEntries.mark("t1");
            jest.advanceTimersByTime(PUBLISH_DEBOUNCE_MS);
        });
        expect(mockArm).toHaveBeenCalledTimes(1);
    });

    it("reconciles after a setting changes, not after sync bookkeeping", async () => {
        const db = migratedDatabase();
        await renderHook(() => useDailyReminderSync(db));
        const write = async (key: string) => {
            await setMeta(db, key, "true");
            const [row] = await db
                .select({ rowId: sql<number>`rowid` })
                .from(appMeta)
                .where(eq(appMeta.key, key));
            await act(async () => {
                for (const listener of mockChangeListeners) {
                    listener({ rowId: row.rowId, tableName: "appMeta" });
                }
                await jest.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
            });
        };

        await write(META_KEYS.syncedAt);
        await write(META_KEYS.syncCursor);
        expect(mockPermission).not.toHaveBeenCalled();

        await write("showNotifications");
        expect(mockPermission).toHaveBeenCalledTimes(1);
    });

    it("reconciles when the changed row is gone, since it may have been a setting", async () => {
        const db = migratedDatabase();
        await renderHook(() => useDailyReminderSync(db));

        await act(async () => {
            for (const listener of mockChangeListeners) {
                listener({ rowId: 9999, tableName: "appMeta" });
            }
            await jest.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
        });
        expect(mockPermission).toHaveBeenCalledTimes(1);
    });
});
