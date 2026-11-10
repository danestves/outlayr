import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import type { Doc, TableNames } from "@outlayr/backend/convex/_generated/dataModel";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "../../../../lib/dashboard-series-ledger";
import { buildReport, columnsOf, spanOf } from "./model";
import type { Definition, TagBooks } from "./model";

const at = (iso: string) => Date.parse(iso);
const NOW = at("2026-10-20T15:00:00Z");

let sequence = 0;
const docOf = <Table extends TableNames>(row: Omit<Doc<Table>, "_creationTime" | "_id">) =>
    ({ _creationTime: 0, _id: `doc-${(sequence += 1)}`, ...row }) as unknown as Doc<Table>;
const envelope = (localId: string) => {
    sequence += 1;
    return { deletedAt: null, deviceId: "device", localId, seq: sequence, updatedAt: 0, userId: "owner" };
};

const category = (localId: string, name: string, color: string) =>
    docOf<"categories">({
        ...envelope(localId),
        color,
        dateCreated: 0,
        emoji: null,
        icon: null,
        income: false,
        name,
        parentId: null,
        sortOrder: 0,
    });

const entry = (
    localId: string,
    iso: string,
    amount: number,
    categoryId: string,
    extra: Partial<Doc<"transactions">> = {}
) =>
    docOf<"transactions">({
        ...envelope(localId),
        accountId: "chase",
        amount,
        amountUsd: amount,
        categoryId,
        currency: "USD",
        customColor: null,
        date: at(iso),
        day: at(iso),
        details: null,
        emoji: null,
        exchangeRate: null,
        exchangeRateType: null,
        icon: null,
        imageColor: null,
        imageKey: null,
        income: false,
        month: 0,
        note: "",
        onceRecurring: false,
        recurringCoefficient: 1,
        recurringEndDate: null,
        recurringType: 0,
        ...extra,
    });

const books = (transactions: LedgerBooks["transactions"], fields: Partial<LedgerBooks> = {}): LedgerBooks => ({
    accounts: [],
    appMeta: [{ key: "timeZone", value: "UTC" }],
    budgets: [],
    categories: [category("rent", "Rent", "#b26c43"), category("food", "Groceries", "#53915a")],
    exchangeRates: [],
    installmentPlans: [],
    installments: [],
    savingsGoals: [],
    mainBudget: [],
    outsideMoves: [],
    outsidePayments: [],
    transactions,
    transfers: [],
    ...fields,
});

const NO_TAGS: TagBooks = { links: [], tags: [] };
const base: Definition = {
    accounts: [],
    columns: "month",
    measure: "spending",
    range: { from: "2026-08", to: "2026-10" },
    rows: "category",
    tags: [],
};

const sample = [
    entry("aug-rent", "2026-08-01T12:00:00Z", 1850, "rent"),
    entry("aug-food", "2026-08-31T23:30:00Z", 100, "food", { note: "Whole Foods" }),
    entry("sep-food", "2026-09-05T12:00:00Z", 200, "food", { note: "whole foods " }),
    entry("oct-food", "2026-10-08T12:00:00Z", 340, "food", { note: "Costco" }),
    entry("oct-pay", "2026-10-01T12:00:00Z", 4000, "food", { income: true }),
];

const report = (definition: Partial<Definition>, fields: Partial<LedgerBooks> = {}, tags: TagBooks = NO_TAGS) =>
    buildReport({
        books: tags,
        definition: { ...base, ...definition },
        ledger: prepareLedger(books(sample, fields), NOW),
    });

