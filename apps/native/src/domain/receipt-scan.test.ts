import { buildRateTable } from "@outlayr/money/valuation";
import { describe, expect, it } from "vite-plus/test";

import {
    conversionOf,
    DETAIL_LINES,
    formatQuantity,
    receiptDetails,
    resolveReceipt,
    savableReceipt,
} from "./receipt-scan";

const NOW = new Date(2026, 8, 5, 14, 30, 0);

const DRAFT = {
    accountName: "visa",
    categoryName: "groceries",
    currency: "EUR",
    currencySource: "printed" as const,
    currencyUnresolved: false,
    date: "2026-09-04",
    domain: "mercadona.es",
    income: false,
    items: [
        { name: "Leche entera 1L", price: 1.9, quantity: 2 },
        { name: "Pan chapata", price: 1.254, quantity: 1 },
    ],
    merchant: "Mercadona",
    paymentMethod: "Visa •••• 4242",
    subtotal: null,
    tax: 1.32,
    tip: null,
    total: 20.556,
};

const CATEGORIES = [
    { id: "cat-groceries", income: false, name: "Groceries" },
    { id: "cat-refund", income: true, name: "Groceries" },
];

const ACCOUNTS = [
    { currency: "USD", id: "acc-visa", name: "Visa" },
    { currency: "USD", id: "acc-cash", name: "Cash" },
];

const resolve = (draft: Parameters<typeof resolveReceipt>[0]["draft"]) =>
    resolveReceipt({ accounts: ACCOUNTS, categories: CATEGORIES, currency: "USD", draft, now: NOW });

describe("resolveReceipt", () => {
    it("matches names case-insensitively and by direction, and rounds every figure to the currency's minor units", () => {
        const receipt = resolve(DRAFT);

        expect(receipt.categoryId).toBe("cat-groceries");
        expect(receipt.accountId).toBe("acc-visa");
        expect(receipt.currency).toBe("EUR");
        expect(receipt.amount).toBe(20.56);
        expect(receipt.items[1]?.price).toBe(1.25);
        expect(receipt.date).toStrictEqual(new Date(2026, 8, 4, 12, 0, 0, 0));
    });

    it("files a refund under the income side only", () => {
        const receipt = resolve({ ...DRAFT, income: true });

        expect(receipt.categoryId).toBe("cat-refund");
        expect(receipt.income).toBeTruthy();
    });

    it("adopts the ledger's currency and its minor units when the receipt names none", () => {
        const receipt = resolveReceipt({
            accounts: ACCOUNTS,
            categories: CATEGORIES,
            currency: "JPY",
            draft: { ...DRAFT, currency: null, total: 1200.4 },
            now: NOW,
        });

        expect(receipt.currency).toBe("JPY");
        expect(receipt.amount).toBe(1200);
    });

    it("keeps the time of day for a receipt dated today", () => {
        const receipt = resolve({ ...DRAFT, date: "2026-09-05" });

        expect(receipt.date).toStrictEqual(NOW);
    });
});

describe("savableReceipt", () => {
    it("needs a category, a positive amount, a merchant, and no account it could not place", () => {
        expect(savableReceipt(resolve(DRAFT))).toStrictEqual({ categoryId: "cat-groceries" });
        const twoVisas = resolveReceipt({
            accounts: [...ACCOUNTS, { currency: "EUR", id: "acc-visa-eur", name: "visa" }],
            categories: CATEGORIES,
            currency: "USD",
            draft: DRAFT,
            now: NOW,
        });
        expect(twoVisas.accountId).toBeNull();
        expect(twoVisas.accountUnresolved).toBeTruthy();
        expect(savableReceipt(twoVisas)).toBeNull();
        expect(resolve({ ...DRAFT, accountName: null }).accountUnresolved).toBeFalsy();
        const omitted = resolveReceipt({
            accounts: ACCOUNTS,
            accountsOmitted: true,
            categories: CATEGORIES,
            currency: "USD",
            draft: { ...DRAFT, accountName: null },
            now: NOW,
        });
        expect(omitted.accountUnresolved).toBeTruthy();
        expect(savableReceipt(omitted)).toBeNull();
        expect(savableReceipt(resolve({ ...DRAFT, currency: null, currencyUnresolved: true }))).toBeNull();
        const fewerCategories = resolveReceipt({
            accounts: ACCOUNTS,
            categories: CATEGORIES,
            categoriesOmitted: true,
            currency: "USD",
            draft: DRAFT,
            now: NOW,
        });
        expect(fewerCategories.categoryId).toBe("cat-groceries");
        expect(savableReceipt(fewerCategories)).toBeNull();
        expect(savableReceipt(resolve({ ...DRAFT, categoryName: "Unknown" }))).toBeNull();
        expect(savableReceipt(resolve({ ...DRAFT, merchant: "  " }))).toBeNull();
        expect(savableReceipt(resolve({ ...DRAFT, currency: "JPY", total: 0.4 }))).toBeNull();
    });
});

