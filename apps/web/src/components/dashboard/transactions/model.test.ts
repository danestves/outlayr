import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "../../../lib/dashboard-series-ledger";
import type { LedgerRow } from "../../../lib/dashboard-series-ledger";
import type { FoldedRow } from "../home/rows";
import { csvOf, exportLines, linesOf, queryRows, rangeOf, tally } from "./model";
import type { LedgerQuery } from "./model";

const NOW = Date.parse("2026-11-08T15:00:00Z");

const envelope = (localId: string, seq: number) => ({
    deletedAt: null,
    deviceId: "device",
    localId,
    seq,
    updatedAt: 0,
    userId: "owner",
});

const category = (localId: string, income = false) => ({
    ...envelope(localId, 1),
    color: "#000000",
    emoji: null,
    icon: null,
    income,
    name: localId,
    parentId: null,
    sortOrder: 0,
});

const account = (localId: string, currency: string) => ({
    ...envelope(localId, 1),
    currency,
    initialBalance: 0,
    initialBalanceDate: 0,
    name: localId,
});

const entry = (localId: string, iso: string, amount: number, extra: Record<string, unknown> = {}) => ({
    ...envelope(localId, 1),
    accountId: "chase",
    amount,
    amountUsd: amount,
    categoryId: "food",
    currency: "USD",
    date: Date.parse(iso),
    day: 0,
    exchangeRate: null,
    income: false,
    note: localId,
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
    ...extra,
});

const ledger = prepareLedger(
    {
        accounts: [account("chase", "USD"), account("savings", "USD")],
        appMeta: [{ key: "timeZone", value: "America/Caracas" }],
        budgets: [],
        categories: [category("food"), category("salary", true)],
        exchangeRates: [],
        installmentPlans: [],
        mainBudget: [],
        outsideMoves: [],
        outsidePayments: [],
        transactions: [
            // 22:30 on Nov 7 in Caracas (UTC-4), already Nov 8 in UTC.
            entry("late dinner", "2026-11-08T02:30:00Z", 40),
            entry("breakfast", "2026-11-08T12:00:00Z", 12),
            entry("pay", "2026-11-07T14:00:00Z", 1000, { categoryId: "salary", income: true }),
            entry("amazon", "2026-11-06T14:00:00Z", 100, { accountId: "chase" }),
            entry("foreign fee", "2026-11-06T14:00:00Z", 3, { categoryId: null, feeForId: "amazon" }),
            entry("wire fee", "2026-11-05T14:00:00Z", 25, { categoryId: null, transferId: "move" }),
            entry("october", "2026-10-31T14:00:00Z", 8),
        ],
        transfers: [
            {
                ...envelope("move", 1),
                date: Date.parse("2026-11-05T14:00:00Z"),
                fromAccountId: "chase",
                fromAmount: 500,
                fromAmountUsd: 500,
                fromCurrency: "USD",
                note: "",
                toAccountId: "savings",
                toAmount: 500,
                toCurrency: "USD",
            },
        ],
    } as unknown as LedgerBooks,
    NOW
);

const NOVEMBER = { from: "2026-11-01", to: "2026-11-30" };

const query = (patch: Partial<LedgerQuery> = {}): LedgerQuery => ({
    accounts: [],
    categories: [],
    max: null,
    min: null,
    q: "",
    range: NOVEMBER,
    sort: "newest",
    type: undefined,
    ...patch,
});

const textOf = (row: FoldedRow) => ("fromId" in row ? `${row.fromId} ${row.toId}` : row.note);
const ids = (patch: Partial<LedgerQuery>) => queryRows(ledger, query(patch), textOf).map((row) => row.id);

describe("linesOf", () => {
    it("groups by the day in the ledger's time zone, not UTC", () => {
        const lines = linesOf(ledger, queryRows(ledger, query(), textOf), true);
        const days = lines.flatMap((line) => (line.type === "day" ? [line.day] : []));
        const late = lines.findIndex((line) => line.type === "row" && line.row.id === "late dinner");
        const header = lines.slice(0, late).findLast((line) => line.type === "day");

        expect(days).toStrictEqual(["2026-11-08", "2026-11-07", "2026-11-06", "2026-11-05"]);
        expect(header).toStrictEqual({ day: "2026-11-07", net: 960, type: "day" });
    });

    it("lists a non-date sort without day headers", () => {
        const lines = linesOf(ledger, queryRows(ledger, query({ sort: "largest" }), textOf), false);
        expect(lines.every((line) => line.type === "row")).toBe(true);
    });
});

