import { ledgerGlance } from "@outlayr/backend/confect/ledgerView";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import type { Doc, Id, TableNames } from "@outlayr/backend/convex/_generated/dataModel";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";

import { prepareLedger } from "@/lib/dashboard-series-ledger";
import { periodKeyOf, periodOf } from "@/lib/dashboard-series-period";

import type { Dashboard } from "./dashboard";
import { NO_PHOTOS } from "./photos";

const HOUR_MS = 3_600_000;
const MONTH_MS = 30 * 24 * HOUR_MS;
const RECENT_ENTRIES = 25;
// Tight enough that every recent entry stays in the current period, even just after a month turns.
const RECENT_GAP_MS = 1000;
const PAST_MONTHS = 5;

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

const ACCOUNTS = ["Checking", "Savings", "Credit card"].map(account);
const CATEGORIES = ["Groceries", "Dining out", "Transport", "Home", "Health"].map(category);

const entry = (date: number, seq: number, fields: { amount: number; income?: boolean }): Doc<"transactions"> => ({
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
    return {
        accounts: ACCOUNTS,
        // Without a stored zone the ledger infers one from each row's `day`, which these rows do not model.
        appMeta: [{ key: "timeZone", value: "UTC" }],
        budgets: [],
        categories: CATEGORIES,
        exchangeRates: [],
        installmentPlans: [],
        mainBudget: [],
        outsideMoves: [],
        outsidePayments: [],
        transactions: [...past, ...recent, income],
        transfers: [],
    };
}

export function sampleDashboard(now: number): Dashboard {
    const books = sampleBooks(now);
    const ledger = prepareLedger(books, now);
    const currentKey = periodKeyOf(ledger.today, ledger.firstDayOfMonth);
    return {
        filters: {
            accounts: [],
            category: null,
            currentKey,
            period: periodOf(currentKey, ledger.firstDayOfMonth),
        },
        ledger,
        overview: ledgerGlance(books, now),
        photos: NO_PHOTOS,
        setFilters: () => undefined,
    };
}
