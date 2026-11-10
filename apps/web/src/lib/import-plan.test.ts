import { describe, expect, it } from "vite-plus/test";

import { planOf } from "./import-plan";
import type { AccountChoice, PlanRow } from "./import-plan";

const row = (index: number, patch: Partial<PlanRow>): PlanRow => ({
    amount: 10,
    at: 1,
    category: { kind: "none" },
    currency: "USD",
    fileAccount: null,
    income: false,
    index,
    label: `row ${index}`,
    name: `row ${index}`,
    ...patch,
});

const counter = () => {
    let next = 0;
    return () => {
        next += 1;
        return `id-${next}`;
    };
};

describe("planOf", () => {
    it("makes one category per name and side, whatever the casing", () => {
        const { plan } = planOf({
            accounts: new Map(),
            intoAccountId: "cash",
            newId: counter(),
            rows: [
                row(0, { category: { kind: "new", name: "Groceries" } }),
                row(1, { category: { kind: "new", name: "groceries" } }),
                row(2, { category: { kind: "new", name: "Groceries" }, income: true }),
            ],
        });

        expect(plan.categories.map(({ income, name }) => ({ income, name }))).toStrictEqual([
            { income: false, name: "Groceries" },
            { income: true, name: "Groceries" },
        ]);
        expect(plan.entries[0]?.categoryId).toBe(plan.entries[1]?.categoryId);
    });

    it("makes one account per account-column value and drops rows on a skipped one", () => {
        const accounts = new Map<string, AccountChoice>([
            ["Visa", { kind: "new", type: "card" }],
            ["Old", { kind: "skip" }],
            ["Chase", { id: "chase", kind: "existing" }],
        ]);
        const { entryOf, plan } = planOf({
            accounts,
            intoAccountId: "cash",
            newId: counter(),
            rows: [
                row(0, { fileAccount: "Visa" }),
                row(1, { fileAccount: "Visa" }),
                row(2, { fileAccount: "Old" }),
                row(3, { fileAccount: "Chase" }),
                row(4, {}),
            ],
        });

        expect(plan.accounts).toHaveLength(1);
        const [visa] = plan.accounts;
        expect(plan.entries.map((entry) => entry.accountId)).toStrictEqual([visa?.id, visa?.id, "chase", "cash"]);
        expect(entryOf.has(2)).toBe(false);
    });
});
