import { addDays, firstOfMonth, startOfDay, startOfWeek } from "@outlayr/money/calendar";
import { SUGGESTED_CATEGORY_PRESETS } from "@outlayr/money/category-rules";
import type { CanonicalCategoryName } from "@outlayr/money/contract";
import { decimalsFor } from "@outlayr/money/currency";
import { landingDate, RECURRING_TYPE } from "@outlayr/money/recurrence";
import { roundMoney } from "@outlayr/money/round";

import type { LogFigures, LogMeasure } from "../../../../native/src/domain/log-measure";
import { chargesInWeekAhead } from "../../../../native/src/domain/upcoming";
import type { Brand, DemoCast, MerchantRole } from "./cast";
import { SUNDAY } from "./dates";
import { GLOBAL } from "./global-brands";
import type { GlobalBrand } from "./global-brands";

export const DEMO_NOW = new Date(2026, 8, 12, 10, 30);

type CategoryName = CanonicalCategoryName<"expense"> | CanonicalCategoryName<"income">;

export interface DemoAccount {
    balance: number;
    color: string;
    currency: string;
    icon: string;
    id: AccountId;
    kind: "asset" | "liability";
    logo: string | null;
    name: string;
}

type AccountRole = "bank" | "savings" | "wallet" | "foreign" | "payments" | "credit" | "credit2";

const ACCOUNT_SEEDS = [
    { balance: 12_480.32, color: "#1567B0", icon: "Bank", id: "acc-bank", kind: "asset", role: "bank" },
    { balance: 9450, color: "#6B4FBB", icon: "PiggyBank", id: "acc-savings", kind: "asset", role: "savings" },
    { balance: 3412.4, color: "#7BD1FF", icon: "Bank", id: "acc-wallet", kind: "asset", role: "wallet" },
    { balance: 1200, color: "#2D7A3E", icon: "Bank", id: "acc-foreign", kind: "asset", role: "foreign" },
    { balance: 612.8, color: "#1B64C4", icon: "Wallet02", id: "acc-payments", kind: "asset", role: "payments" },
    { balance: -842.15, color: "#1D1D1F", icon: "CreditCard", id: "acc-credit", kind: "liability", role: "credit" },
    { balance: -1240.55, color: "#2E6F9E", icon: "CreditCard", id: "acc-credit2", kind: "liability", role: "credit2" },
    { balance: 220, color: "#C8C2B4", icon: "Wallet01", id: "acc-cash", kind: "asset", role: null },
] as const satisfies readonly {
    balance: number;
    color: string;
    icon: string;
    id: string;
    kind: DemoAccount["kind"];
    role: AccountRole | null;
}[];

export type AccountId = (typeof ACCOUNT_SEEDS)[number]["id"];

const SPENDER = {
    amex: ["acc-credit2", "acc-credit"],
    card: ["acc-credit"],
    freelance: ["acc-wallet", "acc-bank"],
    main: ["acc-bank"],
    paypal: ["acc-payments", "acc-credit"],
} as const satisfies Record<string, readonly AccountId[]>;

type Label = "paycheck" | "rent" | "freelance";
type Payee = MerchantRole | GlobalBrand | Label;

const LABELS: Record<Label, string> = { freelance: "Freelance", paycheck: "Paycheck", rent: "Rent" };

interface Seed {
    a: keyof typeof SPENDER;
    amt: number;
    cat: CategoryName;
    d: number;
    every?: number;
    h: number;
    inc?: true;
    who: Payee;
}

