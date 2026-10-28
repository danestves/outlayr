import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import {
    finishOnboarding,
    isOnboardingSettled,
    settleLegacyOnboarding,
    shouldSettleLegacyLedger,
} from "./onboarding-core";

const makeDb = migratedDatabase;

describe("finishOnboarding", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("settles the gate it writes", async () => {
        await Effect.runPromise(finishOnboarding(db));
        expect(isOnboardingSettled(await Effect.runPromise(getMeta(db, META_KEYS.onboardingComplete)))).toBe(true);
    });
});

describe("shouldSettleLegacyLedger", () => {
    it("backfills a pre-flow ledger: currency chosen, nothing else written", () => {
        expect(shouldSettleLegacyLedger(null, "true", null)).toBe(true);
    });

    it("leaves a genuinely fresh install alone — there is nothing to backfill", () => {
        expect(shouldSettleLegacyLedger(null, null, null)).toBe(false);
    });

    it("never re-fires once migrated, even if it would otherwise qualify", () => {
        expect(shouldSettleLegacyLedger(null, "true", "true")).toBe(false);
    });
});

describe("settleLegacyOnboarding", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("backfills onboardingComplete for a pre-flow ledger and stamps the marker", async () => {
        await Effect.runPromise(setMeta(db, META_KEYS.currencyChosen, "true"));

        await Effect.runPromise(settleLegacyOnboarding(db));

        await expect(Effect.runPromise(getMeta(db, META_KEYS.onboardingComplete))).resolves.toBe("true");
        await expect(Effect.runPromise(getMeta(db, META_KEYS.onboardingGateMigrated))).resolves.toBe("true");
    });

    it("stamps the marker even when there is nothing to backfill", async () => {
        await Effect.runPromise(settleLegacyOnboarding(db));

        await expect(Effect.runPromise(getMeta(db, META_KEYS.onboardingComplete))).resolves.toBeNull();
        await expect(Effect.runPromise(getMeta(db, META_KEYS.onboardingGateMigrated))).resolves.toBe("true");
    });
});
