import { describe, expect, it } from "vite-plus/test";

import type { StripeAccount, StripeTransaction } from "./api";
import { toBankAccount, toBankTransaction } from "./transform";

const ACCOUNT: StripeAccount = {
    category: "cash",
    display_name: "Everyday Checking",
    id: "fca_1",
    institution_name: "Test Bank",
    last4: "4242",
    status: "active",
    transaction_refresh: { id: "trr_1", status: "succeeded" },
};

const TRANSACTION: StripeTransaction = {
    account: "fca_1",
    amount: -1000,
    currency: "usd",
    description: "COFFEE SHOP",
    id: "fctxn_1",
    status: "posted",
    transacted_at: 1_800_000_000,
};

describe("toBankTransaction", () => {
    it("keeps money leaving the account negative and money arriving positive", () => {
        expect(toBankTransaction(TRANSACTION).amountMinor).toBe(-1000);
        expect(toBankTransaction({ ...TRANSACTION, amount: 250_000 }).amountMinor).toBe(250_000);
    });

    it("uppercases the currency and moves seconds to milliseconds", () => {
        const transaction = toBankTransaction(TRANSACTION);
        expect(transaction.currency).toBe("USD");
        expect(transaction.transactedAt).toBe(1_800_000_000_000);
    });
});

describe("toBankAccount", () => {
    it("maps an inactive account to relink", () => {
        expect(toBankAccount({ ...ACCOUNT, status: "inactive" }).status).toBe("relink");
    });

    it("falls back to the institution name when the account has no display name", () => {
        expect(toBankAccount({ ...ACCOUNT, display_name: null }).name).toBe("Test Bank");
    });
});
