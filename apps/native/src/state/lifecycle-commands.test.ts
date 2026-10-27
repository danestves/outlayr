import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import { seedCategories } from "@/data/categories-core";
import { adoptedAccount } from "@/data/ledger-adoption";
import type { AdoptionEngine } from "@/data/ledger-adoption";
import { isSyncEnabled } from "@/data/sync-outbox-core";
import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import { appRuntime } from "@/lib/runtime";

let mockEngine: AdoptionEngine | null = null;
jest.mock("@/lib/adoption-engine", () => ({ adoptionEngine: () => mockEngine }));

import { reconcileAdoptionCommand } from "./lifecycle-commands";

const ACCOUNT = "account-a";

function engineReading(remote: "empty" | "populated") {
    const replaced = jest.fn();
    const engine: AdoptionEngine = {
        accountLedger: () => Effect.succeed(remote),
        discardAccountLedger: () => Effect.void,
        replaceFromAccount: () => Effect.sync(replaced),
    };
    return { engine, replaced };
}

async function reconcile(db: Database) {
    const registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, Layer.empty]] });
    const result = await reconcileAdoptionCommand.run(registry, { accountId: ACCOUNT, db });
    registry.dispose();
    return AsyncResult.isSuccess(result) ? result.value : null;
}

describe("reconcileAdoptionCommand", () => {
    let db: Database;

    beforeEach(async () => {
        db = migratedDatabase();
        await Effect.runPromise(seedCategories(db));
        mockEngine = null;
    });

    it("defers without touching either ledger when no engine can read the account", async () => {
        await expect(reconcile(db)).resolves.toBe("defer");

        await expect(Effect.runPromise(adoptedAccount(db))).resolves.toBeNull();
        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
    });

    it("asks instead of acting when both ledgers hold data", async () => {
        const now = new Date();
        await db.insert(transactions).values({
            amount: 5,
            date: now,
            day: now,
            id: "t1",
            income: false,
            month: now,
            updatedAt: now,
        });
        const { engine, replaced } = engineReading("populated");
        mockEngine = engine;

        await expect(reconcile(db)).resolves.toBe("ask");

        expect(replaced).not.toHaveBeenCalled();
        await expect(Effect.runPromise(adoptedAccount(db))).resolves.toBeNull();
        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(false);
    });

    it("replaces an empty local ledger from the account, then marks the account adopted", async () => {
        const { engine, replaced } = engineReading("populated");
        mockEngine = engine;

        await expect(reconcile(db)).resolves.toBe("settled");

        expect(replaced).toHaveBeenCalledTimes(1);
        await expect(Effect.runPromise(adoptedAccount(db))).resolves.toBe(ACCOUNT);
        await expect(Effect.runPromise(isSyncEnabled(db))).resolves.toBe(true);
    });
});
