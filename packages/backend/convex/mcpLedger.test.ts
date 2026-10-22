/// <reference types="vite/client" />
import { accountBalance } from "@outlayr/money/account-balance";
import { accountsOverview } from "@outlayr/money/account-overview";
import { effectiveLimit, rolloverCarry } from "@outlayr/money/budget-rollover";
import { lastMsBefore, spentForCategory, spentForMain } from "@outlayr/money/budget-spent";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { advanceBudgetWindow, BUDGET_TYPE } from "@outlayr/money/budget-window";
import { toCells } from "@outlayr/money/currency-totals";
import type { CurrencyEntry } from "@outlayr/money/currency-totals";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";
import { monthlySubscriptionCost } from "@outlayr/money/subscription-cost";
import { buildRateTable, limitIn } from "@outlayr/money/valuation";
import { convexTest } from "convex-test";
import type { WithoutSystemFields } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { monthWindow, utcOffsetOf } from "./mcpLedger";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const HOUR = 3_600_000;
const at = (iso: string) => Date.parse(iso);

describe("utcOffsetOf", () => {
    it.each([
        { midnight: "2026-10-09T04:00:00Z", offset: -4 * HOUR },
        { midnight: "2026-10-08T22:00:00Z", offset: 2 * HOUR },
        { midnight: "2026-10-09T00:00:00Z", offset: 0 },
    ])("reads $offset from a local midnight at $midnight", ({ midnight, offset }) => {
        expect(utcOffsetOf(at(midnight))).toBe(offset);
    });
});

describe("monthWindow", () => {
    const caracas = -4 * HOUR;

    it("opens the calendar month at local midnight", () => {
        expect(monthWindow(at("2026-10-09T10:00:00Z"), caracas, 1, 0)).toStrictEqual({
            end: at("2026-11-01T04:00:00Z"),
            start: at("2026-10-01T04:00:00Z"),
        });
    });

    it("starts on payday and steps back across the year", () => {
        expect(monthWindow(at("2026-01-05T10:00:00Z"), caracas, 15, 0)).toStrictEqual({
            end: at("2026-01-15T04:00:00Z"),
            start: at("2025-12-15T04:00:00Z"),
        });
        expect(monthWindow(at("2026-01-05T10:00:00Z"), caracas, 15, 1).start).toBe(at("2025-11-15T04:00:00Z"));
    });
});

const USER = "user-mcp";
const caller = { subject: USER };
const NOW = at("2026-10-09T15:00:00Z");
const CARACAS = -4 * HOUR;

type Row<Table extends "accounts" | "budgets" | "categories" | "mainBudget" | "transactions" | "transfers"> =
    WithoutSystemFields<Doc<Table>>;

let seq = 0;
function envelope(localId: string, userId = USER) {
    seq += 1;
    return { deletedAt: null, deviceId: "device", localId, seq, updatedAt: 0, userId };
}

const midnightOf = (instant: number, offsetMs: number) => {
    const local = new Date(instant + offsetMs);
    return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs;
};

function entry(localId: string, fields: Partial<Row<"transactions">> & { amount: number; date: number }) {
    return {
        ...envelope(localId),
        accountId: null,
        amountUsd: fields.amount,
        categoryId: null,
        currency: "USD",
        customColor: null,
        day: midnightOf(fields.date, 0),
        details: null,
        emoji: null,
        exchangeRate: null,
        exchangeRateType: null,
        icon: null,
        imageColor: null,
        imageKey: null,
        income: false,
        month: 0,
        note: localId,
        onceRecurring: false,
        recurringCoefficient: 1,
        recurringEndDate: null,
        recurringType: RECURRING_TYPE.none,
        ...fields,
    } satisfies Row<"transactions">;
}

const RATES = [
    { date: "2026-09-01", quote: "EUR", rate: 0.9 },
    { date: "2026-10-01", quote: "EUR", rate: 0.92 },
];

interface Seed {
    accounts?: Row<"accounts">[];
    budgets?: Row<"budgets">[];
    categories?: Row<"categories">[];
    currency?: string;
    mainBudget?: Row<"mainBudget">[];
    transactions?: Row<"transactions">[];
    transfers?: Row<"transfers">[];
}