const SEPTEMBER: readonly Seed[] = [
    { a: "main", amt: 5200, cat: "Paycheck", d: 1, h: 9, inc: true, who: "paycheck" },
    { a: "main", amt: 1850, cat: "Rent", d: 1, h: 10, who: "rent" },
    { a: "card", amt: 22.99, cat: "Entertainment", d: 1, h: 20, who: "netflix" },
    { a: "main", amt: 128.43, cat: "Groceries", d: 2, h: 11, who: "grocery2" },
    { a: "card", amt: 18.2, cat: "Transport", d: 2, h: 19, who: "ride" },
    { a: "card", amt: 11.99, cat: "Entertainment", d: 3, h: 8, who: "spotify" },
    { a: "card", amt: 32.15, cat: "Dining Out", d: 3, h: 20, who: "delivery" },
    { a: "main", amt: 58.4, cat: "Fuel", d: 4, h: 17, who: "fuel" },
    { a: "card", amt: 76.3, cat: "Shopping", d: 5, h: 13, who: "online" },
    { a: "main", amt: 85, cat: "Phone & Internet", d: 5, h: 15, who: "telco" },
    { a: "main", amt: 64.12, cat: "Groceries", d: 6, h: 10, who: "grocery3" },
    { a: "card", amt: 9.99, cat: "Subscriptions", d: 6, h: 14, who: "icloud" },
    { a: "card", amt: 27.85, cat: "Dining Out", d: 7, h: 20, who: "delivery2" },
    { a: "card", amt: 20, cat: "Subscriptions", d: 8, h: 9, who: "chatgpt" },
    { a: "main", amt: 112.34, cat: "Utilities", d: 8, h: 16, who: "utility" },
    { a: "freelance", amt: 1450, cat: "Freelance", d: 9, h: 12, inc: true, who: "freelance" },
    { a: "amex", amt: 54.28, cat: "Shopping", d: 9, h: 12, who: "store" },
    { a: "paypal", amt: 15, cat: "Subscriptions", d: 9, h: 18, who: "figma" },
    { a: "main", amt: 186.77, cat: "Groceries", d: 10, h: 11, who: "grocery" },
    { a: "card", amt: 14.6, cat: "Transport", d: 10, h: 22, who: "ride2" },
    { a: "amex", amt: 89, cat: "Shopping", d: 11, h: 13, who: "fashion" },
    { a: "card", amt: 4, cat: "Subscriptions", d: 11, h: 15, who: "github" },
];

const RECURRING: readonly Seed[] = [
    { a: "main", amt: 5200, cat: "Paycheck", d: 1, h: 9, inc: true, who: "paycheck" },
    { a: "main", amt: 1850, cat: "Rent", d: 1, h: 10, who: "rent" },
    { a: "card", amt: 22.99, cat: "Entertainment", d: 1, h: 20, who: "netflix" },
    { a: "card", amt: 11.99, cat: "Entertainment", d: 3, h: 8, who: "spotify" },
    { a: "main", amt: 85, cat: "Phone & Internet", d: 5, h: 15, who: "telco" },
    { a: "card", amt: 9.99, cat: "Subscriptions", d: 6, h: 14, who: "icloud" },
    { a: "card", amt: 20, cat: "Subscriptions", d: 8, h: 9, who: "chatgpt" },
    { a: "main", amt: 107.8, cat: "Utilities", d: 8, h: 16, who: "utility" },
    { a: "paypal", amt: 15, cat: "Subscriptions", d: 9, h: 18, who: "figma" },
    { a: "freelance", amt: 1450, cat: "Freelance", d: 12, h: 12, inc: true, who: "freelance" },
    { a: "main", amt: 142.6, cat: "Groceries", d: 13, h: 11, who: "grocery2" },
    { a: "card", amt: 24.5, cat: "Transport", d: 14, h: 19, who: "ride" },
    { a: "card", amt: 41.2, cat: "Dining Out", d: 15, h: 20, who: "delivery" },
    { a: "main", amt: 62.1, cat: "Fuel", d: 17, h: 17, who: "fuel" },
    { a: "main", amt: 171.35, cat: "Groceries", d: 19, h: 11, who: "grocery" },
    { a: "card", amt: 58.9, cat: "Shopping", d: 21, h: 13, who: "online" },
    { a: "card", amt: 33.4, cat: "Dining Out", d: 23, h: 20, who: "delivery2" },
    { a: "main", amt: 78.25, cat: "Groceries", d: 25, h: 10, who: "grocery3" },
    { a: "card", amt: 17.9, cat: "Transport", d: 27, h: 22, who: "ride2" },
    { a: "card", amt: 129, cat: "Shopping", d: 28, h: 14, who: "home" },
];

