import { describe, expect, it } from "vite-plus/test";

import { BLANK, CASTS, CATEGORIES, initialState, press, reduce } from "./sentence-model";
import type { Key, State } from "./sentence-model";

const typed = (keys: readonly Key[]) => keys.reduce(press, "");

describe("press", () => {
    it.each([
        { amount: "42", keys: ["4", "2"] },
        { amount: "0.", keys: ["."] },
        { amount: "7", keys: ["0", "7"] },
        { amount: "3.99", keys: ["3", ".", "9", "9", "9"] },
        { amount: "1.5", keys: ["1", ".", ".", "5"] },
        { amount: "1234567", keys: ["1", "2", "3", "4", "5", "6", "7", "8"] },
        { amount: "4", keys: ["4", "2", "back"] },
        { amount: "", keys: ["back"] },
    ] satisfies { amount: string; keys: Key[] }[])("$keys -> $amount", ({ amount, keys }) => {
        expect(typed(keys)).toBe(amount);
    });
});

describe("reduce", () => {
    const INITIAL = initialState("en");
    const visit = (state: State, keys: readonly Key[]) =>
        keys.reduce((next, key) => reduce(next, { key, type: "key" }), state);

    it("files a whole draft on the footer press and clears the form", () => {
        const draft = { ...BLANK, account: "Cash", amount: "9.5", category: "Coffee", merchant: "Blue Bottle" };
        const next = reduce({ ...INITIAL, draft }, { type: "footer" });
        expect(next.log[0]).toMatchObject({ amount: 9.5, category: "Coffee", merchant: "Blue Bottle" });
        expect(next.log).toHaveLength(INITIAL.log.length);
        expect(next.draft).toBe(BLANK);
    });

    it("moves to the first missing step instead of filing a partial draft", () => {
        const state = visit({ ...INITIAL, draft: BLANK }, ["5"]);
        const next = reduce(state, { type: "footer" });
        expect(next.step).toBe("merchant");
        expect(next.log).toBe(state.log);
    });

    it("suggests the category of a known merchant", () => {
        const next = reduce({ ...INITIAL, draft: BLANK, step: "merchant" }, { type: "name", value: "Costco" });
        expect(next.draft.category).toBe("Groceries");
    });
});

describe.each(["en", "es"] as const)("the %s autoplay", (locale) => {
    it("picks only options the stage shows and files each entry as scripted", () => {
        const { accounts, entries, recentMerchants } = CASTS[locale];
        for (const entry of entries) {
            expect(accounts).toContain(entry.account);
            expect(recentMerchants[entry.kind]).toContain(entry.merchant);
            expect(CATEGORIES[entry.kind]).toContain(entry.category);
        }
        let state = initialState(locale);
        const filed = [];
        for (let tick = 0; tick < 1000 && filed.length < entries.length; tick += 1) {
            const next = reduce(state, { type: "auto" });
            if (next.nextId > state.nextId) {
                filed.push(next.log[0]);
            }
            state = next;
        }
        expect(filed).toStrictEqual(
            entries.map((entry) =>
                expect.objectContaining({
                    category: entry.category,
                    currency: entry.currency,
                    income: entry.kind === "income",
                    merchant: entry.merchant,
                })
            )
        );
    });
});
