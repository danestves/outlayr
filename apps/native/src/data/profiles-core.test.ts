import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vite-plus/test";

import { migratedDatabase } from "@/db/test-database";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
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
                yield* setMeta(personal, META_KEYS.onboardingComplete, "true");
                yield* setMeta(personal, "showCents", "0");
                yield* setMeta(personal, META_KEYS.syncCursor, "42");
                yield* setMeta(personal, META_KEYS.lastTransactionAccount, "personal-account");
                yield* bootstrapLocalData(work);
                yield* seedProfileLedger(personal, work, "EUR");
            })
        );

        const read = (key: string) => Effect.runPromise(getMeta(work, key));
        await expect(read(META_KEYS.onboardingComplete)).resolves.toBe("true");
        await expect(read("showCents")).resolves.toBe("0");
        await expect(read(META_KEYS.currency)).resolves.toBe("EUR");
        await expect(read(META_KEYS.currencyChosen)).resolves.toBe("true");
        await expect(read(META_KEYS.syncCursor)).resolves.toBeNull();
        await expect(read(META_KEYS.lastTransactionAccount)).resolves.toBeNull();
    });
});