const SUBSCRIPTIONS: readonly { month: number; row: Seed; year: number }[] = [
    { month: 8, row: { a: "card", amt: 24.99, cat: "Subscriptions", d: 15, h: 7, who: "gym" }, year: 2026 },
    {
        month: 11,
        row: { a: "amex", amt: 139, cat: "Shopping", d: 20, every: RECURRING_TYPE.yearly, h: 9, who: "yearly" },
        year: 2025,
    },
];

const SCHEDULE_LEADS = new Map<Payee, number | null>([
    ["yearly", null],
    ["chatgpt", null],
    ["netflix", 1],
    ["gym", null],
    ["rent", null],
    ["spotify", null],
    ["telco", null],
    ["icloud", null],
]);

export interface DemoRow {
    accountId: AccountId;
    amount: number;
    category: CategoryName;
    currency: string;
    date: Date;
    id: string;
    income: boolean;
    key: Payee;
    logo: string | null;
    note: string;
    recurringAnchorDay: number | null;
    recurringCoefficient: number;
    recurringType: number;
    reminderLeadDays: number | null;
}

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

export interface DaySection {
    day: Date;
    rows: DemoRow[];
    total: number;
}

export interface WeekFigures {
    current: LogFigures;
    previous: LogFigures;
}

export interface AccountsOverview {
    count: number;
    rows: readonly DemoAccount[];
    total: number;
}

export interface UpcomingCharge {
    landing: Date;
    row: DemoRow;
}

export interface BudgetPace {
    daysLeft: number;
    left: number;
    limit: number;
    over: BudgetCategory[];
    perDay: number;
    spent: number;
}

const MAIN_BUDGET = 3900;
const HERO_USD = 42;
const BUDGETS = [
    ["Groceries", 350],
    ["Dining Out", 250],
    ["Transport", 150],
    ["Fuel", 120],
    ["Entertainment", 100],
    ["Utilities", 200],
    ["Shopping", 300],
] as const satisfies readonly (readonly [CategoryName, number])[];

export type BudgetCategory = (typeof BUDGETS)[number][0];

const DAY_END_MS = 86_399_000;

// A converted price keeps cents near the dollar and drops to whole units or tens where a unit is worth less.
function localAmount(usd: number, rate: number, currency: string): number {
    const minor = decimalsFor(currency);
    const step = rate >= 10 ? 10 ** (Math.floor(Math.log10(rate)) - 1) : 10 ** -minor;
    return Number((Math.round((usd * rate) / step) * step).toFixed(Math.max(0, minor)));
}

function roundFigure(value: number): number {
    const step = 10 ** (Math.floor(Math.log10(Math.abs(value))) - 1);
    return Math.round(value / step) * step;
}
const signed = (row: Pick<DemoRow, "amount" | "income">) => (row.income ? row.amount : -row.amount);

function weekEdges(now: Date): number[] {
    const today = startOfDay(now);
    return Array.from({ length: 8 }, (_, index) => addDays(today, index - 7).getTime() + DAY_END_MS);
}

function buildAccounts(cast: DemoCast): DemoAccount[] {
    return ACCOUNT_SEEDS.flatMap(({ balance, color, icon, id, kind, role }) => {
        const brand = role === null ? null : cast.accounts[role];
        if (brand === undefined) {
            return [];
        }
        const foreign = role === "foreign";
        const currency = foreign ? cast.accounts.foreign.currency : cast.currency;
        const rate = foreign ? (cast.ppp / cast.fx) * cast.foreignFx : cast.ppp;
        return [
            {
                balance: localAmount(balance, rate, currency),
                color: (brand && cast.colors[brand.logo]) ?? color,
                currency,
                icon,
                id,
                kind,
                logo: brand?.logo ?? null,
                name: brand?.name ?? "Cash",
            },
        ];
    });
}

