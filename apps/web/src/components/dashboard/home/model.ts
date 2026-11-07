import { spendSeries } from "../../../lib/dashboard-series";
import type { CategoryBudget } from "../../../lib/dashboard-series";
import { endOfDay, rowsBetween, round, total } from "../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow, Scope } from "../../../lib/dashboard-series-ledger";
import { netWorthPoints } from "../../../lib/dashboard-series-net-worth";
import { daysFrom, periodOf, shiftPeriodKey } from "../../../lib/dashboard-series-period";
import type { Period } from "../../../lib/dashboard-series-period";

const SPARK_PERIODS = 12;

export function sparks(ledger: Ledger, period: Period, scope: Scope) {
    const periods = Array.from({ length: SPARK_PERIODS }, (_, index) =>
        periodOf(shiftPeriodKey(period.key, index + 1 - SPARK_PERIODS), ledger.firstDayOfMonth)
    );
    const figure = (each: Period, income: boolean) =>
        total(ledger, rowsBetween(ledger, scope, each.from, each.to, income));
    const income = periods.map((each) => figure(each, true));
    const spent = periods.map((each) => figure(each, false));
    const instants = periods.map((each) => Math.min(ledger.now, endOfDay(ledger, each.to)));
    return {
        income,
        kept: income.map((value, index) => round(ledger, value - (spent[index] ?? 0))),
        netWorth: netWorthPoints(ledger, scope, instants).map((point) => point.net),
        spent,
    };
}

// Multiples of the day's average, so the dots mean the same in every currency.
const LEVEL_STEPS = [0.25, 0.6, 1.2] as const;

const levelOf = (amount: number, average: number) => {
    if (amount <= 0) {
        return 0;
    }
    const passed = LEVEL_STEPS.filter((step) => amount >= step * average).length;
    return passed + 1;
};

export interface DayCell {
    amount: number;
    day: string;
    level: number;
}

const MONDAY_FIRST = 6;

export function everyDay(ledger: Ledger, period: Period, scope: Scope, categories: readonly string[]) {
    const last = ledger.today < period.to ? ledger.today : period.to;
    const picked = new Set(categories);
    const rows = rowsBetween(ledger, scope, period.from, last, false).filter(
        (row) => picked.size === 0 || picked.has(row.topId)
    );
    const byDay = Map.groupBy(rows, (row) => row.day);
    const elapsed = daysFrom(period.from, last).length;
    const spent = total(ledger, rows);
    const average = elapsed > 0 ? round(ledger, spent / elapsed) : 0;
    const cells: DayCell[] = daysFrom(period.from, period.to).map((day) => {
        const amount = total(ledger, byDay.get(day) ?? []);
        return { amount, day, level: levelOf(amount, average) };
    });
    const [first, second] = cells.filter((cell) => cell.amount > 0).toSorted((a, b) => b.amount - a.amount);
    return {
        average,
        cells,
        lead: (new Date(`${period.from}T12:00:00Z`).getUTCDay() + MONDAY_FIRST) % 7,
        runnerUp: second ?? null,
        top: first ? { ...first, topId: biggestCategory(byDay.get(first.day) ?? []) } : null,
    };
}

function biggestCategory(rows: readonly LedgerRow[]) {
    const totals = new Map<string, number>();
    for (const row of rows) {
        totals.set(row.topId, (totals.get(row.topId) ?? 0) + row.amount);
    }
    return [...totals].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function budgetRows(ledger: Ledger, standings: ReadonlyMap<string, CategoryBudget>) {
    const rows = [...standings].flatMap(([id, standing]) => {
        const category = ledger.budgetTargets.get(id);
        return category ? [{ category, standing }] : [];
    });
    return {
        over: rows.filter((row) => row.standing.overBudget).length,
        rows: rows.toSorted(
            (a, b) => b.standing.spent - a.standing.spent || b.standing.effectiveLimit - a.standing.effectiveLimit
        ),
    };
}

// The bar shows the smaller of spent and limit over the larger: an overrun's limit share leaves room for the red part.
export const budgetFill = ({ effectiveLimit, spent }: Pick<CategoryBudget, "effectiveLimit" | "spent">) => {
    if (effectiveLimit <= 0 || spent <= 0) {
        return 0;
    }
    return Math.min(spent / effectiveLimit, effectiveLimit / spent, 1);
};

const RECENT_SHOWN = 2;

// What's picked pins to the top; the rest of the list only offers categories with spending to narrow to.
export function categoryChoices(ledger: Ledger, period: Period, scope: Scope, picked: readonly string[]) {
    const { categories } = spendSeries(ledger, period, { ...scope, category: null });
    const totals = new Map(categories.map((each) => [each.id, each.total]));
    const recentIds = [...picked];
    for (const row of ledger.rows.toSorted((a, b) => b.at - a.at)) {
        if (recentIds.length >= RECENT_SHOWN) {
            break;
        }
        if (!row.income && (totals.get(row.topId) ?? 0) > 0 && !recentIds.includes(row.topId)) {
            recentIds.push(row.topId);
        }
    }
    const every = [...ledger.categories.values()].map((category) => ({
        ...category,
        total: totals.get(category.id) ?? 0,
    }));
    return {
        all: every
            .filter((each) => !recentIds.includes(each.id) && each.total > 0)
            .toSorted((a, b) => a.name.localeCompare(b.name)),
        recent: recentIds.flatMap((id) => every.filter((each) => each.id === id)),
    };
}

export type SetupStep = "account" | "budget" | "entry";

export interface SetupState {
    done: Record<SetupStep, boolean>;
    firstSpendTopId: string | null;
    spent: number;
    step: SetupStep;
}

// The placeholder table holds six rows; past that a ledger is in use, and accounts and budgets are optional.
const SETUP_ENTRY_LIMIT = 6;

export function setupState(ledger: Ledger): SetupState | null {
    const done = {
        account: ledger.books.accounts.some((row) => row.deletedAt === null),
        budget: ledger.books.budgets.some((row) => row.deletedAt === null),
        entry: ledger.rows.length > 0,
    };
    const step = (["account", "entry", "budget"] as const).find((each) => !done[each]);
    if (!step || ledger.rows.length + ledger.transfers.length >= SETUP_ENTRY_LIMIT) {
        return null;
    }
    const spending = ledger.rows.filter((row) => !row.income).toSorted((a, b) => a.at - b.at);
    return { done, firstSpendTopId: spending[0]?.topId ?? null, spent: total(ledger, spending), step };
}
