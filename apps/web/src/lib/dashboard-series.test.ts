import { accountBalances, ledgerOverview } from "@outlayr/backend/confect/ledgerView";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import type { Doc, TableNames } from "@outlayr/backend/convex/_generated/dataModel";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import { categoryBudget, categoryDetail, kpis, spendSeries, stackOrder } from "./dashboard-series";
import { cashFlow, categorySpend, dailySpend, monthlyByCategory, netWorthHistory } from "./dashboard-series-insights";
import { endOfDay, prepareLedger } from "./dashboard-series-ledger";
import type { Ledger } from "./dashboard-series-ledger";
import { netWorthSeries } from "./dashboard-series-net-worth";
import { periodOf } from "./dashboard-series-period";

const at = (iso: string) => Date.parse(iso);
const NOW = at("2026-10-20T15:00:00Z");
const ALL = { accounts: [] } as const;
const ALL_CATEGORIES = { ...ALL, category: null } as const;

let sequence = 0;
const envelope = (localId: string) => {
    sequence += 1;
    return { deletedAt: null, deviceId: "device", localId, seq: sequence, updatedAt: 0, userId: "owner" };
};
const docOf = <Table extends TableNames>(row: Omit<Doc<Table>, "_creationTime" | "_id">) =>
    ({ _creationTime: 0, _id: `doc-${(sequence += 1)}`, ...row }) as unknown as Doc<Table>;

const category = (
    localId: string,
    fields: { color: string | null; income?: boolean; name: string; parentId?: string }
) =>
    docOf<"categories">({
        ...envelope(localId),
        dateCreated: 0,
        emoji: null,
        icon: null,
        income: false,
        parentId: null,
        sortOrder: 0,
        ...fields,
    });

const account = (localId: string, name: string, fields: Partial<Doc<"accounts">> = {}) =>
    docOf<"accounts">({
        ...envelope(localId),
        currency: "USD",
        customColor: null,
        dateCreated: 0,
        emoji: null,
        icon: null,
        imageColor: null,
        imageKey: null,
        initialBalance: 0,
        initialBalanceDate: 0,
        initialBalanceUsd: 0,
        name,
        sortOrder: 0,
        ...fields,
    });

interface EntryFields {
    accountId?: string;
    amountUsd?: number | null;
    categoryId?: string | null;
    currency?: string;
    deletedAt?: number | null;
    income?: boolean;
    note?: string;
}

const entry = (localId: string, iso: string, amount: number, fields: EntryFields = {}) =>
    docOf<"transactions">({
        ...envelope(localId),
        accountId: "chase",
        amount,
        amountUsd: amount,
        categoryId: null,
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
        ...fields,
    });

const transfer = (localId: string, iso: string, amount: number) =>
    docOf<"transfers">({
        ...envelope(localId),
        date: at(iso),
        dateCreated: 0,
        day: at(iso),
        exchangeRate: null,
        exchangeRateType: null,
        fromAccountId: "chase",
        fromAmount: amount,
        fromAmountUsd: amount,
        fromCurrency: "USD",
        month: 0,
        note: "",
        toAccountId: "cash",
        toAmount: amount,
        toAmountUsd: amount,
        toCurrency: "USD",
    });

const budget = (categoryId: string, limit: number) =>
    docOf<"budgets">({
        ...envelope(`budget-${categoryId}`),
        amount: limit,
        amountUsd: limit,
        categoryId,
        currency: "USD",
        dateCreated: 0,
        green: false,
        name: null,
        rollover: false,
        startDate: at("2026-10-01T04:00:00Z"),
        type: BUDGET_TYPE.month,
    });

const NO_BOOKS: LedgerBooks = {
    accounts: [],
    appMeta: [],
    budgets: [],
    categories: [],
    exchangeRates: [],
    installmentPlans: [],
    mainBudget: [],
    outsideMoves: [],
    outsidePayments: [],
    transactions: [],
    transfers: [],
};

const caracas = [{ key: "timeZone", value: "America/Caracas" }];

