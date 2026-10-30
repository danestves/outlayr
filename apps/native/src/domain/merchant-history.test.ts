import { merchantKey } from "@outlayr/money/merchant-key";
import { describe, expect, it } from "vite-plus/test";

import { rememberedCategory } from "./merchant-history";
import type { HistoricalEntry } from "./merchant-history";

function entry(note: string, categoryId: string, day: number): HistoricalEntry {
    return { categoryId, date: Date.UTC(2026, 0, day), note };
}

describe("what the ledger remembers about a merchant", () => {
    it("answers with the category the user has filed it under", () => {
        const entries = [entry("Rio Supermercado", "groceries", 1)];
        expect(rememberedCategory(entries, merchantKey("Rio Supermercado"))).toBe("groceries");
    });

    it("knows nothing about a merchant that was never filed", () => {
        const entries = [entry("Rio Supermercado", "groceries", 1)];
        expect(rememberedCategory(entries, merchantKey("Panaderia La Mejor"))).toBeNull();
    });

    it("lets the majority outvote a single miscategorised entry", () => {
        // The stray row is the newest, so a most-recent rule would return it.
        const entries = [
            entry("Netflix", "entertainment", 1),
            entry("Netflix", "entertainment", 2),
            entry("Netflix", "groceries", 9),
        ];
        expect(rememberedCategory(entries, merchantKey("Netflix"))).toBe("entertainment");
    });

    it("breaks a tie on recency", () => {
        const entries = [entry("Uber", "transport", 1), entry("Uber", "travel", 5)];
        expect(rememberedCategory(entries, merchantKey("Uber"))).toBe("travel");
    });

    it("answers nothing for an empty key rather than matching every blank note", () => {
        expect(rememberedCategory([entry("", "groceries", 1)], "")).toBeNull();
    });
});
