import { advanceBudgetWindow } from "@outlayr/money/budget-window";
import { startOfDay } from "@outlayr/money/calendar";
import { utcDateString } from "@outlayr/money/dates";
import { isExact, limitIn } from "@outlayr/money/valuation";
import { and, asc, desc, isNull, lte } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { getMeta, META_KEYS } from "@/data/app-meta-core";
import type { SpendDb } from "@/data/budget-spent";
import { OVERALL_BUDGET_ID } from "@/data/budgets-core";
import { aggregateInsightsWindows, loadContributions, windowLabel } from "@/data/insights";
import type { InsightsCalendar, InsightsContribution, InsightsPeriod, WindowTotals } from "@/data/insights";
import { writeIdsByTransaction } from "@/data/pending-writes-core";
import { parseBoolSetting, parseIntSetting } from "@/data/settings-core";
import { loadValuation } from "@/data/valuation-source";
import type { Valuation } from "@/data/valuation-source";
import {
    budgets as budgetsTable,
    categories as categoriesTable,
    mainBudget as mainBudgetTable,
    transactions as transactionsTable,
} from "@/db/schema";
import { budgetPeriodPhrase } from "@/domain/budget-math";
import { compareBudgetSeverity } from "@/domain/budget-severity";
import { formatDateHeader, formatDayHeader, formatUpcomingDate, weekdayInitial } from "@/domain/dates";
import { DEFAULT_CURRENCY, formatAmount } from "@/domain/money";
import type { TranslationKey } from "@/i18n/catalog";
import type { Language } from "@/i18n/languages";
import { runtimeLanguage, translateIn, translateNow } from "@/i18n/runtime";
import { DEEP_LINKS } from "@/lib/deep-links";

import { WIDGET_PALETTE } from "./palette";
import { NO_BUDGET } from "./placeholders";

/** The home screen's appearance is only known inside the layout, so it gets both sides. */
type WidgetChrome = typeof WIDGET_PALETTE;

/** What a large widget holds at the Log's row rhythm; medium takes the first 3. */
const LEDGER_LIMIT = 8;
const SLICE_LIMIT = 4;
const WEEK_DAYS = 7;

type BudgetSelection = "auto" | "overall" | "worst";

export interface BudgetConfiguration {
    budget: BudgetSelection;
}

export interface BudgetViewProps {
    /** In [0, 1]: the pace marker. */
    elapsedFraction: number;
    /** Epoch ms when every figure goes stale: the next timeline entry is scheduled here. */
    endsAt: number;
    /** Without the name, "$189 LEFT" reads as the whole month when it is only Groceries. */
    isOverall: boolean;
    limit: string;
    name: string;
    over: boolean;
    percent: string;
    periodLabel: string;
    present: boolean;
    rangeLabel: string;
    remaining: string;
    /** The sign is in the word, never a minus. */
    remainingCaption: string;
    /** Cents always off: "$1,873.59" overflows a small widget's column. */
    spent: string;
    spentFraction: number;
    url: string;
}

/** The body cannot query, so every selectable view ships; `auto` must match the unconfigured tile. */
export interface BudgetWidgetProps {
    chrome: WidgetChrome;
    views: Record<BudgetSelection, BudgetViewProps>;
}

export interface LedgerEntryProps {
    /** Unsigned; `income` decides the colour and the sign glyph. */
    amount: string;
    color: string;
    day: string;
    /** Empty, not null: the layout branches on truthiness. */
    emoji: string;
    id: string;
    income: boolean;
    note: string;
}

export interface WatchEntryProps extends LedgerEntryProps {
    at: number;
    category: string;
    date: string;
    rootCategoryId: string | null;
    writeId: string | null;
}

export type LedgerHeaderPeriod = "today" | InsightsPeriod;
export type LedgerHeaderMeasure = "spent" | "income" | "net";

interface LedgerHeaderProps {
    amount: string;
    label: string;
    positive: boolean;
}

export interface LedgerConfiguration {
    measure: LedgerHeaderMeasure;
    period: LedgerHeaderPeriod;
}

export interface LedgerWidgetProps {
    chrome: WidgetChrome;
    entries: LedgerEntryProps[];
    /** Precomputed: the widget has no database to answer a choice with. */
    headers: Record<LedgerHeaderPeriod, Record<LedgerHeaderMeasure, LedgerHeaderProps>>;
    url: string;
}

