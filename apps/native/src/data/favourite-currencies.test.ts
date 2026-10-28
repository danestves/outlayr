import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { readFavourites, toggleFavouriteCurrency } from "./favourite-currencies-core";

const makeDb = migratedDatabase;

describe("favourite currencies storage", () => {
    let db: Database;

    beforeEach(() => {
        db = makeDb();
    });

    it("adds a code and persists it", async () => {
        await expect(Effect.runPromise(toggleFavouriteCurrency(db, "EUR"))).resolves.toStrictEqual(["EUR"]);
        await expect(Effect.runPromise(readFavourites(db))).resolves.toStrictEqual(["EUR"]);
    });

    it("keeps both stars when two taps land before the first write", async () => {
        // Dispatched like onPress, neither awaited, so without serialising both read the same empty list.
        const [first, second] = await Promise.all([
            Effect.runPromise(toggleFavouriteCurrency(db, "EUR")),
            Effect.runPromise(toggleFavouriteCurrency(db, "JPY")),
        ]);
        expect(first).toStrictEqual(["EUR"]);
        expect(second).toStrictEqual(["EUR", "JPY"]);
        await expect(Effect.runPromise(readFavourites(db))).resolves.toStrictEqual(["EUR", "JPY"]);
    });

    it("keeps taking toggles after one of them fails", async () => {
        const broken = {
            select() {
                throw new Error("read failed");
            },
        } as unknown as Parameters<typeof toggleFavouriteCurrency>[0];
        await expect(Effect.runPromise(toggleFavouriteCurrency(broken, "EUR"))).rejects.toThrow();
        await expect(Effect.runPromise(toggleFavouriteCurrency(db, "GBP"))).resolves.toStrictEqual(["GBP"]);
    });

    it("hides a retired code on read and leaves it stored until a toggle", async () => {
        await Effect.runPromise(setMeta(db, META_KEYS.favouriteCurrencies, "EUR,XXX,GBP"));
        await expect(Effect.runPromise(readFavourites(db))).resolves.toStrictEqual(["EUR", "GBP"]);
        await expect(Effect.runPromise(getMeta(db, META_KEYS.favouriteCurrencies))).resolves.toBe("EUR,XXX,GBP");

        await expect(Effect.runPromise(toggleFavouriteCurrency(db, "JPY"))).resolves.toStrictEqual([
            "EUR",
            "GBP",
            "JPY",
        ]);
        await expect(Effect.runPromise(getMeta(db, META_KEYS.favouriteCurrencies))).resolves.toBe("EUR,GBP,JPY");
    });
});
