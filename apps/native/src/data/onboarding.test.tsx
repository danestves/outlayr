import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";

type ChangeListener = (event: { tableName: string }) => void;

const mockListeners = new Set<ChangeListener>();
jest.mock("expo-sqlite", () => ({
    addDatabaseChangeListener: (listener: ChangeListener) => {
        mockListeners.add(listener);
        return {
            remove: () => {
                mockListeners.delete(listener);
            },
        };
    },
}));

import { META_KEYS, setMeta } from "./app-meta-core";
import { useOnboardingSettled } from "./onboarding";

describe("useOnboardingSettled", () => {
    let db: Database;

    beforeEach(() => {
        mockListeners.clear();
        db = migratedDatabase({ foreignKeys: false });
    });

    it("holds a fresh install in the flow", async () => {
        const { result } = await renderHook(() => useOnboardingSettled(db));

        expect(result.current).toBe(false);
    });

    it("does not let a chosen currency out of the flow on its own", async () => {
        await Effect.runPromise(setMeta(db, META_KEYS.currencyChosen, "true"));

        const { result } = await renderHook(() => useOnboardingSettled(db));

        expect(result.current).toBe(false);
    });

    it("lets a finished run through", async () => {
        await Effect.runPromise(setMeta(db, META_KEYS.onboardingComplete, "true"));

        const { result } = await renderHook(() => useOnboardingSettled(db));

        expect(result.current).toBe(true);
    });
});