async function seeded(seed: Seed) {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
        for (const row of RATES) {
            await ctx.db.insert("exchangeRates", {
                ...row,
                fetchedAt: 0,
                rateType: "official",
                source: "openexchangerates",
            });
        }
        await ctx.db.insert("exchangeRates", {
            date: "2026-09-01",
            fetchedAt: 0,
            quote: "EUR",
            rate: 5,
            rateType: "eur_reference",
            source: "cotizave",
        });
        if (seed.currency) {
            await ctx.db.insert("appMeta", {
                deviceId: "device",
                key: "currency",
                seq: 0,
                updatedAt: 0,
                userId: USER,
                value: seed.currency,
            });
        }
        for (const row of seed.accounts ?? []) {
            await ctx.db.insert("accounts", row);
        }
        for (const row of seed.budgets ?? []) {
            await ctx.db.insert("budgets", row);
        }
        for (const row of seed.categories ?? []) {
            await ctx.db.insert("categories", row);
        }
        for (const row of seed.mainBudget ?? []) {
            await ctx.db.insert("mainBudget", row);
        }
        for (const row of seed.transactions ?? []) {
            await ctx.db.insert("transactions", row);
        }
        for (const row of seed.transfers ?? []) {
            await ctx.db.insert("transfers", row);
        }
    });
    return t;
}