/** `"app"` follows the app's own `insightsTimeFrame`; the rest pin the tile. */
type InsightsSelection = "app" | InsightsPeriod;

export interface InsightsConfiguration {
    period: InsightsSelection;
}

export interface InsightsViewProps {
    /** Oldest first: spend per bucket. */
    bars: { x: string; y: number }[];
    income: string;
    net: string;
    netPositive: boolean;
    periodLabel: string;
    rangeLabel: string;
    slices: { name: string; color: string; amount: string; fraction: number }[];
    spent: string;
    url: string;
}

export interface InsightsWidgetProps {
    chrome: WidgetChrome;
    /** What an unconfigured tile shows. */
    defaultPeriod: InsightsPeriod;
    windows: Record<InsightsPeriod, InsightsViewProps>;
}

export interface LogWidgetProps {
    chrome: WidgetChrome;
    todayCount: number;
    todayLabel: string;
    todaySpent: string;
    url: string;
}

/** For `CheckBudgetIntent`, which resolves a spoken name against every budget. */
interface IntentBudgetProps {
    id: string;
    limit: string;
    name: string;
    percent: string;
    periodLabel: string;
    remaining: string;
    remainingCaption: string;
    spent: string;
}

export interface CategoryProps {
    color: string;
    emoji: string;
    id: string;
    income: boolean;
    name: string;
}

export interface WeekProps {
    average: string;
    days: { label: string; value: number }[];
}

export interface WidgetProps {
    Budget: BudgetWidgetProps;
    categories: CategoryProps[];
    currency: string;
    Insights: InsightsWidgetProps;
    intentBudgets: IntentBudgetProps[];
    Ledger: LedgerWidgetProps;
    Log: LogWidgetProps;
    showCents: boolean;
    watchEntries: WatchEntryProps[];
    week: WeekProps;
    zeroSpent: string;
}

// Keyed by the stored insights period setting, which is a plain number.
const PERIODS = new Map<number, InsightsPeriod>([
    [1, "week"],
    [2, "month"],
    [3, "year"],
]);

export const PERIOD_EYEBROW = {
    month: "insights.quiet.thisMonth",
    week: "insights.quiet.thisWeek",
    year: "insights.quiet.thisYear",
} satisfies Readonly<Record<InsightsPeriod, TranslationKey>>;

/** `end` is exclusive, so step back a millisecond. */
function rangeLabel(start: Date, end: Date): string {
    const last = new Date(end.getTime() - 1);
    if (start.getMonth() === last.getMonth()) {
        return `${start.getDate()} – ${formatUpcomingDate(last)}`;
    }
    return `${formatUpcomingDate(start)} – ${formatUpcomingDate(last)}`;
}

function clamp01(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
        return 0;
    }
    return Math.min(1, value);
}

export class WidgetPropsError extends Schema.TaggedError<WidgetPropsError>()("WidgetPropsError", {
    cause: Schema.Defect(),
    read: Schema.Literals(["budgets", "categories", "entries"]),
}) {
    override get message(): string {
        return `Reading the widget ${this.read} failed`;
    }
}

const attempt = <A>(read: typeof WidgetPropsError.Type.read, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new WidgetPropsError({ cause, read }), try: run });

type Contribution = InsightsContribution & { id: string };
interface CategoryRow {
    color: string | null;
    emoji: string | null;
    icon: string | null;
    id: string;
    income: boolean;
    name: string | null;
    parentId: string | null;
    sortOrder: number;
}

const loadSettings = Effect.fn("Widgets.loadSettings")(function* loadSettings(db: SpendDb) {
    const [currencyRaw, showCentsRaw, weekdayRaw, monthDayRaw, periodRaw, clockRaw] = yield* Effect.all(
        [
            getMeta(db, META_KEYS.currency),
            getMeta(db, "showCents"),
            getMeta(db, "firstWeekday"),
            getMeta(db, "firstDayOfMonth"),
            getMeta(db, "insightsTimeFrame"),
            getMeta(db, "use24HourClock"),
        ],
        { concurrency: "unbounded" }
    );
    return {
        calendar: {
            firstDayOfMonth: parseIntSetting(monthDayRaw, 1),
            firstWeekday: parseIntSetting(weekdayRaw, 1),
        } satisfies InsightsCalendar,
        currency: currencyRaw ?? DEFAULT_CURRENCY,
        period: PERIODS.get(parseIntSetting(periodRaw, 1)) ?? ("week" as const),
        showCents: parseBoolSetting(showCentsRaw, true),
        use24HourClock: parseBoolSetting(clockRaw, false),
    };
});

