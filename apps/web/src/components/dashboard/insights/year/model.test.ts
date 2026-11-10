import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import type { Doc, TableNames } from "@outlayr/backend/convex/_generated/dataModel";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "../../../../lib/dashboard-series-ledger";
import { monthKeysOf, proMultiple, runsOf, yearOf } from "./model";

const at = (iso: string) => Date.parse(iso);
const NOW = at("2026-10-20T15:00:00Z");

let sequence = 0;
const docOf = <Table extends TableNames>(row: Omit<Doc<Table>, "_creationTime" | "_id">) =>
    ({ _creationTime: 0, _id: `doc-${(sequence += 1)}`, ...row }) as unknown as Doc<Table>;
const envelope = (localId: string) => {
    sequence += 1;
    return { deletedAt: null, deviceId: "device", localId, seq: sequence, updatedAt: 0, userId: "owner" };
};

const category = (localId: string, name: string) =>
    docOf<"categories">({
        ...envelope(localId),
        color: null,
        dateCreated: 0,
        emoji: null,
        icon: null,
        income: false,
        name,
        parentId: null,
        sortOrder: 0,
    });

const entry = (localId: string, iso: string, amount: number, categoryId: string) =>
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
        recurringType: RECURRING_TYPE.none,
    });

const books = (transactions: LedgerBooks["transactions"]): LedgerBooks => ({
    accounts: [],
    appMeta: [{ key: "timeZone", value: "UTC" }],
    budgets: [
        docOf<"budgets">({
            ...envelope("budget-food"),
            amount: 400,
            amountUsd: 400,
            categoryId: "food",
            currency: "USD",
            dateCreated: 0,
            green: false,
            name: null,
            rollover: false,
            startDate: at("2026-07-01T00:00:00Z"),
            type: BUDGET_TYPE.month,
        }),
    ],
    categories: [category("rent", "Rent"), category("food", "Groceries")],
    exchangeRates: [],
    installmentPlans: [],
    installments: [],
    savingsGoals: [],
    mainBudget: [],
    outsideMoves: [],
    outsidePayments: [],
    transactions,
    transfers: [],
});

const MONTHS = ["07", "08", "09", "10"] as const;
const FOOD = [300, 500, 100, 200] as const;
const rows = MONTHS.flatMap((month, index) => [
    entry(`rent-${month}`, `2026-${month}-01T12:00:00Z`, 1850, "rent"),
    entry(`food-${month}`, `2026-${month}-08T12:00:00Z`, FOOD[index] ?? 0, "food"),
]);
const year = yearOf(prepareLedger(books(rows), NOW), { accounts: [] }, null, true);

describe("monthKeysOf", () => {
    it("ends the rolling twelve with the month holding today", () => {
        const keys = monthKeysOf(null, { firstDayOfMonth: 1, today: "2026-10-31" });
        expect([keys[0], keys.at(-1), keys.length]).toEqual(["2025-11", "2026-10", 12]);
    });

    it("runs a calendar year from January to December", () => {
        const keys = monthKeysOf("2025", { firstDayOfMonth: 1, today: "2026-10-31" });
        expect([keys[0], keys.at(-1)]).toEqual(["2025-01", "2025-12"]);
    });

    it("names the month by the day the ledger's month starts on", () => {
        expect(monthKeysOf(null, { firstDayOfMonth: 15, today: "2026-10-10" }).at(-1)).toBe("2026-09");
    });
});

describe("runsOf", () => {
    it("folds consecutive months into one run", () => {
        expect(runsOf([0, 1, 2, 5, 7, 8])).toEqual([
            [0, 2],
            [5, 5],
            [7, 8],
        ]);
    });
});

describe("yearOf", () => {
    it("calls a month over only when the budgeted spend passes the limit", () => {
        const [july, august, september, october] = year.months.slice(-4);
        expect([july?.over, august?.over, september?.over, october?.over]).toEqual([false, true, false, false]);
        expect(year.under).toEqual([8, 10, 11]);
        expect(year.over).toBe(1);
    });

    it("keeps only what each month left under its limit, counting the month in progress", () => {
        expect(year.keptHere).toEqual({ budgeted: 1600, count: 4, kept: 600 });
    });

    it("counts neither a weekly budget nor a budget under a budgeted parent", () => {
        const base = books([...rows, entry("produce-10", "2026-10-09T12:00:00Z", 50, "produce")]);
        const [food] = base.budgets;
        const budget = (localId: string, categoryId: string, type: number) =>
            docOf<"budgets">({ ...food, ...envelope(localId), categoryId, type } as Doc<"budgets">);
        const more = yearOf(
            prepareLedger(
                {
                    ...base,
                    budgets: [
                        ...base.budgets,
                        budget("budget-rent", "rent", BUDGET_TYPE.week),
                        budget("budget-produce", "produce", BUDGET_TYPE.month),
                    ],
                    categories: [...base.categories, { ...category("produce", "Produce"), parentId: "food" }],
                },
                NOW
            ),
            { accounts: [] },
            null,
            true
        );

        expect(more.keptHere).toEqual({ budgeted: 1600, count: 4, kept: 550 });
    });

    it("measures the latest closed month against the category's average month", () => {
        expect(year.latest).toBe("2026-09");
        expect(year.below).toEqual([{ delta: -200, id: "food", label: "Groceries" }]);
    });

    it("skips months without budgets when none are in force", () => {
        const none = yearOf(prepareLedger(books(rows), NOW), { accounts: [] }, null, false);
        expect([none.keptHere, none.under]).toEqual([null, []]);
    });
});

describe("proMultiple", () => {
    const price = { amount: 49.99, currency: "USD" };

    it("rounds how many years of Pro the kept money covers", () => {
        expect(proMultiple(2148, price, "USD")).toBe(43);
    });

    it("says nothing when the kept money does not clear the price or the currency differs", () => {
        expect([proMultiple(49.99, price, "USD"), proMultiple(2148, price, "EUR")]).toEqual([null, null]);
    });
});
