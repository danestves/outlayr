import type { Overview } from "./overview";

const look = { color: null, emoji: null, icon: null, imageKey: null };

const entry = (note: string, account: string, amount: number, time: string) => ({
    account,
    amount: Math.abs(amount),
    category: null,
    currency: "USD",
    fee: null,
    id: `${note}-${time}`,
    isFee: false,
    kind: amount < 0 ? ("expense" as const) : ("income" as const),
    look,
    note,
    recurring: false,
    time,
    type: "entry" as const,
    valued: null,
});

const day = (date: string, rows: ReturnType<typeof entry>[]) => ({
    date,
    rows,
    totals: [
        {
            amount: rows.reduce((sum, row) => sum + (row.kind === "income" ? row.amount : -row.amount), 0),
            currency: "USD",
        },
    ],
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
    exact: true,
    kind: balance < 0 ? "liability" : "asset",
    look: { ...look, name, person: false },
    name,
});

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
    log: [
        day("2026-11-05", [entry("Salary", "Checking", 2400, "09:00"), entry("Coffee", "Wallet", -5.25, "08:00")]),
        day("2026-11-04", [entry("Software", "Card", -4.8, "14:00")]),
        day("2026-11-03", [
            entry("Taxi", "Checking", -14.6, "18:30"),
            entry("Groceries", "Checking", -112.06, "11:00"),
        ]),
        day("2026-11-02", [entry("Sneakers", "Card", -89, "12:15")]),
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
                amount: 1850,
                cadence: "monthly",
                currency: "USD",
                every: 1,
                fee: null,
                id: "rent",
                kind: "expense",
                look,
                nextCharge: "2026-12-01",
                note: "Rent",
                valued: null,
            },
        ],
        currency: "USD",
        monthlyCost: [{ amount: 1850, currency: "USD", schedules: 1 }],
    },
};