const books = (fields: Partial<LedgerBooks> = {}): LedgerBooks => ({
    ...NO_BOOKS,
    accounts: [account("chase", "Chase"), account("cash", "Cash")],
    appMeta: caracas,
    categories: [
        category("rent", { color: "#e2643f", name: "Rent" }),
        category("groceries", { color: "#4f9d69", name: "Groceries" }),
        category("costco", { color: null, name: "Costco", parentId: "groceries" }),
        category("paycheck", { color: "#3a9bb5", income: true, name: "Paycheck" }),
        category("refund", { color: "#b58a3a", income: true, name: "Refund" }),
    ],
    ...fields,
});

const october = () =>
    books({
        budgets: [budget("groceries", 150)],
        transactions: [
            entry("jun", "2026-06-20T16:00:00Z", 5, { categoryId: "rent" }),
            entry("jul", "2026-07-05T16:00:00Z", 100, { categoryId: "groceries" }),
            entry("aug", "2026-08-05T16:00:00Z", 200, { categoryId: "groceries" }),
            entry("sep", "2026-09-05T16:00:00Z", 300, { categoryId: "groceries" }),
            entry("sep-rent", "2026-09-01T16:00:00Z", 1850, { categoryId: "rent" }),
            entry("rent", "2026-10-01T16:00:00Z", 1850, { categoryId: "rent" }),
            entry("pay", "2026-10-01T16:00:00Z", 3000, { categoryId: "paycheck", income: true }),
            entry("costco", "2026-10-03T16:00:00Z", 100, { categoryId: "costco", note: "Costco" }),
            entry("costco-cash", "2026-10-05T16:00:00Z", 40, {
                accountId: "cash",
                categoryId: "groceries",
                note: "Costco ",
            }),
            entry("refund", "2026-10-08T16:00:00Z", 25, { categoryId: "refund", income: true }),
            entry("loose", "2026-10-09T16:00:00Z", 10),
            entry("euro", "2026-10-10T16:00:00Z", 50, {
                amountUsd: 54,
                categoryId: "groceries",
                currency: "EUR",
                note: "Whole Foods",
            }),
            entry("deleted", "2026-10-06T16:00:00Z", 999, { categoryId: "rent", deletedAt: 1 }),
            entry("future", "2026-10-25T16:00:00Z", 777, { categoryId: "rent" }),
        ],
        transfers: [transfer("move", "2026-10-12T16:00:00Z", 200)],
    });

const oct = periodOf("2026-10", 1);

describe("the numbers agree with the ledger overview", () => {
    const ledger = prepareLedger(october(), NOW);
    const { summary } = ledgerOverview(october(), NOW);

    it("totals spending and income the way the Log does", () => {
        const { income, spent } = kpis(ledger, oct, ALL);

        expect(spent.value).toBe(summary.spent);
        expect(income.value).toBe(summary.income);
        expect([spent.value, income.value]).toStrictEqual([2054, 3025]);
    });

    it("breaks spending into the same categories, subcategories under their parent", () => {
        const shown = categorySpend(ledger, oct, ALL).map(({ label, value }) => ({ amount: value, category: label }));

        expect(shown).toStrictEqual(summary.spentByCategory);
    });

    it("reads a budget the way the budget list does and finds the day it ran out", () => {
        const [standing] = ledgerOverview(october(), NOW).budgets.categories;
        const groceries = categoryBudget(ledger, "groceries", oct);

        expect(groceries).toMatchObject({
            effectiveLimit: standing?.effectiveLimit,
            overBudget: true,
            remaining: standing?.remaining,
            runOut: { day: "2026-10-10", daysEarly: 21 },
            spent: standing?.spent,
        });
    });
});