const isLabel = (who: Payee): who is Label => who in LABELS;
const isGlobal = (who: Payee): who is GlobalBrand => who in GLOBAL;

function payee(cast: DemoCast, who: Payee): (Brand & { rate: number }) | null {
    if (isLabel(who)) {
        return { logo: "", name: LABELS[who], rate: cast.ppp };
    }
    if (isGlobal(who)) {
        const brand = GLOBAL[who];
        if (brand.priced === "netflix" || brand.priced === "spotify") {
            return cast.absent?.includes(brand.priced) ? null : { ...brand, rate: cast.ppp };
        }
        return { ...brand, rate: brand.priced === "fx" ? cast.fx : cast.ppp };
    }
    const brand = cast.merchants[who];
    return brand ? { ...brand, rate: cast.ppp } : null;
}

function buildRows(cast: DemoCast, accounts: readonly DemoAccount[]): DemoRow[] {
    const held = new Set(accounts.map(({ id }) => id));
    const entries = [
        ...SEPTEMBER.map((row) => ({ month: 9, row, year: 2026 })),
        ...[8, 7, 6].flatMap((month) => RECURRING.map((row) => ({ month, row, year: 2026 }))),
        ...SUBSCRIPTIONS,
    ];
    const carriers = new Set<Payee>();
    return entries.flatMap(({ month, row, year }, index) => {
        const brand = payee(cast, row.who);
        const accountId = SPENDER[row.a].find((id) => held.has(id));
        if (!brand || !accountId) {
            return [];
        }
        const carrier = SCHEDULE_LEADS.has(row.who) && !carriers.has(row.who);
        if (carrier) {
            carriers.add(row.who);
        }
        const price = row.who === "netflix" || row.who === "spotify" ? cast.prices?.[row.who] : undefined;
        return [
            {
                accountId,
                amount: price ?? localAmount(row.amt, brand.rate, cast.currency),
                category: row.cat,
                currency: cast.currency,
                date: new Date(year, month - 1, row.d, row.h, 0),
                id: `row-${index}`,
                income: row.inc === true,
                key: row.who,
                logo: brand.logo || null,
                note: brand.name,
                recurringAnchorDay: carrier ? row.d : null,
                recurringCoefficient: 1,
                recurringType: carrier ? (row.every ?? RECURRING_TYPE.monthly) : 0,
                reminderLeadDays: carrier ? (SCHEDULE_LEADS.get(row.who) ?? null) : null,
            },
        ];
    });
}