const datedEntry = (row: Row<"transactions">): CurrencyEntry => ({ ...row, date: new Date(row.date) });

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("account_balances", () => {
    function account(localId: string, fields: Partial<Row<"accounts">>) {
        return {
            ...envelope(localId),
            currency: "USD",
            customColor: null,
            dateCreated: 0,
            emoji: null,
            icon: null,
            imageColor: null,
            imageKey: null,
            initialBalance: 0,
            initialBalanceDate: at("2026-09-01T12:00:00Z"),
            initialBalanceUsd: 0,
            kind: "asset",
            name: localId,
            sortOrder: 0,
            ...fields,
        } satisfies Row<"accounts">;
    }

    it("values each account the way the Accounts screen and the Log's overview do", async () => {
        const checking = account("checking", { initialBalance: 1000, initialBalanceUsd: 1000, sortOrder: 0 });
        const card = account("card", { currency: "EUR", kind: "liability", sortOrder: 1 });
        const checkingFlow = [
            entry("coffee", { accountId: "checking", amount: 25.5, date: at("2026-09-15T12:00:00Z") }),
            entry("salary", { accountId: "checking", amount: 2000, date: at("2026-10-01T12:00:00Z"), income: true }),
            entry("museum", {
                accountId: "checking",
                amount: 10,
                amountUsd: 10.87,
                currency: "EUR",
                date: at("2026-10-03T12:00:00Z"),
            }),
        ];
        const cardFlow = [
            entry("dinner", {
                accountId: "card",
                amount: 50,
                amountUsd: 54.35,
                currency: "EUR",
                date: at("2026-10-04T12:00:00Z"),
            }),
        ];
        const move = {
            ...envelope("move"),
            date: at("2026-10-05T12:00:00Z"),
            dateCreated: 0,
            day: midnightOf(at("2026-10-05T12:00:00Z"), 0),
            exchangeRate: null,
            exchangeRateType: null,
            fromAccountId: "checking",
            fromAmount: 100,
            fromAmountUsd: 100,
            fromCurrency: "USD",
            month: 0,
            note: "",
            toAccountId: "card",
            toAmount: 92,
            toAmountUsd: 100,
            toCurrency: "EUR",
        } satisfies Row<"transfers">;
        const t = await seeded({
            accounts: [card, checking, { ...account("closed", {}), deletedAt: 1 }],
            currency: "EUR",
            transactions: [
                ...checkingFlow,
                ...cardFlow,
                entry("later", { accountId: "checking", amount: 70, date: at("2026-10-09T20:00:00Z") }),
                {
                    ...entry("gone", { accountId: "checking", amount: 80, date: at("2026-10-02T12:00:00Z") }),
                    deletedAt: 1,
                },
                {
                    ...entry("theirs", { accountId: "checking", amount: 90, date: at("2026-10-02T12:00:00Z") }),
                    userId: "someone-else",
                },
            ],
            transfers: [move, { ...move, ...envelope("future"), date: at("2026-10-10T12:00:00Z") }],
        });

        const result = await t.query(internal.mcpLedger.accountBalances, { caller });

        const eur = buildRateTable(RATES);
        const outbound = { amount: 100, amountUsd: 100, currency: "USD", date: new Date(move.date), income: false };
        const inbound = { amount: 92, amountUsd: 100, currency: "EUR", date: new Date(move.date), income: true };
        const checkingCells = [...toCells(checkingFlow.map(datedEntry)), ...toCells([outbound])];
        const cardCells = [...toCells(cardFlow.map(datedEntry)), ...toCells([inbound])];
        const overview = accountsOverview(
            [checking, card].map((row) => ({ ...row, id: row.localId })),
            [
                ...checkingCells.map((cell) => ({ ...cell, accountId: "checking" })),
                ...cardCells.map((cell) => ({ ...cell, accountId: "card" })),
            ],
            "EUR",
            eur,
            new Date(NOW)
        );
        const [checkingRow, cardRow] = overview?.rows ?? [];
        expect(result).toStrictEqual({
            accounts: [
                {
                    balance: roundMoney(accountBalance(checking, checkingCells, buildRateTable([])).total, 2),
                    balanceInMainCurrency: roundMoney(checkingRow?.balance ?? Number.NaN, 2),
                    currency: "USD",
                    exact: true,
                    kind: "asset",
                    name: "checking",
                },
                {
                    balance: roundMoney(accountBalance(card, cardCells, eur).total, 2),
                    balanceInMainCurrency: roundMoney(cardRow?.balance ?? Number.NaN, 2),
                    currency: "EUR",
                    exact: true,
                    kind: "liability",
                    name: "card",
                },
            ],
            currency: "EUR",
            net: roundMoney(overview?.total ?? Number.NaN, 2),
            owed: roundMoney(overview?.owe ?? Number.NaN, 2),
            owned: roundMoney(overview?.own ?? Number.NaN, 2),
        });
    });

    it("counts what people owe the user as owned and what the user owes them as owed", async () => {
        const t = await seeded({
            accounts: [
                account("checking", { initialBalance: 1000, initialBalanceUsd: 1000 }),
                account("ana", { initialBalance: 80, initialBalanceUsd: 80, kind: "person", sortOrder: 1 }),
                account("pedro", { initialBalance: -50, initialBalanceUsd: -50, kind: "person", sortOrder: 2 }),
            ],
            currency: "USD",
        });

        const result = await t.query(internal.mcpLedger.accountBalances, { caller });

        expect(result.accounts.map((row) => [row.name, row.kind])).toStrictEqual([
            ["checking", "asset"],
            ["ana", "person"],
            ["pedro", "person"],
        ]);
        expect({ net: result.net, owed: result.owed, owned: result.owned }).toStrictEqual({
            net: 1030,
            owed: 50,
            owned: 1080,
        });
    });

    it("moves a person's balance by what was settled outside Outlayr, either way", async () => {
        const t = await seeded({
            accounts: [account("pedro", { initialBalance: -50, initialBalanceUsd: -50, kind: "person" })],
            currency: "USD",
        });
        const move = (localId: string, amount: number, date: number, deletedAt: number | null = null) => ({
            ...envelope(localId),
            accountId: "pedro",
            amount,
            amountUsd: amount,
            date,
            deletedAt,
            note: "",
        });
        await t.run(async (ctx) => {
            for (const row of [
                move("paid", 30, at("2026-10-01T12:00:00Z")),
                move("borrowed", -20, at("2026-10-02T12:00:00Z")),
                move("undone", 100, at("2026-10-03T12:00:00Z"), 1),
                move("later", 10, at("2026-10-10T12:00:00Z")),
            ]) {
                await ctx.db.insert("outsideMoves", row);
            }
        });

        const result = await t.query(internal.mcpLedger.accountBalances, { caller });

        expect(result.accounts).toStrictEqual([expect.objectContaining({ balance: -40, name: "pedro" })]);
    });
});