const loadCategories = (db: SpendDb) =>
    attempt("categories", () =>
        db
            .select({
                color: categoriesTable.color,
                emoji: categoriesTable.emoji,
                icon: categoriesTable.icon,
                id: categoriesTable.id,
                income: categoriesTable.income,
                name: categoriesTable.name,
                parentId: categoriesTable.parentId,
                sortOrder: categoriesTable.sortOrder,
            })
            .from(categoriesTable)
            .where(isNull(categoriesTable.deletedAt))
            .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.name))
    );

/** Formatted here: the widget's `JSContext` cannot call `formatAmount`. */
export const buildWidgetProps = Effect.fn("Widgets.buildProps")(function* buildWidgetProps(
    db: SpendDb,
    now: Date = new Date()
) {
    const { calendar, currency, period, showCents } = yield* loadSettings(db);
    const money = (value: number) => formatAmount(value, currency, showCents);
    const whole = (value: number) => formatAmount(value, currency, false);
    const entryMoney = (value: number, code: string | null) => formatAmount(value, code ?? currency, showCents);

    const valuation = yield* loadValuation(db);
    const contributions = yield* loadContributions(db, now, valuation);
    const categoryRows = yield* loadCategories(db);
    const categoriesById = new Map(categoryRows.map((row) => [row.id, row]));
    const budgets = yield* budgetFigures(db, now, contributions, valuation);
    const watchEntries = yield* buildWatchEntries(db, now, categoriesById, entryMoney, contributions, valuation);

    return {
        Budget: buildBudget(budgets, now, categoriesById, money, whole),
        categories: categoryRows
            .filter((row) => row.parentId === null)
            .map((row) => ({
                color: row.color ?? WIDGET_PALETTE.light.ink,
                emoji: row.emoji ?? "",
                id: row.id,
                income: row.income,
                name: row.name ?? "",
            })),
        currency,
        Insights: {
            chrome: WIDGET_PALETTE,
            defaultPeriod: period,
            windows: {
                month: buildInsights(contributions, categoriesById, "month", now, calendar, money),
                week: buildInsights(contributions, categoriesById, "week", now, calendar, money),
                year: buildInsights(contributions, categoriesById, "year", now, calendar, money),
            },
        },
        Ledger: {
            chrome: WIDGET_PALETTE,
            entries: watchEntries.map(({ amount, color, day, emoji, id, income, note }) => ({
                amount,
                color,
                day,
                emoji,
                id,
                income,
                note,
            })),
            headers: buildLedgerHeaders(contributions, now, calendar, money),
            url: DEEP_LINKS.log,
        },
        Log: {
            chrome: WIDGET_PALETTE,
            todayCount: countExpenses(contributions, startOfDay(now), now),
            todayLabel: translateNow("common.today").toUpperCase(),
            todaySpent: money(sumExpenses(contributions, startOfDay(now), now, null)),
            url: DEEP_LINKS.newExpense,
        },
        intentBudgets: buildIntentBudgets(budgets, categoriesById, money, whole),
        showCents,
        watchEntries,
        week: buildWeek(contributions, now, whole),
        zeroSpent: money(0),
    } satisfies WidgetProps;
});

type Money = (value: number) => string;

type EntryMoney = (value: number, code: string | null) => string;

/** Read once for both budget builders. */
const budgetFigures = Effect.fn("Widgets.budgetFigures")(function* budgetFigures(
    db: SpendDb,
    now: Date,
    contributions: readonly Contribution[],
    valuation: Valuation
) {
    const measure = (
        row: {
            amount: number;
            amountUsd: number | null;
            currency: string | null;
            startDate: Date | null;
            type: number;
        },
        categoryId: string | null
    ) => {
        const window = advanceBudgetWindow(row.startDate ?? now, row.type, now);
        return {
            limit: limitIn(row, window.start, valuation.displayCurrency, valuation.rates),
            spent: sumExpenses(contributions, window.start, now, categoryId),
            window,
        };
    };

    const [main] = yield* attempt("budgets", () =>
        db.select().from(mainBudgetTable).where(isNull(mainBudgetTable.deletedAt)).limit(1)
    );
    const categoryRows = yield* attempt("budgets", () =>
        db.select().from(budgetsTable).where(isNull(budgetsTable.deletedAt)).orderBy(asc(budgetsTable.dateCreated))
    );

    return {
        categories: categoryRows.map((row) => ({ row, ...measure(row, row.categoryId) })),
        main: main ? { row: main, ...measure(main, null) } : null,
    };
});

