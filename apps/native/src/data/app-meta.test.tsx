import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
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

import { useGlobalCurrency } from "./app-meta";
import { META_KEYS, setMeta } from "./app-meta-core";

async function announceMetaWrite(): Promise<void> {
    for (const listener of mockListeners) {
        listener({ tableName: "appMeta" });
    }
    // Change events reach live reads on the next tick, coalesced.
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

describe("useGlobalCurrency", () => {
    let db: Database;

    beforeEach(async () => {
        mockListeners.clear();
        db = migratedDatabase({ foreignKeys: false });
        await Effect.runPromise(setMeta(db, META_KEYS.currency, "EUR"));
    });

    it("does not re-render its callers when an unrelated setting is written", async () => {
        let renders = 0;
        const { result } = await renderHook(() => {
            renders += 1;
            return useGlobalCurrency(db);
        });
        const before = renders;

        await Effect.runPromise(setMeta(db, META_KEYS.syncedAt, "1700000000000"));
        await act(async () => {
            await announceMetaWrite();
        });

        expect(renders).toBe(before);
        expect(result.current).toBe("EUR");
    });

    it("still follows its own key", async () => {
        const { result } = await renderHook(() => useGlobalCurrency(db));

        await Effect.runPromise(setMeta(db, META_KEYS.currency, "JPY"));
        await act(async () => {
            await announceMetaWrite();
        });

        expect(result.current).toBe("JPY");
    });
});
