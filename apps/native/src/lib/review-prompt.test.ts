import { startOfDay } from "@outlayr/money/calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Effect from "effect/Effect";
import * as StoreReview from "expo-store-review";
import { AppState } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { getMeta, META_KEYS, setMeta } from "@/data/app-meta-core";
import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { askForReview as ask, askForReviewIfPending as askIfPending } from "./review-prompt";

const askForReview = (db: Database) => Effect.runPromise(ask(db));
const askForReviewIfPending = (db: Database) => Effect.runPromise(askIfPending(db));
const markPending = (db: Database) => Effect.runPromise(setMeta(db, META_KEYS.reviewPending, "1"));
const pending = (db: Database) => Effect.runPromise(getMeta(db, META_KEYS.reviewPending));

vi.mock("@react-native-async-storage/async-storage", async () => {
    vi.stubGlobal("jest", vi);
    return import("@react-native-async-storage/async-storage/jest/async-storage-mock");
});
const capture = vi.hoisted(() => vi.fn());
vi.mock("@/lib/posthog", () => ({ posthog: { capture } }));
vi.mock("expo-store-review", () => ({
    isAvailableAsync: vi.fn(async () => true),
    requestReview: vi.fn(async () => undefined),
}));

const mockStoreReview = vi.mocked(StoreReview);
const ASKED_AT_KEY = "outlayr.review-asked-at";
const DAY_MS = 24 * 60 * 60 * 1000;

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
        capture.mockClear();
    });

    it("asks after five entries written on two different days, and records the ask", async () => {
        await writeEntries(db, [3, 2]);

        await askForReview(db);
        await askForReview(db);

        expect(mockStoreReview.requestReview).toHaveBeenCalledOnce();
        expect(capture).toHaveBeenCalledExactlyOnceWith("review_prompt_requested");
    });

    it("waits 120 days between asks", async () => {
        await writeEntries(db, [3, 2]);

        await AsyncStorage.setItem(ASKED_AT_KEY, String(Date.now() - 119 * DAY_MS));
        await askForReview(db);
        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();

        await AsyncStorage.setItem(ASKED_AT_KEY, String(Date.now() - 121 * DAY_MS));
        await askForReview(db);
        expect(mockStoreReview.requestReview).toHaveBeenCalledOnce();
    });

    it("asks once when two asks land at the same moment", async () => {
        await writeEntries(db, [3, 2]);

        await markPending(db);
        await Promise.all([askForReview(db), askForReviewIfPending(db)]);

        expect(mockStoreReview.requestReview).toHaveBeenCalledOnce();
    });

    it("asks for the auto-logged expense a drain recorded, once, and not again without a new one", async () => {
        await writeEntries(db, [3, 2]);
        await markPending(db);

        await askForReviewIfPending(db);
        await AsyncStorage.removeItem(ASKED_AT_KEY);
        await askForReviewIfPending(db);

        expect(mockStoreReview.requestReview).toHaveBeenCalledOnce();
        await expect(pending(db)).resolves.toBe("0");
    });

    it("spends no ask when the store request fails, so the next entry asks again without looping", async () => {
        await writeEntries(db, [3, 2]);
        await markPending(db);
        mockStoreReview.requestReview.mockRejectedValueOnce(new Error("no window scene"));

        await expect(askForReviewIfPending(db)).rejects.toThrow();

        await expect(pending(db)).resolves.toBe("0");
        await expect(AsyncStorage.getItem(ASKED_AT_KEY)).resolves.toBeNull();
        expect(capture).not.toHaveBeenCalled();

        await markPending(db);
        await askForReviewIfPending(db);

        expect(mockStoreReview.requestReview).toHaveBeenCalledTimes(2);
        expect(capture).toHaveBeenCalledOnce();
    });

    it("does not ask on its own when no drain recorded an auto-logged expense", async () => {
        await writeEntries(db, [3, 2]);

        await askForReviewIfPending(db);

        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
    });

    it("keeps the record for the next time the Log is on screen when the app is in the background", async () => {
        await writeEntries(db, [3, 2]);
        await markPending(db);
        AppState.currentState = "background";

        await askForReviewIfPending(db);

        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
        await expect(pending(db)).resolves.toBe("1");
    });

    it("waits for a second day, which a deleted entry does not supply", async () => {
        await writeEntries(db, [5]);
        await writeEntries(db, [0, 1], new Date(2026, 9, 2, 13));

        await askForReview(db);

        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
    });

    it("waits for a fifth entry", async () => {
        await writeEntries(db, [2, 2]);

        await askForReview(db);

        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
    });

    it("never asks from a background launch", async () => {
        await writeEntries(db, [3, 2]);
        AppState.currentState = "background";

        await askForReview(db);

        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
        await expect(AsyncStorage.getItem(ASKED_AT_KEY)).resolves.toBeNull();
    });

    it("keeps the ask for later where the system prompt is unavailable, as on TestFlight", async () => {
        await writeEntries(db, [3, 2]);
        mockStoreReview.isAvailableAsync.mockResolvedValue(false);

        await askForReview(db);

        expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
        await expect(AsyncStorage.getItem(ASKED_AT_KEY)).resolves.toBeNull();
    });
});
