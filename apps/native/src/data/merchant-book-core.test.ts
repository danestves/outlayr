import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { migratedDatabase } from "@/db/test-database";

import { BOOK_TTL_MS, MAX_BOOK_ENTRIES, recallMerchant, rememberMerchant } from "./merchant-book-core";
import type { RememberedAnswer } from "./merchant-book-core";

const NOW = Date.UTC(2026, 8, 19);

const AIRBNB: RememberedAnswer = {
    categoryName: "Travel",
    domain: "airbnb.com",
    emoji: null,
    isNewCategory: false,
    merchantName: "Airbnb",
    parentCategoryName: null,
    tags: ["lodging"],
};

describe("the merchant book", () => {
    it("answers another descriptor, and the clean name, for a merchant it has seen", async () => {
        const db = await migratedDatabase();
        await Effect.runPromise(rememberMerchant(db, "AIRBNB * HMASFW2JP2", "EUR", AIRBNB, NOW));

        await expect(Effect.runPromise(recallMerchant(db, "AIRBNB * ZX81KQ7", "EUR", NOW))).resolves.toMatchObject({
            domain: "airbnb.com",
        });
        await expect(Effect.runPromise(recallMerchant(db, "Airbnb", "EUR", NOW))).resolves.toMatchObject({
            categoryName: "Travel",
        });
        await expect(Effect.runPromise(recallMerchant(db, "Airbnb", "USD", NOW))).resolves.toBeNull();
    });

    it("forgets an entry once it expires", async () => {
        const db = await migratedDatabase();
        await Effect.runPromise(rememberMerchant(db, "Airbnb", "EUR", AIRBNB, NOW));

        await expect(Effect.runPromise(recallMerchant(db, "Airbnb", "EUR", NOW + BOOK_TTL_MS + 1))).resolves.toBeNull();
    });

    it("keeps the most recent merchants when it is full", async () => {
        const db = await migratedDatabase();
        await Effect.runPromise(rememberMerchant(db, "Oldest Shop", undefined, AIRBNB, NOW));
        for (let index = 0; index < MAX_BOOK_ENTRIES; index += 1) {
            await Effect.runPromise(
                rememberMerchant(db, `Shop Number ${index}`, undefined, { ...AIRBNB, merchantName: null }, NOW)
            );
        }

        await expect(Effect.runPromise(recallMerchant(db, "Oldest Shop", undefined, NOW))).resolves.toBeNull();
        await expect(
            Effect.runPromise(recallMerchant(db, `Shop Number ${MAX_BOOK_ENTRIES - 1}`, undefined, NOW))
        ).resolves.not.toBeNull();
    });
});
