// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";

type ChangeListener = (event: { tableName: string }) => void;

const mockListeners = new Set<ChangeListener>();
vi.mock("expo-sqlite", () => ({
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
import { Meta } from "./app-meta-core";

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
        await Effect.runPromise(Meta.set(db, "currency", "EUR"));
    });

    it("does not re-render its callers when an unrelated setting is written", async () => {
        let renders = 0;
        const { result } = renderHook(() => {
            renders += 1;
            return useGlobalCurrency(db);
        });
        await act(async () => {
            await announceMetaWrite();
        });
        const before = renders;

        await Effect.runPromise(Meta.set(db, "syncedAt", 1_700_000_000_000));
        await act(async () => {
            await announceMetaWrite();
        });

        expect(renders).toBe(before);
        expect(result.current).toBe("EUR");
    });

    it("still follows its own key", async () => {
        const { result } = renderHook(() => useGlobalCurrency(db));
        await act(async () => {
            await announceMetaWrite();
        });

        await Effect.runPromise(Meta.set(db, "currency", "JPY"));
        await act(async () => {
            await announceMetaWrite();
        });

        expect(result.current).toBe("JPY");
    });
});