describe("budget_status", () => {
    const category = (localId: string, parentId: string | null = null) =>
        ({
            ...envelope(localId),
            color: null,
            dateCreated: null,
            emoji: null,
            icon: null,
            income: false,
            name: localId,
            parentId,
            sortOrder: 0,
        }) satisfies Row<"categories">;

    function budget(
        localId: string,
        fields: Partial<Row<"budgets">> & { amount: number; startDate: number; type: number }
    ) {
        return {
            ...envelope(localId),
            amountUsd: fields.amount,
            categoryId: null,
            currency: "USD",
            dateCreated: fields.startDate,
            green: false,
            name: null,
            rollover: false,
            ...fields,
        } satisfies Row<"budgets">;
    }

    it("rolls stale windows forward and carries what each closed window left", async () => {
        const aug = at("2026-08-01T00:00:00Z");
        const sep = at("2026-09-01T00:00:00Z");
        const sunday = at("2026-09-06T00:00:00Z");
        const { categoryId: _, ...overall } = budget("overall", {
            amount: 1000,
            rollover: true,
            startDate: aug,
            type: BUDGET_TYPE.month,
        });
        const food = budget("food-budget", {
            amount: 300,
            categoryId: "food",
            name: " Eating out ",
            rollover: true,
            startDate: sep,
            type: BUDGET_TYPE.month,
        });
        const rent = budget("rent-budget", {
            amount: 200,
            categoryId: "rent",
            startDate: sunday,
            type: BUDGET_TYPE.week,
        });
        const expenses = [
            entry("aug-groceries", { amount: 100, categoryId: "groceries", date: at("2026-08-10T12:00:00Z") }),
            entry("sep-food", { amount: 50, categoryId: "food", date: at("2026-09-05T12:00:00Z") }),
            entry("sep-groceries", { amount: 120, categoryId: "groceries", date: at("2026-09-20T12:00:00Z") }),
            entry("oct-food", { amount: 40, categoryId: "food", date: at("2026-10-02T12:00:00Z") }),
            entry("oct-rent", { amount: 150, categoryId: "rent", date: at("2026-10-07T12:00:00Z") }),
            entry("oct-groceries", { amount: 30, categoryId: "groceries", date: at("2026-10-08T12:00:00Z") }),
        ];
        const t = await seeded({
            budgets: [rent, food],
            categories: [
                category("food"),
                category("groceries", "food"),
                category("rent"),
                { ...category("stale", "food"), deletedAt: 1 },
            ],
            mainBudget: [overall],
            transactions: [
                ...expenses,
                entry("refund", { amount: 500, categoryId: "food", date: at("2026-10-03T12:00:00Z"), income: true }),
                entry("planned", { amount: 500, categoryId: "food", date: at("2026-10-20T12:00:00Z") }),
                {
                    ...entry("gone", { amount: 500, categoryId: "food", date: at("2026-10-03T12:00:00Z") }),
                    deletedAt: 1,
                },
            ],
        });

        const result = await t.query(internal.mcpLedger.budgetStatus, { caller });

        const now = new Date(NOW);
        const usd = buildRateTable([]);
        const contributions: ExpenseContribution[] = expenses.map((row) => ({
            amount: row.amount,
            categoryId: row.categoryId,
            date: new Date(row.date),
            parentId: row.categoryId === "groceries" ? "food" : null,
        }));
        const expected = (row: typeof food | typeof overall, spentThrough: (start: Date, last: Date) => number) => {
            const window = advanceBudgetWindow(new Date(row.startDate ?? NOW), row.type, now);
            const limit = limitIn(row, window.start, "USD", usd);
            const carry = row.rollover
                ? rolloverCarry({
                      anchor: new Date(row.dateCreated ?? NOW),
                      current: window,
                      limit,
                      spentIn: (start, end) => spentThrough(start, lastMsBefore(end)),
                      type: row.type,
                  }).credit
                : 0;
            const spent = spentThrough(window.start, now);
            return {
                carryOver: carry,
                effectiveLimit: effectiveLimit(limit, carry),
                limit,
                remaining: effectiveLimit(limit, carry) - spent,
                spent,
            };
        };
        const byCategory = (categoryId: string) => (start: Date, last: Date) =>
            spentForCategory(contributions, categoryId, start, last);

        expect(result.overall).toStrictEqual({
            ...expected(overall, (start, last) => spentForMain(contributions, start, last)),
            from: "2026-10-01",
            name: null,
            overBudget: false,
            period: "month",
            rollover: true,
            to: "2026-10-31",
        });
        expect(result.categories).toStrictEqual([
            {
                ...expected(food, byCategory("food")),
                category: "food",
                from: "2026-10-01",
                name: "Eating out",
                overBudget: false,
                period: "month",
                rollover: true,
                subcategories: ["groceries"],
                to: "2026-10-31",
            },
            {
                ...expected(rent, byCategory("rent")),
                category: "rent",
                from: "2026-10-04",
                name: null,
                overBudget: false,
                period: "week",
                rollover: false,
                subcategories: [],
                to: "2026-10-10",
            },
        ]);
    });

    it("cuts windows at the user's midnight, not UTC's", async () => {
        const madrid = 2 * HOUR;
        const madridEntry = (iso: string, fields: Partial<Row<"transactions">> & { amount: number; date: number }) =>
            entry(iso, { ...fields, day: midnightOf(fields.date, madrid) });
        const lateSeptember = madridEntry("late-september", { amount: 60, date: at("2026-09-30T21:00:00Z") });
        const earlyOctober = madridEntry("early-october", { amount: 25, date: at("2026-09-30T23:00:00Z") });
        const { categoryId: _, ...overall } = budget("overall", {
            amount: 100,
            rollover: true,
            startDate: at("2026-08-31T22:00:00Z"),
            type: BUDGET_TYPE.month,
        });
        const t = await seeded({ mainBudget: [overall], transactions: [lateSeptember, earlyOctober] });

        const result = await t.query(internal.mcpLedger.budgetStatus, { caller });

        expect(result.overall).toMatchObject({
            carryOver: overall.amount - lateSeptember.amount,
            from: "2026-10-01",
            spent: earlyOctober.amount,
            to: "2026-10-31",
        });
    });
});