type BudgetFigures = Effect.Success<ReturnType<typeof budgetFigures>>;

/** The Budgets screen's own comparator: over-budget first, and the zero limit guarded (`spent / 0` is `Infinity`). */
function worstBudget(categories: BudgetFigures["categories"]) {
    const [worst] = [...categories].sort((a, b) =>
        compareBudgetSeverity(
            { amount: a.limit, overBudget: a.spent > a.limit, spent: a.spent },
            { amount: b.limit, overBudget: b.spent > b.limit, spent: b.spent }
        )
    );
    return worst;
}

export const loadWidgetFigures = Effect.fn("Widgets.loadFigures")(function* loadWidgetFigures(db: SpendDb, now: Date) {
    const settings = yield* loadSettings(db);
    const valuation = yield* loadValuation(db);
    const contributions = yield* loadContributions(db, now, valuation);
    const categoryRows = yield* loadCategories(db);
    const categoriesById = new Map(categoryRows.map((row) => [row.id, row]));
    const budgets = yield* budgetFigures(db, now, contributions, valuation);
    const budget = budgets.main ?? worstBudget(budgets.categories);
    const entries = yield* loadLedgerRows(db, now, categoriesById, contributions, valuation);
    return {
        ...settings,
        budget: budget
            ? { limit: budget.limit, spent: budget.spent, type: budget.row.type, window: budget.window }
            : null,
        categoriesById,
        contributions,
        entries,
        todayCount: countExpenses(contributions, startOfDay(now), now),
        todaySpent: sumExpenses(contributions, startOfDay(now), now, null),
        valuation,
    };
});

function buildBudget(
    figures: BudgetFigures,
    now: Date,
    categoriesById: ReadonlyMap<string, CategoryRow>,
    money: Money,
    whole: Money
): BudgetWidgetProps {
    const empty: BudgetViewProps = {
        ...NO_BUDGET,
        name: translateNow("budgets.widget.none"),
        periodLabel: translateNow("budgets.name.default").toUpperCase(),
    };

    let overall = empty;
    if (figures.main) {
        const { row, limit, spent, window } = figures.main;
        overall = present(
            row.name?.trim() ? row.name.trim() : translateNow("budgets.scope.everything"),
            true,
            limit,
            spent,
            row.type,
            window,
            DEEP_LINKS.overallBudget
        );
    }

    let worst = empty;
    const ranked = worstBudget(figures.categories);
    if (ranked) {
        // Name precedence mirrors `usePerCategoryBudgets`.
        const rankedCategory = ranked.row.categoryId ? categoriesById.get(ranked.row.categoryId) : undefined;
        worst = present(
            ranked.row.name?.trim()
                ? ranked.row.name.trim()
                : (rankedCategory?.name ?? translateNow("budgets.name.default")),
            false,
            ranked.limit,
            ranked.spent,
            ranked.row.type,
            ranked.window,
            `${DEEP_LINKS.budgets}/${ranked.row.id}`
        );
    }

    return {
        chrome: WIDGET_PALETTE,
        views: { auto: overall.present ? overall : worst, overall, worst },
    };

    function present(
        name: string,
        isOverall: boolean,
        amount: number,
        spent: number,
        type: number,
        window: { start: Date; end: Date },
        url: string
    ): BudgetViewProps {
        const over = spent > amount;
        const span = window.end.getTime() - window.start.getTime();
        const fraction = amount > 0 ? spent / amount : 0;
        return {
            elapsedFraction: clamp01(span > 0 ? (now.getTime() - window.start.getTime()) / span : 0),
            endsAt: window.end.getTime(),
            isOverall,
            limit: whole(amount),
            name,
            over,
            percent: `${Math.round(fraction * 100)}%`,
            periodLabel: translateNow(budgetPeriodPhrase(type)).toUpperCase(),
            present: true,
            rangeLabel: rangeLabel(window.start, window.end),
            remaining: money(Math.abs(amount - spent)),
            remainingCaption: translateNow(over ? "budgets.suffix.over" : "budgets.suffix.left").toUpperCase(),
            spent: whole(spent),
            spentFraction: clamp01(fraction),
            url,
        };
    }
}

