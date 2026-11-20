import { describe, expect, it } from "vite-plus/test";

import { matchedBy, ruleFromPicks, selectionSeedOf, textSeedOf } from "./rule-from-selection";
import type { SelectionSeed } from "./rule-from-selection";
import type { RuleEntry } from "./rules";

const KINDS = new Map([
    ["groceries", false],
    ["shopping", false],
    ["salary", true],
]);

const entry = (id: string, note: string, extra: Partial<RuleEntry> = {}): RuleEntry => ({
    amount: 20,
    at: 1000,
    categoryId: null,
    currency: "USD",
    day: "2026-10-01",
    details: "",
    id,
    imageKey: null,
    income: false,
    note,
    tagIds: new Set(),
    worth: -20,
    ...extra,
});

const picked = (entries: readonly RuleEntry[], accountId: string | null = "chase") =>
    entries.map((row) => ({ accountId, id: row.id }));

const preChecked = (seed: SelectionSeed) =>
    ruleFromPicks(
        {
            categoryId: seed.category?.shared ? seed.category.value : null,
            conditions: [seed.merchant, seed.description].flatMap((text) => (text?.shared ? [text] : [])),
            name: "From selection",
            tagIds: seed.tags.flatMap((tag) => (tag.shared ? [tag.value] : [])),
        },
        "r1"
    );

describe("textSeedOf", () => {
    it("treats the same merchant in another case as shared", () => {
        expect(textSeedOf("merchant", ["Costco", " COSTCO ", "costco"])).toEqual({
            field: "merchant",
            op: "is",
            shared: true,
            value: "Costco",
        });
    });

    it("falls back to a shared prefix, trimmed to its last letter or digit", () => {
        expect(textSeedOf("merchant", ["AMZN Mktp US*1A2B", "AMZN Mktp US*9Z8Y"])).toMatchObject({
            op: "startsWith",
            shared: true,
            value: "AMZN Mktp US",
        });
    });

    it("leaves different merchants unchecked, offering the most common one", () => {
        expect(textSeedOf("merchant", ["Uber", "Lyft", "uber", "Ab"])).toMatchObject({
            op: "is",
            shared: false,
            value: "Uber",
        });
    });

    it("does not call a prefix shared when one entry has no text", () => {
        expect(textSeedOf("description", ["Weekly shop", ""])?.shared).toBe(false);
    });
});

describe("selectionSeedOf", () => {
    it("pre-checks only what every selected entry has", () => {
        const entries = [
            entry("a", "Costco", { categoryId: "groceries", tagIds: new Set(["bulk", "home"]) }),
            entry("b", "Costco", { categoryId: "groceries", tagIds: new Set(["bulk"]) }),
            entry("c", "Costco", { categoryId: "shopping", tagIds: new Set(["bulk"]) }),
        ];
        const seed = selectionSeedOf(entries, picked(entries), KINDS);
        expect(seed.category).toEqual({ shared: false, value: "groceries" });
        expect(seed.tags).toEqual([
            { shared: true, value: "bulk" },
            { shared: false, value: "home" },
        ]);
        expect(seed.merchant?.shared).toBe(true);
    });

    it("counts selected rows rules cannot see as skipped, and reads the account only from the rest", () => {
        const entries = [entry("a", "Uber"), entry("b", "Uber")];
        const selected = [...picked(entries), { accountId: "cash", id: "transfer-1" }];
        const seed = selectionSeedOf(entries, selected, KINDS);
        expect(seed.covered).toHaveLength(2);
        expect(seed.skipped).toBe(1);
        expect(seed.accountId).toBe("chase");
    });

    it("has no shared account when the entries sit on two", () => {
        const entries = [entry("a", "Uber"), entry("b", "Uber")];
        const selected = [
            { accountId: "chase", id: "a" },
            { accountId: "amex", id: "b" },
        ];
        expect(selectionSeedOf(entries, selected, KINDS).accountId).toBeNull();
    });

    it("drops a category that was deleted", () => {
        const entries = [entry("a", "Uber", { categoryId: "gone" }), entry("b", "Uber", { categoryId: "gone" })];
        expect(selectionSeedOf(entries, picked(entries), KINDS).category).toBeNull();
    });

    it("keeps the description unchecked when the merchant already matches", () => {
        const entries = [entry("a", "Uber", { details: "Ride" }), entry("b", "Uber", { details: "Ride" })];
        const seed = selectionSeedOf(entries, picked(entries), KINDS);
        expect(seed.description).toMatchObject({ shared: false, value: "Ride" });
    });

    it("pre-checks the description when there is no merchant", () => {
        const entries = [entry("a", "", { details: "Card 4412" }), entry("b", "", { details: "card 4412" })];
        const seed = selectionSeedOf(entries, picked(entries), KINDS);
        expect(seed.merchant).toBeNull();
        expect(seed.description?.shared).toBe(true);
    });

    it("builds a pre-checked rule that matches every entry it was built from", () => {
        const expenses = [
            entry("a", "AMZN Mktp US*1A", { categoryId: "shopping" }),
            entry("b", "amzn mktp us*2B", { categoryId: "shopping" }),
        ];
        const income = [
            entry("c", "Acme payroll", { categoryId: "salary", income: true }),
            entry("d", "ACME PAYROLL", { categoryId: "salary", income: true }),
        ];
        for (const entries of [expenses, income]) {
            const seed = selectionSeedOf(entries, picked(entries), KINDS);
            expect(matchedBy(preChecked(seed), entries, KINDS)).toBe(entries.length);
        }
    });
});
