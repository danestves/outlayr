// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { exchangeRates } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { VALUATION_RATE_TYPE } from "./valuation-source";
import { useValuedCurrencies } from "./valued-currencies";

const NOW = 1_700_000_000_000;

async function seed(db: Database, rateType: string = VALUATION_RATE_TYPE): Promise<void> {
    await db.insert(exchangeRates).values(
        ["AED", "EUR", "JPY"].map((quote) => ({
            date: "2026-07-30",
            fetchedAt: NOW,
            quote,
            rate: 3.67,
            rateType,
            source: "frankfurter",
        }))
    );
}

describe("what the Log's currency chip may offer", () => {
    it("answers for the valuation rate type alone", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        await seed(db, "binance");
        const { result } = await renderHook(() => useValuedCurrencies(db));

        expect(result.current.has("AED")).toBe(false);
    });

    it("leaves USD out, because it is the canonical side rather than a row", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        await seed(db);
        const { result } = await renderHook(() => useValuedCurrencies(db));

        expect(result.current.has("USD")).toBe(false);
        expect([...result.current].sort()).toStrictEqual(["AED", "EUR", "JPY"]);
    });
});