describe("tally", () => {
    it("counts a transfer's fee once and never the money moved between own accounts", () => {
        const rows = queryRows(ledger, query(), textOf);
        expect(rows.map((row) => row.id)).not.toContain("wire fee");
        expect(tally(ledger, rows)).toStrictEqual({ count: 5, in: 1000, out: 180 });
    });

    it("keeps the totals when fees stand alone in the expenses view", () => {
        const rows = queryRows(ledger, query({ type: "expenses" }), textOf);
        expect(rows.map((row) => row.id)).toStrictEqual(["breakfast", "late dinner", "amazon", "wire fee"]);
        expect(tally(ledger, rows)).toStrictEqual({ count: 4, in: 0, out: 180 });
    });
});

describe("queryRows", () => {
    it("lists transfers with their fees folded in", () => {
        const [move] = queryRows(ledger, query({ type: "transfers" }), textOf);
        expect(move?.id).toBe("move");
        expect(move?.fees.map((fee) => fee.id)).toStrictEqual(["wire fee"]);
    });

    it("finds by words and by the exact amount, fees included", () => {
        expect(ids({ q: "DINNER" })).toStrictEqual(["late dinner"]);
        expect(ids({ q: "103" })).toStrictEqual(["amazon"]);
        expect(ids({ q: "100" })).toStrictEqual(["amazon"]);
        expect(ids({ q: "12,00" })).toStrictEqual(["breakfast"]);
    });

    it("bounds the amount on what the row costs with its fee", () => {
        expect(ids({ max: 102, min: 40 })).toStrictEqual(["late dinner"]);
        expect(ids({ min: 103 })).toStrictEqual(["pay", "amazon", "move"]);
    });

    it("keeps a fee on its entry when a filter would drop the fee itself", () => {
        const [amazon] = queryRows(ledger, query({ categories: ["food"], q: "amazon" }), textOf);
        expect(amazon?.fees.map((fee) => fee.id)).toStrictEqual(["foreign fee"]);
    });

    it("searches every day when the range is all time", () => {
        expect(ids({ q: "october" })).toStrictEqual([]);
        expect(ids({ q: "october", range: null })).toStrictEqual(["october"]);
    });
});

describe("rangeOf", () => {
    it("widens the picked month to its quarter or year, honouring the first day of the month", () => {
        expect(rangeOf({ custom: {}, key: "2026-11", span: "quarter" }, 1)).toStrictEqual({
            from: "2026-10-01",
            to: "2026-12-31",
        });
        expect(rangeOf({ custom: {}, key: "2026-02", span: "year" }, 15)).toStrictEqual({
            from: "2026-01-15",
            to: "2027-01-14",
        });
        expect(rangeOf({ custom: {}, key: "2026-11", span: "all" }, 1)).toBeNull();
        expect(rangeOf({ custom: { from: "2026-03-02" }, key: "2026-11", span: "all" }, 1)).toStrictEqual({
            from: "2026-03-02",
            to: "9999-12-31",
        });
    });
});

describe("exportLines", () => {
    it("writes money out as negative, oldest first, with each fee on its own line", () => {
        const names = {
            account: (id: string | null) => id ?? "",
            category: (row: LedgerRow) => row.topId,
            currency: (row: LedgerRow) => ({ amount: row.original, currency: "USD" }),
            kind: { expense: "Expense", fee: "Fee", income: "Income", transfer: "Transfer" },
            merchant: (row: LedgerRow) => row.note,
        };
        const lines = exportLines(ledger, queryRows(ledger, query({ max: 600, min: 100 }), textOf), names);
        expect(lines).toStrictEqual([
            ["2026-11-05", "chase → savings", "", "chase", "Transfer", -500, "USD", -500],
            ["2026-11-05", "wire fee", "uncategorized", "chase", "Fee", -25, "USD", -25],
            ["2026-11-06", "amazon", "food", "chase", "Expense", -100, "USD", -100],
            ["2026-11-06", "foreign fee", "uncategorized", "chase", "Fee", -3, "USD", -3],
        ]);
    });

    it("quotes cells that hold commas, quotes or line breaks", () => {
        expect(csvOf([["Date", 'Joe\'s "diner", NYC', "a\nb", -3.5]])).toBe(
            'Date,"Joe\'s ""diner"", NYC","a\nb",-3.5\r\n'
        );
    });
});
