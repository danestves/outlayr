import { addDays, firstOfMonth, startOfDay, startOfWeek } from "@outlayr/money/calendar";
import { SUGGESTED_CATEGORY_PRESETS } from "@outlayr/money/category-rules";
import type { CanonicalCategoryName } from "@outlayr/money/contract";
import { landingDate, RECURRING_TYPE } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";

import type { LogFigures, LogMeasure } from "../../../../native/src/domain/log-measure";
import { chargesInWeekAhead } from "../../../../native/src/domain/upcoming";

export const DEMO_NOW = new Date(2026, 8, 12, 10, 30);
export const DEMO_CURRENCY = "USD";
const VES_PER_USD = 807.3862;
const SUNDAY = 1;

type CategoryName = CanonicalCategoryName<"expense"> | CanonicalCategoryName<"income">;
export type LogoName = "ally" | "amex" | "applecard" | "banesco" | "chase" | "paypal" | "zinli";

export interface DemoAccount {
    balance: number;
    color: string;
    currency: "USD" | "VES";
    icon: string;
    id: string;
    kind: "asset" | "liability";
    logo: LogoName | null;
    name: string;
}

export const ACCOUNTS = [
    {
        balance: 12_480.32,
        color: "#1567B0",
        currency: "USD",
        icon: "Bank",
        id: "acc-chase",
        kind: "asset",
        logo: "chase",
        name: "Chase",
    },
    {
        balance: 9450,
        color: "#6B4FBB",
        currency: "USD",
        icon: "PiggyBank",
        id: "acc-savings",
        kind: "asset",
        logo: "ally",
        name: "Ally Savings",
    },
    {
        balance: 3412.4,
        color: "#7BD1FF",
        currency: "USD",
        icon: "Bank",
        id: "acc-zinli",
        kind: "asset",
        logo: "zinli",
        name: "Zinli",
    },
    {
        balance: 486_000,
        color: "#2D7A3E",
        currency: "VES",
        icon: "Bank",
        id: "acc-banesco",
        kind: "asset",
        logo: "banesco",
        name: "Banesco",
    },
    {
        balance: 612.8,
        color: "#1B64C4",
        currency: "USD",
        icon: "Wallet02",
        id: "acc-paypal",
        kind: "asset",
        logo: "paypal",
        name: "PayPal",
    },
    {
        balance: -842.15,
        color: "#1D1D1F",
        currency: "USD",
        icon: "CreditCard",
        id: "acc-apple",
        kind: "liability",
        logo: "applecard",
        name: "Apple Card",
    },
    {
        balance: -1240.55,
        color: "#2E6F9E",
        currency: "USD",
        icon: "CreditCard",
        id: "acc-amex",
        kind: "liability",
        logo: "amex",
        name: "Amex Gold",
    },
    {
        balance: 220,
        color: "#C8C2B4",
        currency: "USD",
        icon: "Wallet01",
        id: "acc-cash",
        kind: "asset",
        logo: null,
        name: "Cash",
    },
] as const satisfies readonly DemoAccount[];

type AccountId = (typeof ACCOUNTS)[number]["id"];

const ROLE = {
    amex: "acc-amex",
    card: "acc-apple",
    freelance: "acc-zinli",
    main: "acc-chase",
    paypal: "acc-paypal",
} as const satisfies Record<string, AccountId>;

interface Seed {
    a: keyof typeof ROLE;
    amt: number;
    cat: CategoryName;
    d: number;
    every?: number;
    h: number;
    inc?: true;
    lead?: number;
    note: string;
}

