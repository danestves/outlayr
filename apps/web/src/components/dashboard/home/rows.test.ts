import { describe, expect, it } from "vite-plus/test";

import type { LedgerRow, LedgerTransfer } from "../../../lib/dashboard-series-ledger";
import { figureOf, foldFees, viewRows } from "./rows";

const row = (id: string, day: string, extra: Partial<LedgerRow> = {}): LedgerRow => ({
    accountId: "chase",
    amount: 10,
    at: Date.parse(`${day}T15:00:00Z`),
    categoryId: "groceries",
    day,
    feeFor: null,
    id,
    income: false,
    note: "",
    original: 10,
    parentId: null,
    topId: "groceries",
    ...extra,
});

const period = { days: 31, from: "2026-10-01", key: "2026-10", to: "2026-10-31" };
const view = { accounts: [], categories: [], period };

describe("viewRows", () => {
    it("lists a transfer on either account, in amount order, and leaves it out of a category", () => {
        const transfer = {
            amount: 500,
            at: Date.parse("2026-10-06T15:00:00Z"),
            day: "2026-10-06",
            fromId: "chase",
            id: "move",
            arrived: 500,
            arrivedCurrency: "USD",
            sent: 500,
            sentCurrency: "USD",
            toId: "savings",
        };
        const ledger = { rows: [row("a", "2026-10-02")], transfers: [transfer] };
        const ids = (accounts: string[], category: string | null) =>
            viewRows(ledger, { ...view, accounts, categories: category === null ? [] : [category] }, "largest").map(
                (each) => each.id
            );

        expect(ids([], null)).toStrictEqual(["move", "a"]);
        expect(ids(["savings"], null)).toStrictEqual(["move"]);
        expect(ids(["amex"], null)).toStrictEqual([]);
        expect(ids([], "groceries")).toStrictEqual(["a"]);
    });

    it("keeps whole days of the period and drops the neighbouring months", () => {
        const ledger = {
            transfers: [],
            rows: [
                row("before", "2026-09-30"),
                row("first", "2026-10-01"),
                row("last", "2026-10-31"),
                row("after", "2026-11-01"),
            ],
        };

        expect(viewRows(ledger, view, "oldest").map((each) => each.id)).toStrictEqual(["first", "last"]);
    });

    it("filters by account and by the top category a sub-category rolls into", () => {
        const ledger = {
            transfers: [],
            rows: [
                row("a", "2026-10-02"),
                row("b", "2026-10-03", { accountId: "amex" }),
                row("c", "2026-10-04", { categoryId: "milk", parentId: "groceries" }),
                row("d", "2026-10-05", { categoryId: "rent", topId: "rent" }),
            ],
        };

        expect(
            viewRows(ledger, { ...view, accounts: ["chase"], categories: ["groceries"] }, "oldest").map(
                (each) => each.id
            )
        ).toStrictEqual(["a", "c"]);
    });

    it("orders by size when asked and puts the newest first otherwise", () => {
        const ledger = {
            transfers: [],
            rows: [row("small", "2026-10-02", { amount: 5 }), row("big", "2026-10-01", { amount: 90 })],
        };

        expect(viewRows(ledger, view, "largest").map((each) => each.id)).toStrictEqual(["big", "small"]);
        expect(viewRows(ledger, view, "newest").map((each) => each.id)).toStrictEqual(["small", "big"]);
    });
});

const moved = (id: string, extra: Partial<LedgerTransfer> = {}): LedgerTransfer => ({
    amount: 1200,
    arrived: 1200,
    arrivedCurrency: "USD",
    at: Date.parse("2026-10-06T15:00:00Z"),
    day: "2026-10-06",
    fromId: "chase",
    id,
    sent: 1200,
    sentCurrency: "USD",
    toId: "amex",
    ...extra,
});

const usd = { currency: "USD" };

describe("foldFees", () => {
    it("folds a fee into a listed parent and leaves it standing when the parent is not listed", () => {
        const fee = row("fee", "2026-10-02", { feeFor: "buy" });
        const lost = row("lost", "2026-10-02", { feeFor: "gone" });
        const own = row("own", "2026-10-02", { feeFor: "own" });
        const folded = foldFees([row("buy", "2026-10-02"), fee, lost, own]);

        expect(folded.map((each) => [each.id, each.fees.map((charged) => charged.id)])).toStrictEqual([
            ["buy", ["fee"]],
            ["lost", []],
            ["own", []],
        ]);
    });
});

describe("figureOf", () => {
    it("adds a fee to a purchase and takes it off income, to the cent", () => {
        const fee = row("fee", "2026-10-02", { amount: 0.1, feeFor: "a" });
        const buy = { ...row("a", "2026-10-02", { amount: 0.2 }), fees: [fee] };
        const pay = { ...row("a", "2026-10-02", { amount: 0.3, income: true }), fees: [fee] };

        expect(figureOf(usd, buy)).toStrictEqual({ amount: 0.3, arrived: null, fee: 0.1 });
        expect(figureOf(usd, pay)).toStrictEqual({ amount: 0.2, arrived: null, fee: 0.1 });
    });

    it("charges a transfer's fee on the side its account is on", () => {
        const source = row("s", "2026-10-02", { accountId: "chase", amount: 5, original: 5 });
        const destination = row("d", "2026-10-02", { accountId: "amex", amount: 12, original: 12 });

        expect(figureOf(usd, { ...moved("t"), fees: [destination] })).toMatchObject({ amount: 1200, arrived: 1188 });
        expect(figureOf(usd, { ...moved("t"), fees: [source] })).toMatchObject({ amount: 1205, arrived: 1200 });
    });

    it("shows an arrival only when a fee, a currency or the amount makes it differ", () => {
        const bolivars = moved("t", { arrived: 25_180, arrivedCurrency: "VES" });

        expect(figureOf(usd, { ...moved("t"), fees: [] }).arrived).toBeNull();
        expect(figureOf(usd, { ...bolivars, fees: [] }).arrived).toBe(25_180);
        expect(figureOf(usd, { ...moved("t", { arrived: 1170 }), fees: [] }).arrived).toBe(1170);
    });
});