function buildLedger(cast: DemoCast) {
    const accounts = buildAccounts(cast);
    const rows = buildRows(cast, accounts);
    const cents = (value: number) => roundMoney(value, decimalsFor(cast.currency));
    const settled = (now: Date) => rows.filter((row) => row.date.getTime() <= now.getTime());
    const toLocal = (account: DemoAccount) =>
        account.currency === cast.currency ? account.balance : (account.balance / cast.foreignFx) * cast.fx;
    const mainBudget = roundFigure(MAIN_BUDGET * cast.ppp);
    const categoryBudgets = BUDGETS.map(([name, usd]) => [name, roundFigure(usd * cast.ppp)] as const);

    function figuresBetween(start: Date, end: Date): LogFigures {
        const inRange = rows.filter(
            (row) => row.date.getTime() >= start.getTime() && row.date.getTime() <= end.getTime()
        );
        const sum = (income: boolean) =>
            cents(inRange.filter((row) => row.income === income).reduce((total, row) => total + row.amount, 0));
        return { count: inRange.length, currencyCode: cast.currency, expense: sum(false), income: sum(true) };
    }

    function categoryTotals(now: Date): Map<CategoryName, number> {
        const totals = new Map<CategoryName, number>();
        for (const row of settled(now)) {
            if (!row.income && row.date.getTime() >= firstOfMonth(now).getTime()) {
                totals.set(row.category, cents((totals.get(row.category) ?? 0) + row.amount));
            }
        }
        return totals;
    }

    const recurring = rows.filter((row) => row.recurringType > 0);
    const hero = {
        amount: Math.max(1, Math.round(roundFigure(HERO_USD * cast.ppp))),
        merchant: cast.merchants.grocery,
    };

    return {
        accounts,
        cast,
        currency: cast.currency,
        hero,
        price: (usd: number) => localAmount(usd, cast.ppp, cast.currency),
        rows,
        toLocal,
        imageColor: (logo: string | null): string | null => (logo === null ? null : (cast.colors[logo] ?? null)),
        row: (key: Payee) => rows.find((row) => row.key === key),
        daySections(now: Date, days: number): DaySection[] {
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
                .map(([key, dayRows]) => ({
                    day: new Date(key),
                    rows: dayRows.toReversed().toSorted((a, b) => b.date.getTime() - a.date.getTime()),
                    total: cents(dayRows.reduce((sum, row) => sum + signed(row), 0)),
                }));
        },
        weekFigures(now: Date): WeekFigures {
            const start = startOfWeek(now, SUNDAY);
            return {
                current: figuresBetween(start, now),
                previous: figuresBetween(addDays(start, -7), addDays(now, -7)),
            };
        },
        sparkline(now: Date, measure: LogMeasure): number[] {
            const edges = weekEdges(now);
            const windowStart = edges[0] ?? 0;
            const sorted = settled(now).toSorted((a, b) => a.date.getTime() - b.date.getTime());
            const before = (edge: number) => sorted.filter((row) => row.date.getTime() < edge);
            if (measure === "net") {
                return edges.map((edge) => cents(before(edge).reduce((sum, row) => sum + signed(row), 0)));
            }
            const wantIncome = measure === "in";
            return edges.map((edge, index) => {
                const floor = Math.max(windowStart, edges[index - 1] ?? Number.NEGATIVE_INFINITY);
                return cents(
                    sorted
                        .filter(
                            (row) =>
                                row.income === wantIncome && row.date.getTime() > floor && row.date.getTime() < edge
                        )
                        .reduce((sum, row) => sum + row.amount, 0)
                );
            });
        },
        accountsOverview(): AccountsOverview {
            const assets = accounts.filter((account) => account.kind === "asset");
            return {
                count: assets.length,
                rows: assets,
                total: cents(assets.reduce((sum, account) => sum + toLocal(account), 0)),
            };
        },
        youOwe(): number {
            return cents(
                -accounts
                    .filter((account) => account.kind === "liability")
                    .reduce((sum, account) => sum + toLocal(account), 0)
            );
        },
        upcoming(now: Date): UpcomingCharge[] {
            return recurring
                .map((row) => ({ landing: landingDate(row, now), row }))
                .toSorted((a, b) => a.landing.getTime() - b.landing.getTime());
        },
        weekAhead(now: Date): number {
            return cents(chargesInWeekAhead(recurring, now).reduce((sum, row) => sum + signed(row), 0));
        },
        categoryTotals,
        mainBudget,
        categoryBudgets,
        budgetPace(now: Date): BudgetPace {
            const totals = categoryTotals(now);
            const spent = cents([...totals.values()].reduce((sum, value) => sum + value, 0));
            const left = cents(mainBudget - spent);
            const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
            return {
                daysLeft,
                left,
                limit: mainBudget,
                over: categoryBudgets.filter(([name, limit]) => (totals.get(name) ?? 0) > limit).map(([name]) => name),
                perDay: daysLeft > 0 ? cents(left / daysLeft) : left,
                spent,
            };
        },
    };
}

export type Ledger = ReturnType<typeof buildLedger>;

const LEDGERS = new Map<string, Ledger>();

export function ledgerFor(cast: DemoCast): Ledger {
    let ledger = LEDGERS.get(cast.country);
    if (!ledger) {
        ledger = buildLedger(cast);
        LEDGERS.set(cast.country, ledger);
    }
    return ledger;
}
