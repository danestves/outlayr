import BetterSqlite3 from "better-sqlite3";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { describe, expect, it, vi } from "vite-plus/test";

import { localDataAtom, localDataState } from "@/contexts/local-data-context";
import { getMeta, META_KEYS } from "@/data/app-meta-core";
import * as LocalDatabase from "@/data/local-database";
import type { Database } from "@/db/client";
import { testDatabase, withAsyncTransactions } from "@/db/test-database";
import { appRuntime } from "@/lib/runtime";

vi.mock("expo-localization", () => ({ getLocales: () => [] }));
vi.mock("@/lib/active-profile", () => ({ activeProfileId: () => undefined }));

function emptyDatabase(): Database {
    const sqlite = new BetterSqlite3(":memory:");
    withAsyncTransactions(sqlite);
    return testDatabase(sqlite);
}

function closedDatabase(): Database {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.close();
    return testDatabase(sqlite);
}

function registryOpening(connections: Database[]): AtomRegistry.AtomRegistry {
    const openConnection = () => {
        const next = connections.shift();
        if (next === undefined) {
            throw new Error("opened more connections than the test planned");
        }
        return next;
    };
    const layer = LocalDatabase.layer.pipe(Layer.provide(Layer.succeed(LocalDatabase.OpenConnection, openConnection)));
    return AtomRegistry.make({ initialValues: [[appRuntime.layer, layer]] });
}

async function settled(registry: AtomRegistry.AtomRegistry) {
    await Effect.runPromiseExit(AtomRegistry.getResult(registry, localDataAtom, { suspendOnWaiting: true }));
    return localDataState(registry.get(localDataAtom));
}

describe("local data", () => {
    it("surfaces the driver's error from a failed step, as the error screen shows it", async () => {
        const driverError = new Error("file is not a database");
        const layer = LocalDatabase.layer.pipe(
            Layer.provide(
                Layer.succeed(LocalDatabase.OpenConnection, () => {
                    throw driverError;
                })
            )
        );
        const state = await settled(AtomRegistry.make({ initialValues: [[appRuntime.layer, layer]] }));

        expect(state.status).toBe("error");
        expect(state.db).toBeNull();
        expect(state.error).toBe(driverError);
    });

    it("retries every step on a fresh connection, not just the one that failed", async () => {
        const fresh = emptyDatabase();
        const registry = registryOpening([closedDatabase(), fresh]);
        await settled(registry);

        registry.refresh(localDataAtom);
        const state = await settled(registry);

        expect(state.status).toBe("ready");
        expect(state.db).toBe(fresh);
        await expect(Effect.runPromise(getMeta(fresh, META_KEYS.firstLaunch))).resolves.toBe("true");
        await expect(Effect.runPromise(getMeta(fresh, META_KEYS.onboardingGateMigrated))).resolves.toBe("true");
    });
});