function buildIntentBudgets(
    figures: BudgetFigures,
    categoriesById: ReadonlyMap<string, CategoryRow>,
    money: Money,
    whole: Money
): IntentBudgetProps[] {
    const view = (id: string, name: string, amount: number, spent: number, type: number): IntentBudgetProps => ({
        id,
        limit: whole(amount),
        name,
        percent: `${Math.round((amount > 0 ? spent / amount : 0) * 100)}%`,
        periodLabel: translateNow(budgetPeriodPhrase(type)),
        remaining: money(Math.abs(amount - spent)),
        remainingCaption: translateNow(spent > amount ? "budgets.suffix.over" : "budgets.suffix.left"),
        spent: whole(spent),
    });

    const out: IntentBudgetProps[] = [];

    if (figures.main) {
        const { row, limit, spent } = figures.main;
        out.push(
            view(
                OVERALL_BUDGET_ID,
                row.name?.trim() ? row.name.trim() : translateNow("budgets.scope.everything"),
                limit,
                spent,
                row.type
            )
        );
    }

    for (const { row, limit, spent } of figures.categories) {
        const meta = row.categoryId ? categoriesById.get(row.categoryId) : undefined;
        out.push(
            view(
                row.id,
                row.name?.trim() ? row.name.trim() : (meta?.name ?? translateNow("budgets.name.default")),
                limit,
                spent,
                row.type
            )
        );
    }

    return out;
}

function sumIncome(rows: readonly Contribution[], start: Date, now: Date): number {
    const startMs = start.getTime();
    const nowMs = now.getTime();
    let total = 0;
    for (const row of rows) {
        const t = row.date.getTime();
        if (row.income && t >= startMs && t <= nowMs) {
            total += row.amount;
        }
    }
    return total;
}

function sumExpenses(rows: readonly Contribution[], start: Date, now: Date, categoryId: string | null): number {
    const startMs = start.getTime();
    const nowMs = now.getTime();
    let total = 0;
    for (const row of rows) {
        if (row.income) {
            continue;
        }
        const t = row.date.getTime();
        if (t < startMs || t > nowMs) {
            continue;
        }
        if (categoryId == null || row.categoryId === categoryId || row.parentId === categoryId) {
            total += row.amount;
        }
    }
    return total;
}

function countExpenses(rows: readonly Contribution[], start: Date, now: Date): number {
    const ids = new Set<string>();
    for (const row of rows) {
        const t = row.date.getTime();
        if (!row.income && t >= start.getTime() && t <= now.getTime()) {
            ids.add(row.id);
        }
    }
    return ids.size;
}

function buildWeek(contributions: readonly Contribution[], now: Date, whole: Money): WeekProps {
    const today = startOfDay(now);
    const starts = Array.from(
        { length: WEEK_DAYS },
        (_, index) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - (WEEK_DAYS - 1 - index))
    );
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();
    const values = starts.map(() => 0);
    for (const row of contributions) {
        const t = row.date.getTime();
        if (row.income || t < starts[0].getTime() || t >= end) {
            continue;
        }
        const index = starts.findLastIndex((start) => start.getTime() <= t);
        values[index] += row.amount;
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
        average: whole(total / WEEK_DAYS),
        days: starts.map((start, index) => ({ label: weekdayInitial(start), value: values[index] })),
    };
}

const loadLedgerRows = Effect.fn("Widgets.loadLedgerRows")(function* loadLedgerRows(
    db: SpendDb,
    now: Date,
    categoriesById: ReadonlyMap<string, CategoryRow>,
    contributions: readonly Contribution[],
    valuation: Valuation
) {
    const rows = yield* attempt("entries", () =>
        db
            .select({
                amount: transactionsTable.amount,
                amountUsd: transactionsTable.amountUsd,
                categoryId: transactionsTable.categoryId,
                currency: transactionsTable.currency,
                customColor: transactionsTable.customColor,
                date: transactionsTable.date,
                emoji: transactionsTable.emoji,
                id: transactionsTable.id,
                imageColor: transactionsTable.imageColor,
                income: transactionsTable.income,
                note: transactionsTable.note,
            })
            .from(transactionsTable)
            .where(and(isNull(transactionsTable.deletedAt), lte(transactionsTable.date, now)))
            .orderBy(desc(transactionsTable.date))
            .limit(LEDGER_LIMIT)
    );
    const valuedById = new Map(contributions.map((row) => [row.id, row.amount]));
    const { displayCurrency, rates } = valuation;

    return rows.map((row) => {
        const category = row.categoryId ? categoriesById.get(row.categoryId) : undefined;
        // The figure the headers summed; an inexact entry keeps its own currency.
        const valued =
            row.currency !== null &&
            isExact({ ...row, dateKey: utcDateString(row.date.getTime()) }, displayCurrency, rates)
                ? valuedById.get(row.id)
                : undefined;
        return {
            amount: valued ?? row.amount,
            category: category?.name ?? "",
            // Identity precedence, matching the form.
            color: row.customColor ?? row.imageColor ?? category?.color ?? "#767676",
            currency: valued === undefined ? row.currency : displayCurrency,
            date: row.date,
            // The widget runtime does not link Hugeicons, so an icon identity degrades to its colour dot.
            emoji: row.emoji ?? category?.emoji ?? "",
            id: row.id,
            income: row.income,
            note: row.note,
            rootCategoryId: category?.parentId ?? row.categoryId,
        };
    });
});

