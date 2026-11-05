import type { Overview } from "./overview";

const entry = (note: string, category: string, account: string, amount: number, date: string, time: string) => ({
    account,
    amount,
    category,
    currency: "USD",
    date,
    emoji: null,
    imageKey: null,
    kind: amount < 0 ? ("expense" as const) : ("income" as const),
    note,
    time,
});

const budget = (category: string, limit: number, spent: number) => ({
    carryOver: 0,
    category,
    effectiveLimit: limit,
    from: "2026-11-01",
    limit,
    name: null,
    overBudget: spent > limit,
    period: "month",
    remaining: limit - spent,
    rollover: false,
    spent,
    subcategories: [],
    to: "2026-11-30",
});

const account = (name: string, balance: number) => ({
    balance,
    balanceInMainCurrency: balance,
    currency: "USD",
    emoji: null,
    exact: true,
    imageKey: null,
    kind: balance < 0 ? "liability" : "asset",
    name,
});

/** A typical month, laid out unseen so the loading skeleton takes the shape the ledger will. */
export const SAMPLE_OVERVIEW: Overview = {
    balances: {
        accounts: [
            account("Checking", 11_876.26),
            account("Savings", 9450),
            account("Wallet", 3407.15),
            account("Card", -893.8),
        ],
        currency: "USD",
        net: 23_839.61,
        owed: 893.8,
        owned: 24_733.41,
    },
    budgets: {
        categories: [budget("Groceries", 300, 112.06), budget("Shopping", 250, 89), budget("Dining out", 250, 43.75)],
        currency: "USD",
        overall: { ...budget("Overall", 3900, 1222.79), name: null },
    },
    entries: [
        entry("Salary", "Salary", "Checking", 2400, "2026-11-05", "09:00"),
        entry("Coffee", "Dining out", "Wallet", -5.25, "2026-11-05", "08:00"),
        entry("Software", "Software", "Card", -4.8, "2026-11-04", "14:00"),
        entry("Groceries", "Groceries", "Checking", -112.06, "2026-11-03", "11:00"),
        entry("Taxi", "Transport", "Checking", -14.6, "2026-11-03", "18:30"),
        entry("Sneakers", "Shopping", "Card", -89, "2026-11-02", "12:15"),
    ],
    nextChangeAt: 0,
    summary: {
        currency: "USD",
        from: "2026-11-01",
        income: 2400,
        spent: 1222.79,
        spentByCategory: [],
        spentByDay: [
            { amount: 89, date: "2026-11-02" },
            { amount: 126.66, date: "2026-11-03" },
            { amount: 4.8, date: "2026-11-04" },
            { amount: 5.25, date: "2026-11-05" },
        ],
        to: "2026-11-30",
        today: "2026-11-05",
    },
    upcoming: {
        charges: [
            {
                amount: -1850,
                category: "Rent",
                currency: "USD",
                endsOn: null,
                kind: "expense",
                nextCharge: "2026-12-01",
                note: "Rent",
                repeats: { cadence: "monthly", every: 1 },
            },
        ],
        currency: "USD",
        monthlyCost: [{ amount: 1850, currency: "USD", schedules: 1 }],
    },
};
