import { ledgerGlance } from "@outlayr/backend/confect/ledgerView";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import type { Doc, Id, TableNames } from "@outlayr/backend/convex/_generated/dataModel";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";

import { prepareLedger } from "@/lib/dashboard-series-ledger";
import { periodKeyOf, periodOf } from "@/lib/dashboard-series-period";

import type { Dashboard } from "./dashboard";
import { NO_PHOTOS } from "./photos";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const RECENT_ENTRIES = 25;
// Tight enough that every recent entry stays in the current period, even just after a month turns.
const RECENT_GAP_MS = 1000;
const PAST_MONTHS = 5;
const UPCOMING = 3;

const envelope = <Table extends TableNames>(localId: string, seq: number) => ({
    _creationTime: 0,
    // SAFETY: sample rows never reach Convex, so an id only has to be unique among them.
    _id: localId as Id<Table>,
    dateCreated: 0,
    deletedAt: null,
    deviceId: "sample",
    emoji: null,
    icon: null,
    localId,
    seq,
    updatedAt: 0,
    userId: "sample",
});

const account = (name: string, seq: number): Doc<"accounts"> => ({
    ...envelope<"accounts">(name, seq),
    currency: "USD",
    customColor: null,
    imageColor: null,
    imageKey: null,
    initialBalance: 2500,
    initialBalanceDate: 0,
    initialBalanceUsd: 2500,
    name,
    sortOrder: seq,
});

const category = (name: string, seq: number): Doc<"categories"> => ({
    ...envelope<"categories">(name, seq),
    color: "#767676",
    income: false,
    name,
    parentId: null,
    sortOrder: seq,
});

const CARD = { creditLimit: 5000, initialBalance: -640, initialBalanceUsd: -640, kind: "liability" } as const;
const ACCOUNTS = ["Checking", "Savings", "Credit card", "Cash", "Brokerage", "Travel card"].map((name, seq) => ({
    ...account(name, seq),
    ...(name.endsWith("card") && CARD),
}));
// Kept out of ACCOUNTS, which entries index into, so no sample entry lands on a person.
const PEOPLE = (
    [
        ["Ana", 120],
        ["Elena", -1200],
        ["Luis", -260],
    ] as const
).map(([name, balance], index) => ({
    ...account(name, ACCOUNTS.length + index),
    initialBalance: balance,
    initialBalanceUsd: balance,
    kind: "person" as const,
}));
const CATEGORIES = ["Groceries", "Dining out", "Transport", "Home", "Health"].map(category);

const budget = (spentOn: Doc<"categories">, seq: number, startDate: number): Doc<"budgets"> => {
    const { emoji: _emoji, icon: _icon, ...base } = envelope<"budgets">(`budget-${seq}`, seq);
    return {
        ...base,
        amount: 600,
        amountUsd: 600,
        categoryId: spentOn.localId,
        currency: "USD",
        green: false,
        name: null,
        rollover: false,
        startDate,
        type: BUDGET_TYPE.month,
    };
};

const YEAR_MS = 365 * DAY_MS;
const goal = (
    name: string,
    seq: number,
    now: number,
    fields: { start: number; target: number }
): Doc<"savingsGoals"> => {
    const { emoji: _emoji, icon: _icon, ...base } = envelope<"savingsGoals">(`goal-${seq}`, seq);
    return {
        ...base,
        accountId: ACCOUNTS[seq]?.localId ?? "",
        currency: "USD",
        dateCreated: now - PAST_MONTHS * MONTH_MS,
        exchangeRate: null,
        name,
        sortOrder: seq,
        startAmount: fields.start,
        startAmountUsd: fields.start,
        targetAmount: fields.target,
        targetAmountUsd: fields.target,
        targetDate: now + YEAR_MS,
    };
};

const entry = (
    date: number,
    seq: number,
    fields: { amount: number; income?: boolean; recurringType?: number }
): Doc<"transactions"> => ({
    ...envelope<"transactions">(`entry-${seq}`, seq),
    accountId: ACCOUNTS[seq % ACCOUNTS.length]?.localId ?? null,
    amountUsd: fields.amount,
    categoryId: CATEGORIES[seq % CATEGORIES.length]?.localId ?? null,
    currency: "USD",
    customColor: null,
    date,
    day: date,
    details: null,
    exchangeRate: null,
    exchangeRateType: null,
    imageColor: null,
    imageKey: null,
    income: false,
    month: 0,
    note: "Sample entry",
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: RECURRING_TYPE.none,
    ...fields,
});

function sampleBooks(now: number): LedgerBooks {
    const recent = Array.from({ length: RECENT_ENTRIES }, (_, index) =>
        entry(now - index * RECENT_GAP_MS, index, { amount: 40 + index * 3 })
    );
    const past = Array.from({ length: PAST_MONTHS }, (_, index) =>
        entry(now - (index + 1) * MONTH_MS, RECENT_ENTRIES + index, { amount: 600 })
    );
    const income = entry(now, RECENT_ENTRIES + PAST_MONTHS, { amount: 3000, income: true });
    // Charged weeks ago and monthly, so each one is due again inside the Upcoming window.
    const charges = Array.from({ length: UPCOMING }, (_, index) =>
        entry(now - (20 + index * 3) * DAY_MS, RECENT_ENTRIES + PAST_MONTHS + 1 + index, {
            amount: 15,
            recurringType: RECURRING_TYPE.monthly,
        })
    );
    return {
        accounts: [...ACCOUNTS, ...PEOPLE],
        // Without a stored zone the ledger infers one from each row's `day`, which these rows do not model.
        appMeta: [{ key: "timeZone", value: "UTC" }],
        budgets: CATEGORIES.slice(0, 3).map((each, index) => budget(each, index, now - PAST_MONTHS * MONTH_MS)),
        categories: CATEGORIES,
        exchangeRates: [],
        installmentPlans: [],
        installments: [],
        savingsGoals: [
            goal("Emergency fund", 1, now, { start: 1000, target: 10_000 }),
            goal("Trip", 4, now, { start: 500, target: 4000 }),
        ],
        mainBudget: [],
        outsideMoves: [],
        outsidePayments: [],
        transactions: [...past, ...recent, income, ...charges],
        transfers: [],
    };
}

export function sampleDashboard(now: number): Dashboard {
    const books = sampleBooks(now);
    const ledger = prepareLedger(books, now);
    const currentKey = periodKeyOf(ledger.today, ledger.firstDayOfMonth);
    const period = periodOf(currentKey, ledger.firstDayOfMonth);
    return {
        filters: {
            accounts: [],
            categories: [],
            category: null,
            currentKey,
            period,
            span: period,
        },
        ledger,
        overview: ledgerGlance(books, now),
        photos: NO_PHOTOS,
        restoring: false,
        setFilters: () => undefined,
    };
}