describe("receiptDetails", () => {
    const price = (amount: number) => `€${amount.toFixed(2)}`;
    const more = (count: number) => `and ${count} more lines`;

    it("writes one line per item, with the quantity only when it is not one", () => {
        expect(receiptDetails(resolve(DRAFT), price, more)).toBe("2× Leche entera 1L €1.90\nPan chapata €1.25");
    });

    it("is null for a receipt with no lines", () => {
        expect(receiptDetails(resolve({ ...DRAFT, items: [] }), price, more)).toBeNull();
    });

    it("keeps the first lines of a long receipt and counts the rest", () => {
        const items = Array.from({ length: DETAIL_LINES + 3 }, (_, index) => ({
            name: `Item ${index}`,
            price: 1,
            quantity: 1,
        }));
        const details = receiptDetails(resolve({ ...DRAFT, items }), price, more) ?? "";
        const lines = details.split("\n");

        expect(lines).toHaveLength(DETAIL_LINES + 1);
        expect(lines.at(-1)).toBe("and 3 more lines");
    });
});

describe("formatQuantity", () => {
    it("prints a quantity without trailing zeros", () => {
        expect(formatQuantity(2)).toBe("2");
        expect(formatQuantity(1.5)).toBe("1.5");
        expect(formatQuantity(0.3333)).toBe("0.333");
    });
});

describe("conversionOf", () => {
    const rates = buildRateTable([
        { date: "2026-09-04", quote: "EUR", rate: 0.86 },
        { date: "2026-09-01", quote: "MXN", rate: 18.5 },
    ]);

    it("restates a foreign total in the ledger's currency at the receipt day's rate", () => {
        const conversion = conversionOf(resolve(DRAFT), "USD", rates);

        expect(conversion?.amount).toBe(23.91);
        expect(conversion?.rate).toBeCloseTo(1 / 0.86, 6);
    });

    it("crosses two non-USD currencies through the USD leg", () => {
        const receipt = resolveReceipt({
            accounts: ACCOUNTS,
            categories: CATEGORIES,
            currency: "MXN",
            draft: DRAFT,
            now: NOW,
        });
        const conversion = conversionOf(receipt, "MXN", rates);

        expect(conversion?.rate).toBeCloseTo(18.5 / 0.86, 6);
        expect(conversion?.amount).toBe(442.28);
    });

    it("refuses a conversion when either leg is not a usable rate", () => {
        const receipt = resolve(DRAFT);

        for (const bad of [0, -1, Number.NaN]) {
            expect(
                conversionOf(
                    receipt,
                    "MXN",
                    buildRateTable([
                        { date: "2026-09-04", quote: "EUR", rate: 0.86 },
                        { date: "2026-09-04", quote: "MXN", rate: bad },
                    ])
                )
            ).toBeNull();
            expect(
                conversionOf(
                    receipt,
                    "MXN",
                    buildRateTable([
                        { date: "2026-09-04", quote: "EUR", rate: bad },
                        { date: "2026-09-04", quote: "MXN", rate: 18.5 },
                    ])
                )
            ).toBeNull();
        }
    });

    it("is null for the ledger's own currency and for a day the table cannot price", () => {
        expect(conversionOf(resolve({ ...DRAFT, currency: null }), "USD", rates)).toBeNull();
        expect(conversionOf(resolve({ ...DRAFT, currency: "GBP" }), "USD", rates)).toBeNull();
        expect(conversionOf(resolve({ ...DRAFT, date: "2026-09-03" }), "USD", rates)).toBeNull();
    });
});