describe("buildReport", () => {
    it("puts the last evening of a month in that month and keeps income out of spending", () => {
        const { rows, totals } = report({});
        const food = rows.find((row) => row.label.id === "food");
        expect(food?.values).toEqual([100, 200, 340]);
        expect(totals.values).toEqual([1950, 200, 340]);
    });

    it("counts income toward net and nothing else", () => {
        const { totals } = report({ measure: "net" });
        expect(totals.values).toEqual([-1950, -200, 3660]);
        expect(report({ measure: "income" }).totals.total).toBe(4000);
    });

    it("averages per entry, not per column", () => {
        const { totals } = report({ measure: "average" });
        expect(totals.total).toBe(622.5);
        expect(totals.values).toEqual([975, 200, 340]);
    });

    it("reads Whole Foods and whole foods as one merchant", () => {
        const { rows } = report({ rows: "merchant" });
        const whole = rows.filter((row) => row.label.name.toLowerCase().startsWith("whole"));
        expect(whole).toHaveLength(1);
        expect(whole[0]?.total).toBe(300);
    });

    it("counts an entry in each of its tags but once in the totals", () => {
        const tags: TagBooks = {
            links: [
                { deletedAt: null, tagId: "trip", transactionId: "sep-food" },
                { deletedAt: null, tagId: "work", transactionId: "sep-food" },
                { deletedAt: 5, tagId: "work", transactionId: "oct-food" },
            ],
            tags: [
                { color: null, deletedAt: null, localId: "trip", name: "trip", sortOrder: 0 },
                { color: null, deletedAt: null, localId: "work", name: "work", sortOrder: 0 },
            ],
        };
        const { rows, totals } = report({ rows: "tag" }, {}, tags);
        expect(rows.find((row) => row.label.id === "trip")?.total).toBe(200);
        expect(rows.find((row) => row.label.id === "work")?.total).toBe(200);
        expect(rows.find((row) => row.label.special === "untagged")?.total).toBe(2290);
        expect(totals.total).toBe(2490);
        expect(report({ tags: ["trip"] }, {}, tags).totals.total).toBe(200);
    });

    it("folds the smallest merchants into one row that still adds up", () => {
        const many = Array.from({ length: 15 }, (_, index) =>
            entry(`m${index}`, "2026-10-05T12:00:00Z", 10 + index, "food", { note: `Shop ${index}` })
        );
        const result = buildReport({
            books: NO_TAGS,
            definition: { ...base, rows: "merchant", range: { from: "2026-10", to: "2026-10" } },
            ledger: prepareLedger(books(many), NOW),
        });
        const sum = result.rows.reduce((all, row) => all + row.total, 0);
        expect(result.rows).toHaveLength(12);
        expect(result.rows.at(-1)?.label.special).toBe("other");
        expect(sum).toBe(result.totals.total);
    });

    it("names the row that climbed most", () => {
        expect(report({}).rise?.label.id).toBe("food");
        expect(report({}).rise?.delta).toBe(240);
    });

    it("holds the account filter", () => {
        expect(report({ accounts: ["nowhere"] }).entries).toBe(0);
    });
});

describe("columnsOf", () => {
    const calendar = { firstDayOfMonth: 1, firstWeekday: 2, today: "2026-10-20" };

    it("starts a week on the weekday the ledger starts it", () => {
        const weeks = columnsOf("week", { from: "2026-10", to: "2026-10" }, calendar);
        expect(weeks[0]).toEqual({ from: "2026-10-01", key: "2026-09-28", to: "2026-10-04" });
        expect(weeks.at(-1)?.to).toBe("2026-10-20");
    });

    it("joins months into the quarter they belong to", () => {
        const quarters = columnsOf("quarter", { from: "2026-02", to: "2026-10" }, calendar);
        expect(quarters.map((column) => column.key)).toEqual(["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"]);
    });
});

describe("spanOf", () => {
    it("ends a rolling range in the current month", () => {
        expect(spanOf({ last: 5 }, "2026-10")).toEqual({ from: "2026-06", to: "2026-10" });
    });

    it("never reaches into months that have not started", () => {
        expect(spanOf({ from: "2026-12", to: "2027-03" }, "2026-10")).toEqual({ from: "2026-10", to: "2026-10" });
    });
});