describe("what counts", () => {
    it("leaves out deleted and future-dated entries", () => {
        const { spent } = kpis(prepareLedger(october(), NOW), oct, ALL);

        expect(spent.value).toBe(2054);
    });

    it("counts a refund as income and a transfer as neither income nor spending", () => {
        const withMove = prepareLedger(october(), NOW);
        const withoutMove = prepareLedger({ ...october(), transfers: [] }, NOW);

        expect(kpis(withMove, oct, ALL).income.value).toBe(3025);
        expect(kpis(withMove, oct, ALL).netWorth.value).toBe(kpis(withoutMove, oct, ALL).netWorth.value);
    });

    it("limits every figure to the chosen accounts", () => {
        const ledger = prepareLedger(october(), NOW);

        expect(kpis(ledger, oct, { accounts: ["cash"] }).spent.value).toBe(40);
        expect(spendSeries(ledger, oct, { accounts: ["cash"], category: null }).spent).toBe(40);
    });

    it("values a foreign-currency entry at its frozen dollar amount", () => {
        const { byAccount } = categoryDetail(prepareLedger(october(), NOW), "groceries", oct, ALL);

        expect(byAccount.find((row) => row.id === "chase")?.amount).toBe(154);
    });

    it("converts into the ledger currency at the entry's day", () => {
        const eur = books({
            appMeta: [...caracas, { key: "currency", value: "EUR" }],
            exchangeRates: [
                docOf<"exchangeRates">({
                    date: "2026-10-01",
                    fetchedAt: 0,
                    quote: "EUR",
                    rate: 0.9,
                    rateType: "official",
                    source: "openexchangerates",
                }),
            ],
            transactions: [entry("coffee", "2026-10-02T16:00:00Z", 100)],
        });

        expect(kpis(prepareLedger(eur, NOW), oct, ALL).spent.value).toBe(90);
    });
});

describe("days and months", () => {
    const lateOctober = at("2026-11-02T15:00:00Z");
    const night = books({ transactions: [entry("late", "2026-11-01T02:00:00Z", 30)] });

    it("puts a late evening in the ledger's zone on its own day, not the next UTC day", () => {
        const ledger = prepareLedger(night, lateOctober);

        expect(kpis(ledger, oct, ALL).spent.value).toBe(30);
        expect(kpis(ledger, periodOf("2026-11", 1), ALL).spent.value).toBe(0);
    });

    it("starts the month on the first day the ledger sets", () => {
        const payday = books({
            appMeta: [...caracas, { key: "firstDayOfMonth", value: "15" }],
            transactions: [entry("before", "2026-10-15T03:00:00Z", 20), entry("on", "2026-10-15T12:00:00Z", 7)],
        });
        const ledger = prepareLedger(payday, lateOctober);

        expect(kpis(ledger, periodOf("2026-09", 15), ALL).spent.value).toBe(20);
        expect(kpis(ledger, periodOf("2026-10", 15), ALL).spent.value).toBe(7);
    });

    it("compares a running month with the same days of the one before", () => {
        const { spent } = kpis(prepareLedger(october(), NOW), oct, ALL);

        expect(spent.prior).toBe(1850 + 300);
        const earlier = prepareLedger(
            books({ transactions: [entry("a", "2026-09-05T16:00:00Z", 100), entry("b", "2026-09-25T16:00:00Z", 900)] }),
            NOW
        );
        expect(kpis(earlier, oct, ALL).spent.prior).toBe(100);
    });
});

describe("a month without income", () => {
    const september = periodOf("2026-09", 1);
    const ledger = prepareLedger(october(), NOW);

    it("draws the whole outflow from savings and keeps nothing", () => {
        const flow = cashFlow(ledger, september, ALL);

        expect(flow.income).toBe(0);
        expect(flow.links.find((link) => link.source === "savings")?.value).toBe(2150);
        expect(flow.nodes.some((node) => node.id === "kept")).toBe(false);
    });

    it("reports no change in income and a negative kept", () => {
        const { income, kept } = kpis(ledger, september, ALL);

        expect([income.value, income.delta, kept.value, kept.share]).toStrictEqual([0, null, -2150, null]);
    });
});