export type LedgerRow = Effect.Success<ReturnType<typeof loadLedgerRows>>[number];

const buildWatchEntries = Effect.fn("Widgets.buildWatchEntries")(function* buildWatchEntries(
    db: SpendDb,
    now: Date,
    categoriesById: ReadonlyMap<string, CategoryRow>,
    entryMoney: EntryMoney,
    contributions: readonly Contribution[],
    valuation: Valuation
) {
    const rows = yield* loadLedgerRows(db, now, categoriesById, contributions, valuation);
    const writeIds = yield* writeIdsByTransaction(db);
    return rows.map(({ amount, currency, date, ...row }): WatchEntryProps => ({
        ...row,
        amount: entryMoney(amount, currency),
        at: date.getTime(),
        date: formatDateHeader(date, now),
        day: formatDayHeader(date, now),
        writeId: writeIds.get(row.id) ?? null,
    }));
});

/** `today` from raw contributions: `aggregateInsightsWindows` has no day window. */
export function buildLedgerHeaders(
    contributions: readonly Contribution[],
    now: Date,
    calendar: InsightsCalendar,
    money: Money
) {
    const measures = (label: string, totals: WindowTotals) => {
        const net = totals.income - totals.spent;
        return {
            income: { amount: money(totals.income), label, positive: true },
            net: { amount: money(Math.abs(net)), label, positive: net >= 0 },
            spent: { amount: money(totals.spent), label, positive: false },
        } satisfies Record<LedgerHeaderMeasure, LedgerHeaderProps>;
    };

    const totalsOf = (period: InsightsPeriod) =>
        aggregateInsightsWindows(contributions, new Map(), period, "spent", now, 0, calendar);
    const startToday = startOfDay(now);
    return {
        month: measures(translateNow("insights.period.month").toUpperCase(), totalsOf("month")),
        today: measures(translateNow("common.today").toUpperCase(), {
            income: sumIncome(contributions, startToday, now),
            spent: sumExpenses(contributions, startToday, now, null),
        }),
        week: measures(translateNow("insights.period.week").toUpperCase(), totalsOf("week")),
        year: measures(translateNow("insights.period.year").toUpperCase(), totalsOf("year")),
    } satisfies Record<LedgerHeaderPeriod, Record<LedgerHeaderMeasure, LedgerHeaderProps>>;
}

export function buildInsights(
    contributions: readonly Contribution[],
    categoriesById: ReadonlyMap<string, CategoryRow>,
    period: InsightsPeriod,
    now: Date,
    calendar: InsightsCalendar,
    money: Money,
    language: Language = runtimeLanguage()
): InsightsViewProps {
    const aggregate = aggregateInsightsWindows(
        contributions,
        categoriesById,
        period,
        "spent",
        now,
        0,
        calendar,
        language
    );
    const net = aggregate.income - aggregate.spent;
    const slices = aggregate.categories.slice(0, SLICE_LIMIT);

    return {
        bars: aggregate.buckets.map((bucket) => ({
            x: bucket.label,
            y: bucket.value,
        })),
        income: money(aggregate.income),
        net: money(Math.abs(net)),
        netPositive: net >= 0,
        periodLabel: translateIn(language, PERIOD_EYEBROW[period]).toUpperCase(),
        rangeLabel: windowLabel(period, 0, now, calendar, language),
        slices: slices.map((slice) => ({
            amount: money(slice.amount),
            color: slice.color,
            fraction: slice.fraction,
            name: slice.name,
        })),
        spent: money(aggregate.spent),
        url: DEEP_LINKS.insights,
    };
}