describe("upcoming_charges", () => {
    it("lands each schedule on the user's calendar and costs the month like the Upcoming list", async () => {
        const local = (iso: string) => at(iso) - CARACAS;
        const scheduled = (localId: string, iso: string, fields: Partial<Row<"transactions">> = {}) =>
            entry(localId, {
                amount: 10,
                date: local(iso),
                day: midnightOf(local(iso), CARACAS),
                onceRecurring: true,
                ...fields,
            });
        const rows = [
            scheduled("streaming", "2026-09-30T20:00:00Z", {
                amount: 15.99,
                recurringAnchorDay: 31,
                recurringType: RECURRING_TYPE.monthly,
            }),
            scheduled("gym", "2026-10-05T12:00:00Z", {
                amount: 10,
                amountUsd: 10.87,
                currency: "EUR",
                recurringCoefficient: 2,
                recurringType: RECURRING_TYPE.weekly,
            }),
            scheduled("domain", "2026-03-03T12:00:00Z", { amount: 12, recurringType: RECURRING_TYPE.yearly }),
            scheduled("dentist", "2026-10-20T12:00:00Z", { amount: 80, onceRecurring: false }),
            scheduled("cancelled", "2026-09-01T12:00:00Z", {
                recurringEndDate: local("2026-09-15T12:00:00Z"),
                recurringType: RECURRING_TYPE.monthly,
            }),
            scheduled("salary", "2026-10-01T12:00:00Z", {
                amount: 3000,
                income: true,
                recurringType: RECURRING_TYPE.monthly,
            }),
        ];
        const t = await seeded({
            currency: "EUR",
            transactions: [
                ...rows,
                {
                    ...scheduled("deleted", "2026-10-01T12:00:00Z", { recurringType: RECURRING_TYPE.monthly }),
                    deletedAt: 1,
                },
                scheduled("one-off", "2026-10-02T12:00:00Z", { onceRecurring: false }),
            ],
        });

        const result = await t.query(internal.mcpLedger.upcomingCharges, { caller });

        expect(result.charges.map((charge) => [charge.note, charge.nextCharge])).toStrictEqual([
            ["cancelled", "2026-10-01"],
            ["gym", "2026-10-19"],
            ["dentist", "2026-10-20"],
            ["streaming", "2026-10-31"],
            ["salary", "2026-11-01"],
            ["domain", "2027-03-03"],
        ]);
        expect(result.charges.find((charge) => charge.note === "gym")).toMatchObject({
            amount: 10,
            currency: "EUR",
            repeats: { cadence: "weekly", every: 2 },
        });
        const expected = monthlySubscriptionCost(
            rows.map((row) => ({
                ...row,
                date: new Date(row.date),
                recurringEndDate: row.recurringEndDate === null ? null : new Date(row.recurringEndDate),
            })),
            "EUR",
            buildRateTable(RATES),
            new Date(NOW)
        );
        expect(result.monthlyCost).toStrictEqual(
            expected.map((bucket) => ({
                amount: roundMoney(-bucket.amount, 2),
                currency: bucket.currencyCode,
                schedules: bucket.transactionCount,
            }))
        );
    });
});