describe("an empty ledger", () => {
    const ledger = prepareLedger(NO_BOOKS, NOW);

    it("reads as zeros and empty lists, never throwing", () => {
        const { income, kept, netWorth, spent } = kpis(ledger, oct, ALL);

        expect([income.value, kept.value, netWorth.value, spent.value]).toStrictEqual([0, 0, 0, 0]);
        expect(spendSeries(ledger, oct, ALL_CATEGORIES).categories).toStrictEqual([]);
        expect(categorySpend(ledger, oct, ALL)).toStrictEqual([]);
        expect(cashFlow(ledger, oct, ALL).links).toStrictEqual([]);
        expect(monthlyByCategory(ledger, oct, ALL).average).toBe(0);
        expect(dailySpend(ledger, oct, ALL).average).toBe(0);
        expect(netWorthHistory(ledger, oct, ALL)).toHaveLength(12);
        expect(categoryDetail(ledger, "groceries", oct, ALL).average).toBeNull();
    });
});

describe("category detail", () => {
    const detail = categoryDetail(prepareLedger(october(), NOW), "groceries", oct, ALL);

    it("merges a merchant's spellings and ranks merchants by amount", () => {
        expect(detail.merchants.map(({ amount, count, name }) => ({ amount, count, name }))).toStrictEqual([
            { amount: 140, count: 2, name: "Costco" },
            { amount: 54, count: 1, name: "Whole Foods" },
        ]);
    });

    it("finds the peak day and the shares by account", () => {
        expect(detail.peak).toStrictEqual({ amount: 100, date: "2026-10-03" });
        expect(detail.byAccount.map(({ id, share }) => [id, Math.round(share * 100)])).toStrictEqual([
            ["chase", 79],
            ["cash", 21],
        ]);
    });

    it("sets this month against the mean of the three before it", () => {
        expect(detail.months.map(({ amount }) => amount)).toStrictEqual([100, 200, 300, 194]);
        expect([detail.average, detail.versus]).toStrictEqual([200, -6]);
    });

    it("gives no average until the three months before lie inside the history", () => {
        const recent = prepareLedger(
            books({ transactions: [entry("only", "2026-09-05T16:00:00Z", 300, { categoryId: "groceries" })] }),
            NOW
        );

        expect(categoryDetail(recent, "groceries", oct, ALL).average).toBeNull();
    });
});

describe("daily spend", () => {
    it("averages without the category holding the month's largest single expense", () => {
        const { average, averageWithout, excluded } = dailySpend(prepareLedger(october(), NOW), oct, ALL);

        expect(excluded).toStrictEqual({ id: "rent", name: "Rent" });
        expect([average, averageWithout]).toStrictEqual([102.7, 10.2]);
    });
});

describe("stack order", () => {
    const orange = { color: "#e2643f", id: "rent", total: 1000 };
    const amber = { color: "#d98a2b", id: "dining", total: 900 };
    const blue = { color: "#4a90d9", id: "transport", total: 50 };

    it("keeps near-identical hues apart", () => {
        expect(stackOrder([orange, amber, blue], null).map((item) => item.id)).toStrictEqual([
            "dining",
            "transport",
            "rent",
        ]);
    });

    it("puts the selected category at the base", () => {
        expect(stackOrder([orange, amber, blue], "dining")[0]?.id).toBe("dining");
    });
});

