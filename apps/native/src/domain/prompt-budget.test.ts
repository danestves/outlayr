import { describe, expect, it } from "vite-plus/test";

import { boundedPromptNames } from "./prompt-budget";

const names = (count: number, prefix: string) => Array.from({ length: count }, (_, index) => `${prefix} ${index}`);

describe("boundedPromptNames", () => {
    it("passes a ledger inside the budget through untouched", () => {
        const input = { accounts: ["Visa", "Cash"], categoryTree: [{ children: ["Coffee"], name: "Food" }] };
        expect(boundedPromptNames(input)).toStrictEqual({ ...input, accountsOmitted: false, categoriesOmitted: false });
    });

    it("drops overlong names and caps accounts, branches and children", () => {
        const long = "x".repeat(81);
        const bounded = boundedPromptNames({
            accounts: [long, ...names(60, "Account")],
            categoryTree: [
                { children: [long, ...names(60, "Child")], name: "Parent" },
                { children: [], name: long },
            ],
        });
        expect(bounded.accounts).toHaveLength(50);
        expect(bounded.accounts[0]).toBe("Account 0");
        expect(bounded.accountsOmitted).toBeTruthy();
        expect(bounded.categoriesOmitted).toBeTruthy();
        expect(bounded.categoryTree).toHaveLength(1);
        expect(bounded.categoryTree[0]?.children).toHaveLength(50);
        expect(bounded.categoryTree[0]?.children[0]).toBe("Child 0");
    });

    it("stops at 400 names in total, accounts counted first", () => {
        const bounded = boundedPromptNames({
            accounts: names(50, "Account"),
            categoryTree: names(200, "Parent").map((name) => ({ children: names(3, name), name })),
        });
        const total =
            bounded.accounts.length + bounded.categoryTree.reduce((sum, branch) => sum + 1 + branch.children.length, 0);
        expect(total).toBe(400);
        expect(bounded.accountsOmitted).toBeFalsy();
        expect(bounded.categoriesOmitted).toBeTruthy();
    });
});
