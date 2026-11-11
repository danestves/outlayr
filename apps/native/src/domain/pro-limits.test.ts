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

    it("lets a second currency in, and blocks a third", () => {
        expect(blocksNewCurrency(bank("VES"), [bank("USD")], true)).toBe(false);
        expect(blocksNewCurrency(bank("EUR"), [bank("USD"), bank("VES")], true)).toBe(true);
    });

    it("never blocks a currency the ledger already holds", () => {
        expect(blocksNewCurrency(bank("USD"), [bank("USD"), bank("VES"), bank("EUR")], true)).toBe(false);
    });

    it("blocks nothing while Pro is unlocked or unsellable", () => {
        expect(blocksNewCurrency(bank("EUR"), [bank("USD"), bank("VES")], false)).toBe(false);
    });

    it("lets a curated installment app bill in a currency past the cap", () => {
        expect(blocksNewCurrency(cashea, [bank("VES"), bank("EUR")], true)).toBe(false);
    });

    it("never lets a curated installment app claim a free currency", () => {
        expect(blocksNewCurrency(bank("EUR"), [cashea, bank("VES")], true)).toBe(false);
        expect(blocksNewCurrency(bank("EUR"), [cashea, bank("VES"), bank("COP")], true)).toBe(true);
    });

    it("never blocks a person's currency, nor lets a person claim one", () => {
        const pedro = { currency: "USD", kind: "person", name: "Pedro" };
        expect(blocksNewCurrency(pedro, [bank("VES"), bank("EUR")], true)).toBe(false);
        expect(blocksNewCurrency(bank("EUR"), [pedro, bank("VES")], true)).toBe(false);
    });

    it("counts a card's currency, and an asset named after an app", () => {
        const visa = { currency: "USD", kind: "liability", name: "Visa" };
        expect(blocksNewCurrency(bank("VES"), [visa, bank("EUR")], true)).toBe(true);
        expect(blocksNewCurrency(bank("VES"), [bank("USD", "Cashea"), bank("EUR")], true)).toBe(true);
    });
});

describe("fullAccountCaps", () => {
    const app = (name: string) => ({ kind: "liability", name });

    it("blocks a third installment app on a free ledger", () => {
        expect(fullAccountCaps([app("Cashea")], true).installmentApps).toBe(false);
        expect(fullAccountCaps([app("Cashea"), app("Krece")], true).installmentApps).toBe(true);
    });

    it("keeps installment apps out of the three free accounts", () => {
        expect(fullAccountCaps([app("Cashea"), app("Krece"), bank("VES"), bank("USD")], true).accounts).toBe(false);
        expect(fullAccountCaps([bank("VES"), bank("USD"), app("Visa")], true)).toStrictEqual({
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
    [
        { kind: "asset", name: "Checking" },
        { kind: "asset", name: "Cash" },
        visa,
        cashea,
        { kind: "liability", name: "Klarna" },
    ],
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
    const euros = { currency: "EUR", kind: "asset", name: "Euros" };
    const pounds = { currency: "GBP", kind: "asset", name: "Pounds" };

    it("claims the currency of an installment app renamed into a plain account", () => {
        const casheaVes = { ...cashea, currency: "VES" };
        expect(blocksSavedCurrency({ ...visa, currency: "VES" }, casheaVes, [checking, euros], true)).toBe(true);
    });

    it("lets a plain account keep its currency on a ledger already over the cap", () => {
        const savings = { currency: "VES", kind: "asset", name: "Savings" };
        expect(blocksSavedCurrency({ ...savings, name: "Ahorros" }, savings, [checking, euros, pounds], true)).toBe(
            false
        );
    });
});
