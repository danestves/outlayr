import { startOfDay } from "@outlayr/money/calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Effect from "effect/Effect";
import * as StoreReview from "expo-store-review";
import { AppState } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { APP_VERSION } from "./app-version";
import { askForReview as ask } from "./review-prompt";

const askForReview = (db: Database) => Effect.runPromise(ask(db));

vi.mock("@react-native-async-storage/async-storage", async () => {
    vi.stubGlobal("jest", vi);
    return import("@react-native-async-storage/async-storage/jest/async-storage-mock");
});
vi.mock("expo-store-review", () => ({
    isAvailableAsync: vi.fn(async () => true),
    requestReview: vi.fn(async () => undefined),
}));

const mockStoreReview = vi.mocked(StoreReview);
const ASKED_VERSION_KEY = "outlayr.review-asked-version";

async function writeEntries(db: Database, perDay: number[], deletedAt: Date | null = null): Promise<void> {
    const rows = perDay.flatMap((entries, offset) =>
        Array.from({ length: entries }, (_, index) => {
            const at = new Date(2026, 9, offset + 1, 12);
            return {
                amount: 4.5,
                date: at,
                day: startOfDay(at),
                deletedAt,
                id: `${deletedAt ? "gone" : "live"}-${offset}-${index}`,
                income: false,
                month: new Date(2026, 9, 1),
                note: "Coffee",
                updatedAt: at,
            };
        })
    );
    await db.insert(transactions).values(rows);
}

describe("askForReview", () => {
    let db: Database;

    beforeEach(async () => {
        db = migratedDatabase();
        await AsyncStorage.clear();
        AppState.currentState = "active";
        mockStoreReview.isAvailableAsync.mockResolvedValue(true);
        mockStoreReview.requestReview.mockClear();
    });

    it("asks once per app version after ten entries written on three different days", async () => {
        await writeEntries(db, [4, 3, 3]);

        await askForReview(db);
        await askForReview(db);

        expect(mockStoreReview.requestReview).toHaveBeenCalledOnce();
        await expect(AsyncStorage.getItem(ASKED_VERSION_KEY)).resolves.toBe(APP_VERSION);

        await AsyncStorage.setItem(ASKED_VERSION_KEY, "0.9.0");
        await askForReview(db);

        expect(mockStoreReview.requestReview).toHaveBeenCalledTimes(2);
    });

    it("waits for a third day, which a deleted entry does not supply", async () => {
        await writeEntries(db, [5, 5]);
        await writeEntries(db, [0, 0, 1], new Date(2026, 9, 3, 13));

        await askForReview(db);

        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
    });

    it("waits for a tenth entry", async () => {
        await writeEntries(db, [3, 3, 3]);

        await askForReview(db);

        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
    });

    it("never asks from a background launch", async () => {
        await writeEntries(db, [4, 3, 3]);
        AppState.currentState = "background";

        await askForReview(db);

        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
        await expect(AsyncStorage.getItem(ASKED_VERSION_KEY)).resolves.toBeNull();
    });

    it("keeps the version for later where the system prompt is unavailable, as on TestFlight", async () => {
        await writeEntries(db, [4, 3, 3]);
        mockStoreReview.isAvailableAsync.mockResolvedValue(false);

        await askForReview(db);

        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
        await expect(AsyncStorage.getItem(ASKED_VERSION_KEY)).resolves.toBeNull();
    });
});
