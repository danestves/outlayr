import { describe, expect, it } from "vite-plus/test";

import { blocksNewBudget, blocksNewCurrency, blocksSavedCurrency, fillsFullCap, fullAccountCaps } from "./pro-limits";

describe("blocksNewBudget", () => {
    it("blocks a category that has no budget yet once the cap is reached", () => {
        expect(blocksNewBudget("groceries", ["rent", "transport"], true)).toBe(true);
    });

    it("never blocks editing a budget that already exists", () => {
        expect(blocksNewBudget("rent", ["rent", "transport"], true)).toBe(false);
    });

    it("never blocks the overall budget, which is a singleton rather than a slot", () => {
        expect(blocksNewBudget(null, ["rent", "transport"], true)).toBe(false);
    });

    it("blocks nothing while the caller is under the cap", () => {
        expect(blocksNewBudget("groceries", ["rent"], false)).toBe(false);
    });
});

const bank = (currency: string, name = "Banesco") => ({ currency, kind: "asset", name });
const cashea = { currency: "USD", kind: "liability", name: "Cashea" };

describe("blocksNewCurrency", () => {
    it("lets the first account pick anything", () => {
        expect(blocksNewCurrency(bank("VES"), [], true)).toBe(false);
    });

    it("blocks a second currency once one is in use", () => {
        expect(blocksNewCurrency(bank("VES"), [bank("USD")], true)).toBe(true);
    });

    it("never blocks a currency the ledger already holds", () => {
        expect(blocksNewCurrency(bank("USD"), [bank("USD"), bank("VES")], true)).toBe(false);
    });

    it("blocks nothing while Pro is unlocked or unsellable", () => {
        expect(blocksNewCurrency(bank("VES"), [bank("USD")], false)).toBe(false);
    });

    it("lets a curated installment app bill in a second currency", () => {
        expect(blocksNewCurrency(cashea, [bank("VES")], true)).toBe(false);
    });

    it("never lets a curated installment app claim the free currency", () => {
        expect(blocksNewCurrency(bank("VES"), [cashea], true)).toBe(false);
        expect(blocksNewCurrency(bank("EUR"), [cashea, bank("VES")], true)).toBe(true);
    });

    it("never blocks a person's currency, nor lets a person claim one", () => {
        const pedro = { currency: "USD", kind: "person", name: "Pedro" };
        expect(blocksNewCurrency(pedro, [bank("VES")], true)).toBe(false);
        expect(blocksNewCurrency(bank("VES"), [pedro], true)).toBe(false);
    });

    it("counts a card's currency, and an asset named after an app", () => {
        const visa = { currency: "USD", kind: "liability", name: "Visa" };
        expect(blocksNewCurrency(bank("VES"), [visa], true)).toBe(true);
        expect(blocksNewCurrency(bank("VES"), [bank("USD", "Cashea")], true)).toBe(true);
    });
});

describe("fullAccountCaps", () => {
    const app = (name: string) => ({ kind: "liability", name });

    it("blocks a third installment app on a free ledger", () => {
        expect(fullAccountCaps([app("Cashea")], true).installmentApps).toBe(false);
        expect(fullAccountCaps([app("Cashea"), app("Krece")], true).installmentApps).toBe(true);
    });

    it("keeps installment apps out of the two free accounts", () => {
        expect(fullAccountCaps([app("Cashea"), app("Krece"), bank("VES")], true).accounts).toBe(false);
        expect(fullAccountCaps([bank("VES"), app("Visa")], true)).toStrictEqual({
            accounts: true,
            installmentApps: false,
        });
    });

    it("blocks nothing while Pro is unlocked or unsellable", () => {
        expect(fullAccountCaps([bank("VES"), bank("USD"), app("Cashea"), app("Krece")], false)).toStrictEqual({
            accounts: false,
            installmentApps: false,
        });
    });
});

const visa = { kind: "liability", name: "Visa" };
const bothFull = fullAccountCaps(
    [{ kind: "asset", name: "Checking" }, visa, cashea, { kind: "liability", name: "Klarna" }],
    true
);

describe("saving an account on a free ledger with both caps full", () => {
    it("caps an edit that moves an account from one cap to the other", () => {
        expect(fillsFullCap(bothFull, visa, cashea)).toBe(true);
        expect(fillsFullCap(bothFull, cashea, visa)).toBe(true);
    });

    it("lets an edit that stays in its cap through", () => {
        expect(fillsFullCap(bothFull, { kind: "liability", name: "Mastercard" }, visa)).toBe(false);
        expect(fillsFullCap(bothFull, { kind: "liability", name: "Klarna" }, cashea)).toBe(false);
    });
});

describe("saving an account's currency on a free ledger", () => {
    const checking = { currency: "USD", kind: "asset", name: "Checking" };

    it("claims the currency of an installment app renamed into a plain account", () => {
        const casheaVes = { ...cashea, currency: "VES" };
        expect(blocksSavedCurrency({ ...visa, currency: "VES" }, casheaVes, [checking], true)).toBe(true);
    });

    it("lets a plain account keep its currency on a ledger already over the cap", () => {
        const savings = { currency: "VES", kind: "asset", name: "Savings" };
        expect(blocksSavedCurrency({ ...savings, name: "Ahorros" }, savings, [checking], true)).toBe(false);
    });
});
