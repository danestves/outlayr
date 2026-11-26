import { describe, expect, it } from "vite-plus/test";

import type { ResolvedReceipt } from "@/domain/receipt-scan";

import { firstEntryHref } from "./first-entry-seed";

const receipt: ResolvedReceipt = {
    accountId: null,
    accountUnresolved: false,
    amount: 12.5,
    categoryId: "food",
    categoryUnresolved: false,
    currency: "USD",
    currencySource: "printed",
    currencyUnresolved: false,
    date: new Date("2026-11-26T12:00:00Z"),
    domain: null,
    income: false,
    items: [],
    merchant: "Corner Café",
    paymentMethod: null,
    pendingCategory: null,
    subtotal: null,
    tax: null,
    tip: null,
};

const seedOf = (draft: ResolvedReceipt, currency: string) => {
    const href = firstEntryHref(draft, currency);
    return typeof href === "string" ? {} : href.params;
};

describe("firstEntryHref", () => {
    it("carries the amount when the receipt is in the ledger currency", () => {
        expect(seedOf(receipt, "USD")).toStrictEqual({ amount: "12.5", categoryId: "food", merchant: "Corner Café" });
    });

    it("drops an amount the typed step would save in the wrong currency", () => {
        expect(seedOf({ ...receipt, currency: "EUR" }, "USD")).not.toHaveProperty("amount");
        expect(seedOf({ ...receipt, currencyUnresolved: true }, "USD")).not.toHaveProperty("amount");
    });

    it("leaves an income receipt out of the expense-only typed step", () => {
        expect(seedOf({ ...receipt, income: true }, "USD")).toStrictEqual({});
    });
});
