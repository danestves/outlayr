import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vite-plus/test";

import { migratedDatabase } from "@/db/test-database";

import { Meta } from "./app-meta-core";
import type { MetaName } from "./app-meta-registry";
import { bootstrapLocalData } from "./bootstrap";
import { seedProfileLedger } from "./profiles-core";

vi.mock("expo-localization", () => ({ getLocales: () => [] }));

describe("seedProfileLedger", () => {
    it("opens a new profile past onboarding on its own currency, without Personal's sync state", async () => {
        const personal = migratedDatabase();
        const work = migratedDatabase();
        await Effect.runPromise(
            Effect.gen(function* seed() {
                yield* bootstrapLocalData(personal);
                yield* Meta.set(personal, "onboardingComplete", true);
                yield* Meta.set(personal, "showCents", false);
                yield* Meta.set(personal, "syncCursor", 42);
                yield* Meta.set(personal, "lastTransactionAccount", "personal-account");
                yield* bootstrapLocalData(work);
                yield* seedProfileLedger(personal, work, "EUR");
            })
        );

        const read = <K extends MetaName>(name: K) => Effect.runPromise(Meta.get(work, name));
        const has = (name: MetaName) => Effect.runPromise(Meta.has(work, name));
        await expect(read("onboardingComplete")).resolves.toBe(true);
        await expect(read("showCents")).resolves.toBe(false);
        await expect(read("currency")).resolves.toBe("EUR");
        await expect(read("currencyChosen")).resolves.toBe(true);
        await expect(has("syncCursor")).resolves.toBe(false);
        await expect(has("lastTransactionAccount")).resolves.toBe(false);
    });

    it("opens a profile another phone made past onboarding, leaving its synced settings to the pull", async () => {
        const personal = migratedDatabase();
        const work = migratedDatabase();
        await Effect.runPromise(
            Effect.gen(function* seed() {
                yield* bootstrapLocalData(personal);
                yield* Meta.set(personal, "onboardingComplete", true);
                yield* Meta.set(personal, "showCents", false);
                yield* bootstrapLocalData(work);
                yield* seedProfileLedger(personal, work, undefined);
            })
        );

        const has = (name: MetaName) => Effect.runPromise(Meta.has(work, name));
        await expect(Effect.runPromise(Meta.get(work, "onboardingComplete"))).resolves.toBe(true);
        await expect(has("showCents")).resolves.toBe(false);
        await expect(has("currencyChosen")).resolves.toBe(false);
    });
});
