import { describe, expect, it } from "vite-plus/test";

import { firstEntryCategory } from "./first-entry-category";

const seeded = ["Groceries", "Dining Out", "Transport", "Fuel", "Rent"].map((preset) => ({ preset }));

describe("firstEntryCategory", () => {
    it("follows the hour across each window edge", () => {
        expect(firstEntryCategory(seeded, 4)?.preset).toBe("Transport");
        expect(firstEntryCategory(seeded, 5)?.preset).toBe("Dining Out");
        expect(firstEntryCategory(seeded, 15)?.preset).toBe("Groceries");
        expect(firstEntryCategory(seeded, 18)?.preset).toBe("Dining Out");
        expect(firstEntryCategory(seeded, 23)?.preset).toBe("Transport");
    });

    it("prefers Coffee in the morning only when the ledger has it", () => {
        expect(firstEntryCategory([...seeded, { preset: "Coffee" }], 8)?.preset).toBe("Coffee");
    });

    it("falls back to the first category when no preferred preset is left", () => {
        const renamed = [{ preset: null }, { preset: "Rent" }];
        expect(firstEntryCategory(renamed, 12)).toBe(renamed[0]);
        expect(firstEntryCategory([], 12)).toBeNull();
    });
});
