import { describe, expect, it, vi } from "vite-plus/test";

import { applyNumpadKey, numpadToNumber } from "@/domain/numpad";

import { entrySeed } from "./new";

vi.mock("expo-router", () => ({}));
vi.mock("@/contexts/local-data-context", () => ({}));
vi.mock("@/data/transactions-core", () => ({}));
vi.mock("@/i18n/context", () => ({}));
vi.mock("@/hooks/use-discard-guard", () => ({}));
vi.mock("@/components/close-toolbar", () => ({}));
vi.mock("@/components/transaction-form", () => ({}));

describe("entrySeed", () => {
    it("keeps what a sound link states", () => {
        expect(
            entrySeed({
                amount: "12.5",
                currency: "EUR",
                date: "1790000000000",
                recurringCoefficient: "2",
                recurringType: "3",
            })
        ).toMatchObject({
            amount: 12.5,
            currency: "EUR",
            date: new Date(1_790_000_000_000),
            recurrence: { coefficient: 2, type: 3 },
        });
    });

    it.each([
        ["amount", "-5"],
        ["amount", "0"],
        ["amount", "1e21"],
        ["amount", "0x10"],
        ["attachment", "../SQLite/outlayr.db"],
        ["currency", "DOGE"],
        ["date", "99999999999999999999"],
        ["recurringType", "9"],
        ["recurringType", "2.5"],
    ])("drops %s=%s", (param, value) => {
        const seed = entrySeed({ recurringCoefficient: "2", [param]: value });

        expect(seed).toStrictEqual(entrySeed({}));
    });

    it("keeps no amount longer than the numpad can type", () => {
        const longest = [..."9".repeat(20)].reduce((entry) => applyNumpadKey(entry, "9", 2, "explicitSeparator"), "");

        expect(entrySeed({ amount: longest }).amount).toBe(numpadToNumber(longest));
        expect(entrySeed({ amount: `${longest}9` }).amount).toBeUndefined();
    });

    it("drops a param the link repeats", () => {
        const repeated = ["a", "b"];

        expect(
            entrySeed({
                accountId: repeated,
                amount: ["5", "6"],
                categoryId: repeated,
                currency: ["EUR", "USD"],
                date: ["1790000000000", "1790000000001"],
                details: repeated,
                note: repeated,
                recurringType: ["3", "2"],
            })
        ).toStrictEqual(entrySeed({}));
    });

    it("counts a multiplier that is not a positive integer as one", () => {
        expect(entrySeed({ recurringCoefficient: "-3", recurringType: "2" }).recurrence).toStrictEqual({
            coefficient: 1,
            type: 2,
        });
    });
});