const SEPTEMBER: readonly Seed[] = [
    { a: "main", amt: 5200, cat: "Paycheck", d: 1, h: 9, inc: true, note: "Paycheck" },
    { a: "main", amt: 1850, cat: "Rent", d: 1, h: 10, note: "Rent" },
    { a: "card", amt: 22.99, cat: "Entertainment", d: 1, h: 20, note: "Netflix" },
    { a: "main", amt: 128.43, cat: "Groceries", d: 2, h: 11, note: "Whole Foods Market" },
    { a: "card", amt: 18.2, cat: "Transport", d: 2, h: 19, note: "Uber" },
    { a: "card", amt: 11.99, cat: "Entertainment", d: 3, h: 8, note: "Spotify" },
    { a: "card", amt: 32.15, cat: "Dining Out", d: 3, h: 20, note: "DoorDash" },
    { a: "main", amt: 58.4, cat: "Fuel", d: 4, h: 17, note: "Shell" },
    { a: "card", amt: 76.3, cat: "Shopping", d: 5, h: 13, note: "Amazon" },
    { a: "main", amt: 85, cat: "Phone & Internet", d: 5, h: 15, note: "Verizon" },
    { a: "main", amt: 64.12, cat: "Groceries", d: 6, h: 10, note: "Trader Joe's" },
    { a: "card", amt: 9.99, cat: "Subscriptions", d: 6, h: 14, note: "iCloud" },
    { a: "card", amt: 27.85, cat: "Dining Out", d: 7, h: 20, note: "Uber Eats" },
    { a: "card", amt: 20, cat: "Subscriptions", d: 8, h: 9, note: "ChatGPT" },
    { a: "main", amt: 112.34, cat: "Utilities", d: 8, h: 16, note: "Con Edison" },
    { a: "freelance", amt: 1450, cat: "Freelance", d: 9, h: 12, inc: true, note: "Freelance" },
    { a: "amex", amt: 54.28, cat: "Shopping", d: 9, h: 12, note: "Target" },
    { a: "paypal", amt: 15, cat: "Subscriptions", d: 9, h: 18, note: "Figma" },
    { a: "main", amt: 186.77, cat: "Groceries", d: 10, h: 11, note: "Costco" },
    { a: "card", amt: 14.6, cat: "Transport", d: 10, h: 22, note: "Lyft" },
    { a: "amex", amt: 89, cat: "Shopping", d: 11, h: 13, note: "Nike" },
    { a: "card", amt: 4, cat: "Subscriptions", d: 11, h: 15, note: "GitHub" },
];

const RECURRING: readonly Seed[] = [
    { a: "main", amt: 5200, cat: "Paycheck", d: 1, h: 9, inc: true, note: "Paycheck" },
    { a: "main", amt: 1850, cat: "Rent", d: 1, h: 10, note: "Rent" },
    { a: "card", amt: 22.99, cat: "Entertainment", d: 1, h: 20, note: "Netflix" },
    { a: "card", amt: 11.99, cat: "Entertainment", d: 3, h: 8, note: "Spotify" },
    { a: "main", amt: 85, cat: "Phone & Internet", d: 5, h: 15, note: "Verizon" },
    { a: "card", amt: 9.99, cat: "Subscriptions", d: 6, h: 14, note: "iCloud" },
    { a: "card", amt: 20, cat: "Subscriptions", d: 8, h: 9, note: "ChatGPT" },
    { a: "main", amt: 107.8, cat: "Utilities", d: 8, h: 16, note: "Con Edison" },
    { a: "paypal", amt: 15, cat: "Subscriptions", d: 9, h: 18, note: "Figma" },
    { a: "freelance", amt: 1450, cat: "Freelance", d: 12, h: 12, inc: true, note: "Freelance" },
    { a: "main", amt: 142.6, cat: "Groceries", d: 13, h: 11, note: "Whole Foods Market" },
    { a: "card", amt: 24.5, cat: "Transport", d: 14, h: 19, note: "Uber" },
    { a: "card", amt: 41.2, cat: "Dining Out", d: 15, h: 20, note: "DoorDash" },
    { a: "main", amt: 62.1, cat: "Fuel", d: 17, h: 17, note: "Shell" },
    { a: "main", amt: 171.35, cat: "Groceries", d: 19, h: 11, note: "Costco" },
    { a: "card", amt: 58.9, cat: "Shopping", d: 21, h: 13, note: "Amazon" },
    { a: "card", amt: 33.4, cat: "Dining Out", d: 23, h: 20, note: "Uber Eats" },
    { a: "main", amt: 78.25, cat: "Groceries", d: 25, h: 10, note: "Trader Joe's" },
    { a: "card", amt: 17.9, cat: "Transport", d: 27, h: 22, note: "Lyft" },
    { a: "card", amt: 129, cat: "Shopping", d: 28, h: 14, note: "IKEA" },
];