describe("net worth over time", () => {
    const rate = (quote: string, date: string, value: number) =>
        docOf<"exchangeRates">({
            date,
            fetchedAt: 0,
            quote,
            rate: value,
            rateType: "official",
            source: "openexchangerates",
        });
    const replayed = (ledger: Ledger, accounts: readonly string[], instant: number) =>
        accountBalances(
            accounts.length === 0
                ? ledger.books
                : { ...ledger.books, accounts: ledger.books.accounts.filter((row) => accounts.includes(row.localId)) },
            ledger.currency,
            ledger.rates,
            { now: instant, offsetAt: ledger.offsetAt }
        ).net;
    const newYork = [{ key: "timeZone", value: "America/New_York" }];
    const world = (currency: string) =>
        books({
            accounts: [
                account("chase", "Chase", { initialBalance: 1200.5, sortOrder: 0 }),
                account("euro", "Euro", { currency: "EUR", initialBalance: 800, sortOrder: 1 }),
                account("card", "Card", { initialBalance: -150, sortOrder: 2 }),
            ],
            appMeta: [...newYork, { key: "currency", value: currency }],
            exchangeRates: [
                rate("EUR", "2026-01-01", 0.9),
                rate("EUR", "2026-06-01", 0.95),
                rate("EUR", "2026-10-15", 0.88),
                rate("MXN", "2026-01-01", 18),
            ],
            installmentPlans: [
                docOf<"installmentPlans">({
                    ...envelope("plan"),
                    accountId: "card",
                    dateCreated: 0,
                    transactionId: "t",
                }),
            ],
            outsideMoves: [
                docOf<"outsideMoves">({
                    ...envelope("move"),
                    accountId: "euro",
                    amount: 40.25,
                    amountUsd: 44,
                    date: at("2026-11-01T05:30:00Z"),
                    note: "",
                }),
            ],
            outsidePayments: [
                docOf<"outsidePayments">({
                    ...envelope("paid"),
                    amount: 33.33,
                    amountUsd: 33.33,
                    date: at("2026-03-08T07:00:00Z"),
                    planId: "plan",
                }),
            ],
            transactions: [
                entry("a", "2026-03-08T06:59:00Z", 19.99, { accountId: "chase" }),
                entry("b", "2026-03-08T07:00:00Z", 1500, { accountId: "chase", income: true }),
                entry("c", "2026-03-09T03:59:59Z", 7.1, { accountId: "euro", amountUsd: 7.9, currency: "EUR" }),
                entry("d", "2026-03-09T04:00:00Z", 12.34, { accountId: "card" }),
                entry("e", "2026-10-31T23:00:00Z", 64.2, { accountId: "euro", amountUsd: 71, currency: "EUR" }),
                entry("f", "2026-11-01T05:30:00Z", 410, { accountId: "chase", amountUsd: 22, currency: "MXN" }),
                entry("g", "2026-11-01T06:30:00Z", 88.88, { accountId: "chase", income: true }),
                entry("h", "2026-11-02T04:59:59Z", 3.5, { accountId: "chase", amountUsd: null, currency: "MXN" }),
                entry("i", "2026-11-02T05:00:00Z", 45, {
                    accountId: "euro",
                    amountUsd: 49,
                    currency: "EUR",
                    income: true,
                }),
                ...[0, 1, 2, 3, 4].map((minute) =>
                    entry(`cent-${minute}`, `2026-10-20T10:0${minute}:00Z`, 0.01, {
                        accountId: "euro",
                        amountUsd: 0.01,
                    })
                ),
                entry("gone", "2026-11-01T12:00:00Z", 999, { accountId: "chase", deletedAt: 1 }),
                entry("loose", "2026-11-01T12:00:00Z", 10, { accountId: undefined }),
            ],
            transfers: [
                {
                    ...transfer("swap", "2026-03-08T07:00:00Z", 100),
                    fromAccountId: "chase",
                    toAccountId: "euro",
                    toAmount: 91,
                    toAmountUsd: 100,
                    toCurrency: "EUR",
                },
                { ...transfer("pay-card", "2026-11-01T06:00:00Z", 60.6), fromAccountId: "chase", toAccountId: "card" },
            ],
        });
    const days = ["2026-03-07", "2026-03-08", "2026-03-09", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"];
    const instantsOf = (ledger: Ledger) => [
        ...days.map((day) => endOfDay(ledger, day)),
        ledger.now,
        endOfDay(ledger, days[0] ?? "") - 1,
    ];

    it.each([
        { accounts: [], currency: "USD" },
        { accounts: [], currency: "EUR" },
        { accounts: ["chase", "euro"], currency: "USD" },
        { accounts: ["card"], currency: "EUR" },
    ])(
        "matches replaying the balances at each date, in $currency for $accounts across both DST changes",
        ({ accounts, currency }) => {
            const ledger = prepareLedger(world(currency), NOW);
            const instants = instantsOf(ledger).toReversed();

            expect(netWorthSeries(ledger, { accounts }, instants)).toStrictEqual(
                instants.map((instant) => replayed(ledger, accounts, instant))
            );
        }
    );
});