const SUBSCRIPTIONS: readonly { month: number; row: Seed; year: number }[] = [
    { month: 8, row: { a: "card", amt: 24.99, cat: "Subscriptions", d: 15, h: 7, note: "Planet Fitness" }, year: 2026 },
    {
        month: 11,
        row: { a: "amex", amt: 139, cat: "Shopping", d: 20, every: RECURRING_TYPE.yearly, h: 9, note: "Amazon Prime" },
        year: 2025,
    },
];

const SCHEDULE_LEADS = new Map<string, number | null>([
    ["Amazon Prime", null],
    ["ChatGPT", null],
    ["Netflix", 1],
    ["Planet Fitness", null],
    ["Rent", null],
    ["Spotify", null],
    ["Verizon", null],
    ["iCloud", null],
]);

export interface DemoRow {
    accountId: AccountId;
    amount: number;
    amountUsd: number;
    category: CategoryName;
    currency: "USD";
    date: Date;
    id: string;
    income: boolean;
    note: string;
    recurringAnchorDay: number | null;
    recurringCoefficient: number;
    recurringType: number;
    reminderLeadDays: number | null;
}

function buildRows(): DemoRow[] {
    const entries = [
        ...SEPTEMBER.map((row) => ({ month: 9, row, year: 2026 })),
        ...[8, 7, 6].flatMap((month) => RECURRING.map((row) => ({ month, row, year: 2026 }))),
        ...SUBSCRIPTIONS,
    ];
    const carriers = new Set<string>();
    return entries.map(({ month, row, year }, index) => {
        const carrier = SCHEDULE_LEADS.has(row.note) && !carriers.has(row.note);
        if (carrier) {
            carriers.add(row.note);
        }
        return {
            accountId: ROLE[row.a],
            amount: row.amt,
            amountUsd: row.amt,
            category: row.cat,
            currency: "USD",
            date: new Date(year, month - 1, row.d, row.h, 0),
            id: `row-${index}`,
            income: row.inc === true,
            note: row.note,
            recurringAnchorDay: carrier ? row.d : null,
            recurringCoefficient: 1,
            recurringType: carrier ? (row.every ?? RECURRING_TYPE.monthly) : 0,
            reminderLeadDays: carrier ? (SCHEDULE_LEADS.get(row.note) ?? null) : null,
        };
    });
}

export const ROWS: readonly DemoRow[] = buildRows();

export interface CategoryStyle {
    color: string;
    icon: string;
}

const PRESETS = new Map(
    [...SUGGESTED_CATEGORY_PRESETS.expense, ...SUGGESTED_CATEGORY_PRESETS.income].map(({ name, ...style }) => [
        name,
        style,
    ])
);

export function categoryStyle(name: CategoryName): CategoryStyle {
    const style = PRESETS.get(name);
    if (!style) {
        throw new Error(`No preset for category ${name}`);
    }
    return style;
}

const signed = (row: Pick<DemoRow, "amountUsd" | "income">) => (row.income ? row.amountUsd : -row.amountUsd);
const cents = (value: number) => roundMoney(value, 2);
const settled = (now: Date) => ROWS.filter((row) => row.date.getTime() <= now.getTime());

export interface DaySection {
    day: Date;
    rows: DemoRow[];
    total: number;
}

export function daySections(now: Date, days: number): DaySection[] {
    const from = addDays(startOfDay(now), -days).getTime();
    const byDay = new Map<number, DemoRow[]>();
    for (const row of settled(now)) {
        const key = startOfDay(row.date).getTime();
        if (key >= from) {
            byDay.set(key, [...(byDay.get(key) ?? []), row]);
        }
    }
    return [...byDay.entries()]
        .toSorted(([a], [b]) => b - a)
        .map(([key, rows]) => ({
            day: new Date(key),
            rows: rows.toSorted((a, b) => b.date.getTime() - a.date.getTime()),
            total: cents(rows.reduce((sum, row) => sum + signed(row), 0)),
        }));
}

function figuresBetween(start: Date, end: Date): LogFigures {
    const rows = ROWS.filter((row) => row.date.getTime() >= start.getTime() && row.date.getTime() <= end.getTime());
    const sum = (income: boolean) =>
        cents(rows.filter((row) => row.income === income).reduce((total, row) => total + row.amountUsd, 0));
    return { count: rows.length, currencyCode: DEMO_CURRENCY, expense: sum(false), income: sum(true) };
}

export interface WeekFigures {
    current: LogFigures;
    previous: LogFigures;
}

export function weekFigures(now: Date): WeekFigures {
    const start = startOfWeek(now, SUNDAY);
    return { current: figuresBetween(start, now), previous: figuresBetween(addDays(start, -7), addDays(now, -7)) };
}

const DAY_END_MS = 86_399_000;

function weekEdges(now: Date): number[] {
    const today = startOfDay(now);
    return Array.from({ length: 8 }, (_, index) => addDays(today, index - 7).getTime() + DAY_END_MS);
}

export function sparkline(now: Date, measure: LogMeasure): number[] {
    const edges = weekEdges(now);
    const windowStart = edges[0] ?? 0;
    const sorted = settled(now).toSorted((a, b) => a.date.getTime() - b.date.getTime());
    const before = (edge: number) => sorted.filter((row) => row.date.getTime() < edge);
    if (measure === "net") {
        return edges.map((edge) =>
            cents(before(edge).reduce((sum, row) => sum + (row.income ? row.amount : -row.amount), 0))
        );
    }
    const wantIncome = measure === "in";
    return edges.map((edge, index) => {
        const floor = Math.max(windowStart, edges[index - 1] ?? Number.NEGATIVE_INFINITY);
        return cents(
            sorted
                .filter((row) => row.income === wantIncome && row.date.getTime() > floor && row.date.getTime() < edge)
                .reduce((sum, row) => sum + row.amount, 0)
        );
    });
}

const toUsd = (account: DemoAccount) => (account.currency === "VES" ? account.balance / VES_PER_USD : account.balance);

export interface AccountsOverview {
    count: number;
    rows: readonly (typeof ACCOUNTS)[number][];
    total: number;
}

export function accountsOverview(): AccountsOverview {
    const rows = ACCOUNTS.filter((account) => account.kind === "asset");
    return { count: rows.length, rows, total: cents(rows.reduce((sum, account) => sum + toUsd(account), 0)) };
}

export function youOwe(): number {
    return cents(
        -ACCOUNTS.filter((account) => account.kind === "liability").reduce((sum, account) => sum + toUsd(account), 0)
    );
}

export interface UpcomingCharge {
    landing: Date;
    row: DemoRow;
}

export function upcoming(now: Date): UpcomingCharge[] {
    return ROWS.filter((row) => row.recurringType > 0)
        .map((row) => ({ landing: landingDate(row, now), row }))
        .toSorted((a, b) => a.landing.getTime() - b.landing.getTime());
}

export function weekAhead(now: Date): number {
    const due = chargesInWeekAhead(
        ROWS.filter((row) => row.recurringType > 0),
        now
    );
    return cents(due.reduce((sum, row) => sum + signed(row), 0));
}

export function categoryTotals(now: Date): Map<CategoryName, number> {
    const totals = new Map<CategoryName, number>();
    for (const row of settled(now)) {
        if (!row.income && row.date.getTime() >= firstOfMonth(now).getTime()) {
            totals.set(row.category, cents((totals.get(row.category) ?? 0) + row.amountUsd));
        }
    }
    return totals;
}

const MAIN_BUDGET = 3900;
const BUDGETS = new Map<CategoryName, number>([
    ["Groceries", 350],
    ["Dining Out", 250],
    ["Transport", 150],
    ["Fuel", 120],
    ["Entertainment", 100],
    ["Utilities", 200],
    ["Shopping", 300],
]);

export interface BudgetPace {
    daysLeft: number;
    left: number;
    limit: number;
    over: CategoryName[];
    perDay: number;
    spent: number;
}

export function budgetPace(now: Date): BudgetPace {
    const totals = categoryTotals(now);
    const spent = cents([...totals.values()].reduce((sum, value) => sum + value, 0));
    const left = cents(MAIN_BUDGET - spent);
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    return {
        daysLeft,
        left,
        limit: MAIN_BUDGET,
        over: [...BUDGETS].filter(([name, limit]) => (totals.get(name) ?? 0) > limit).map(([name]) => name),
        perDay: daysLeft > 0 ? cents(left / daysLeft) : left,
        spent,
    };
}
