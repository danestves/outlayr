import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { frozenUsd } from "@outlayr/money/canonical-usd";
import { decimalsFor } from "@outlayr/money/currency";
import { utcDateString } from "@outlayr/money/dates";
import { isoDay } from "@outlayr/money/ledger-zone";
import { roundMoney } from "@outlayr/money/round";
import { goalProgress } from "@outlayr/money/savings-goal";
import type { GoalProgress } from "@outlayr/money/savings-goal";
import { convertUsdSum } from "@outlayr/money/valuation";
import * as Effect from "effect/Effect";

import { nextRow, parseAmount, ratesLookup } from "../../../lib/account-writes";
import { cashFlow } from "../../../lib/dashboard-series-insights";
import { endOfDay, startOfDay } from "../../../lib/dashboard-series-ledger";
import type { Ledger } from "../../../lib/dashboard-series-ledger";
import { netWorthPoints } from "../../../lib/dashboard-series-net-worth";
import { periodKeyOf, periodOf, shiftPeriodKey } from "../../../lib/dashboard-series-period";
import { addDays, daysBetween } from "../../../lib/ledger";
import type { CommitRow } from "../../../lib/ledger-committer";
import { accountEntries, inMain } from "../accounts/model";
import type { AccountRow } from "../accounts/model";

export type Goal = LedgerBooks["savingsGoals"][number];

const DAYS_PER_MONTH = 30.44;
const CHART_SAMPLES = 120;
const MONTH_BARS = 12;
export const ROAD_MONTHS = 24;

const dayOf = (ledger: Pick<Ledger, "offsetAt">, at: number) => isoDay(at, ledger.offsetAt(at));

const localMidnight = (day: string) =>
    new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));

export const monthOf = (day: string) => day.slice(0, 7);

export const addMonths = (month: string, count: number) => shiftPeriodKey(month, count);

const monthsApart = (from: string, to: string) =>
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7));

const later = (a: string, b: string) => (a > b ? a : b);

interface Valued {
    exact: boolean;
    value: number;
}

function frozenIn(ledger: Ledger, goal: Goal, face: number, usd: number | null): Valued {
    if (goal.currency === ledger.currency) {
        return { exact: true, value: face };
    }
    if (usd === null) {
        return { exact: false, value: face };
    }
    const converted = convertUsdSum(usd, utcDateString(goal.dateCreated), ledger.currency, ledger.rates);
    return converted === null ? { exact: false, value: face } : { exact: true, value: converted };
}

export interface GoalView {
    account: AccountRow;
    comparable: boolean;
    goal: Goal;
    id: string;
    name: string;
    progress: GoalProgress;
    saved: number;
    savedCurrency: string;
    start: number;
    startDay: string;
    target: number;
    targetCurrency: string;
    targetDay: string | null;
}

export function goalViews(ledger: Ledger, rows: readonly AccountRow[]): GoalView[] {
    const held = new Map(rows.map((row) => [row.id, row]));
    const now = localMidnight(ledger.today);
    const decimals = decimalsFor(ledger.currency);
    return ledger.books.savingsGoals
        .filter((goal) => goal.deletedAt === null && goal.targetAmount !== 0)
        .toSorted((a, b) => a.sortOrder - b.sortOrder)
        .flatMap((goal): GoalView[] => {
            const account = held.get(goal.accountId);
            if (!account) {
                return [];
            }
            const target = frozenIn(ledger, goal, goal.targetAmount, goal.targetAmountUsd);
            const start = frozenIn(ledger, goal, goal.startAmount ?? 0, goal.startAmountUsd ?? null);
            const comparable = account.exact && target.exact && start.exact;
            const startDay = dayOf(ledger, goal.dateCreated);
            const targetDay = goal.targetDate === null ? null : dayOf(ledger, goal.targetDate);
            const saved = Math.max(0, account.exact ? account.value : account.balance);
            const savedCurrency = account.exact ? ledger.currency : account.currency;
            const targetCurrency = target.exact ? ledger.currency : goal.currency;
            const span =
                comparable && targetDay !== null
                    ? {
                          now,
                          startAmount: start.value,
                          startDate: localMidnight(startDay),
                          targetDate: localMidnight(targetDay),
                      }
                    : undefined;
            return [
                {
                    account,
                    comparable,
                    goal,
                    id: goal.localId,
                    name: goal.name,
                    progress: goalProgress(savedCurrency === targetCurrency ? saved : 0, target.value, span, decimals),
                    saved,
                    savedCurrency,
                    start: Math.max(0, start.value),
                    startDay,
                    target: target.value,
                    targetCurrency,
                    targetDay,
                },
            ];
        });
}

export type Standing = { amount: number; kind: "ahead" | "behind" | "onPace" } | { kind: "noRate" };

export function standingOf(view: GoalView): Standing | null {
    if (view.progress.reached) {
        return null;
    }
    if (!view.comparable) {
        return { kind: "noRate" };
    }
    const { standing } = view.progress;
    if (standing === null) {
        return view.targetDay === null ? null : { amount: view.progress.remaining, kind: "behind" };
    }
    if (standing.onPace) {
        return { amount: Math.abs(standing.against), kind: "onPace" };
    }
    return { amount: Math.abs(standing.against), kind: standing.against > 0 ? "ahead" : "behind" };
}

export interface GoalsSummary {
    active: GoalView[];
    monthly: number;
    next: GoalView | null;
    reached: GoalView[];
    toGo: number;
}

export function goalsSummary(ledger: Ledger, views: readonly GoalView[]): GoalsSummary {
    const active = views.filter((view) => !view.progress.reached);
    const counted = active.filter((view) => view.comparable);
    const decimals = decimalsFor(ledger.currency);
    const [next] = active
        .filter((view) => view.targetDay !== null)
        .toSorted((a, b) => (a.targetDay ?? "").localeCompare(b.targetDay ?? ""));
    return {
        active,
        monthly: roundMoney(
            counted.reduce((sum, view) => sum + (view.progress.pace?.perMonth ?? 0), 0),
            decimals
        ),
        next: next ?? null,
        reached: views.filter((view) => view.progress.reached),
        toGo: roundMoney(
            counted.reduce((sum, view) => sum + view.progress.remaining, 0),
            decimals
        ),
    };
}

export function lastMonth(ledger: Ledger) {
    const key = shiftPeriodKey(periodKeyOf(ledger.today, ledger.firstDayOfMonth), -1);
    const period = periodOf(key, ledger.firstDayOfMonth);
    const { income, kept } = cashFlow(ledger, period, { accounts: [] });
    return { income, kept, month: key };
}

export interface Road {
    months: string[];
    rows: { filled: number; view: GoalView }[];
}

export function roadOf(ledger: Ledger, active: readonly GoalView[]): Road | null {
    const dated = active.filter((view) => view.targetDay !== null);
    if (dated.length === 0) {
        return null;
    }
    const thisMonth = monthOf(ledger.today);
    const due = dated.map((view) => monthOf(view.targetDay ?? ledger.today));
    const first = due.some((month) => month <= thisMonth) ? thisMonth : addMonths(thisMonth, 1);
    const last = due.reduce(later, first);
    const count = Math.min(ROAD_MONTHS, monthsApart(first, last) + 1);
    return {
        months: Array.from({ length: count }, (_, index) => addMonths(first, index)),
        rows: dated.map((view, index) => ({
            filled: Math.max(0, Math.min(count, monthsApart(first, due[index] ?? first) + 1)),
            view,
        })),
    };
}

export interface MonthAdded {
    added: number;
    current: boolean;
    month: string;
}

export function monthlyAdded(ledger: Ledger, view: GoalView): MonthAdded[] {
    const thisMonth = monthOf(ledger.today);
    const first = later(monthOf(view.startDay), addMonths(thisMonth, 1 - MONTH_BARS));
    const sums = new Map<string, number>();
    for (const entry of accountEntries(ledger, view.account.id, later(`${first}-01`, view.startDay), ledger.today)) {
        const month = monthOf(entry.day);
        sums.set(month, (sums.get(month) ?? 0) + entry.value);
    }
    const decimals = decimalsFor(view.account.currency);
    return Array.from({ length: monthsApart(first, thisMonth) + 1 }, (_, index) => {
        const month = addMonths(first, index);
        return { added: roundMoney(Math.max(0, sums.get(month) ?? 0), decimals), current: month === thisMonth, month };
    });
}

export function averageAdded(months: readonly MonthAdded[]) {
    const done = months.filter((month) => !month.current);
    const pool = done.length > 0 ? done : months;
    return pool.length === 0 ? 0 : pool.reduce((sum, month) => sum + month.added, 0) / pool.length;
}

export interface Contribution {
    added: number;
    balance: number;
    day: string;
    from: string;
    id: string;
}

export function contributions(ledger: Ledger, view: GoalView): Contribution[] {
    const entries = accountEntries(ledger, view.account.id, view.startDay, ledger.today);
    const decimals = decimalsFor(view.account.currency);
    let running = view.account.balance;
    const found: Contribution[] = [];
    for (const entry of entries) {
        if (entry.value > 0) {
            const category = entry.categoryId === null ? undefined : ledger.categories.get(entry.categoryId)?.name;
            const account = entry.other === null ? undefined : ledger.accounts.get(entry.other)?.name;
            found.push({
                added: entry.value,
                balance: roundMoney(running, decimals),
                day: entry.day,
                from: account ?? category ?? entry.title,
                id: entry.id,
            });
        }
        running -= entry.value;
    }
    return found;
}

export interface ChartDatum {
    [key: string]: number | string | null;
    balance: number | null;
    day: string;
    pace: number | null;
    projected: number | null;
}

export interface GoalChart {
    data: ChartDatum[];
    projectedDay: string | null;
    reachedDay: string | null;
    todayIndex: number;
}

export function projectedDay(ledger: Ledger, view: GoalView, perMonth: number) {
    const monthly = inMain(ledger, perMonth, view.account.currency).value;
    if (view.progress.reached || !view.comparable || monthly <= 0) {
        return null;
    }
    return addDays(ledger.today, Math.ceil((view.progress.remaining / monthly) * DAYS_PER_MONTH));
}

function snapped(days: string[], day: string) {
    if (days.includes(day)) {
        return days.indexOf(day);
    }
    let nearest = 0;
    for (const [index, each] of days.entries()) {
        if (Math.abs(daysBetween(each, day)) < Math.abs(daysBetween(days[nearest] ?? each, day))) {
            nearest = index;
        }
    }
    days[nearest] = day;
    return nearest;
}

export function goalChart(ledger: Ledger, view: GoalView, projection: string | null): GoalChart {
    const { today } = ledger;
    const startDay = view.startDay < today ? view.startDay : addDays(today, -1);
    const targetDay = view.targetDay ?? today;
    const span = Math.max(1, daysBetween(startDay, targetDay));
    const { reached } = view.progress;
    const limit = addDays(targetDay, span);
    const capped = projection !== null && projection > limit ? limit : projection;
    const end = reached ? today : [targetDay, today, capped ?? today].reduce(later);
    const total = Math.max(1, daysBetween(startDay, end));
    const step = Math.max(1, Math.ceil(total / CHART_SAMPLES));
    const days: string[] = [];
    for (let offset = 0; offset < total; offset += step) {
        days.push(addDays(startDay, offset));
    }
    days.push(end);
    const todayIndex = snapped(days, today);
    const past = days.slice(0, todayIndex + 1);
    const points = netWorthPoints(
        ledger,
        { accounts: [view.account.id] },
        past.map((day) => Math.min(ledger.now, endOfDay(ledger, day)))
    );
    const balances = points.map((point, index) => {
        if (index === 0 && view.startDay < today) {
            return view.start;
        }
        return index === todayIndex ? view.saved : Math.max(0, point.accounts[0]?.balance ?? 0);
    });
    const reachedAt = reached ? balances.findIndex((value) => value >= view.target) : -1;
    const toProjection = projection === null ? 0 : Math.max(1, daysBetween(today, projection));
    const data = days.map((day, index): ChartDatum => {
        const elapsed = daysBetween(startDay, day);
        const pace =
            reached || day > targetDay
                ? null
                : view.start + (view.target - view.start) * Math.min(1, Math.max(0, elapsed / span));
        const projected =
            projection === null || index < todayIndex
                ? null
                : view.saved + ((view.target - view.saved) * daysBetween(today, day)) / toProjection;
        return {
            balance: index <= todayIndex ? (balances[index] ?? null) : null,
            day,
            pace,
            projected: projection === null || projected === null || day > projection ? null : projected,
        };
    });
    return {
        data,
        projectedDay: projection,
        reachedDay: reachedAt < 0 ? null : (days[reachedAt] ?? null),
        todayIndex,
    };
}

export interface GoalDraft {
    accountId: string | null;
    amountText: string;
    day: string;
    name: string;
}

export type DraftProblem = "account" | "amount" | "date";

export function draftProblems(ledger: Ledger, draft: GoalDraft, keptDay: string | null = null): DraftProblem[] {
    const problems: DraftProblem[] = [];
    if (draft.accountId === null) {
        problems.push("account");
    }
    if (!(parseAmount(draft.amountText, decimalsFor(ledger.currency)) > 0)) {
        problems.push("amount");
    }
    if (draft.day !== keptDay && !(draft.day > ledger.today)) {
        problems.push("date");
    }
    return problems;
}

export function demand(ledger: Ledger, saved: number, start: number, startDay: string, target: number, day: string) {
    if (!(target > 0) || !(day > ledger.today)) {
        return null;
    }
    return goalProgress(
        saved,
        target,
        {
            now: localMidnight(ledger.today),
            startAmount: start,
            startDate: localMidnight(startDay),
            targetDate: localMidnight(day),
        },
        decimalsFor(ledger.currency)
    );
}

export const targetInstant = (ledger: Pick<Ledger, "offsetAt">, day: string) => startOfDay(ledger, day);

export interface NewGoal {
    accountId: string;
    currency: string;
    name: string;
    startAmount: number;
    targetAmount: number;
    targetDate: number;
}

const frozen = (books: Pick<LedgerBooks, "exchangeRates">, amount: number, currency: string, at: number) =>
    Effect.runSync(frozenUsd(ratesLookup(books), amount, currency, new Date(at)));

export function createdGoal(
    books: Pick<LedgerBooks, "exchangeRates" | "savingsGoals">,
    goal: NewGoal,
    id: string,
    at: number
): CommitRow | null {
    const start = frozen(books, goal.startAmount, goal.currency, at);
    const target = frozen(books, goal.targetAmount, goal.currency, at);
    if (start.amountUsd === null || target.amountUsd === null) {
        return null;
    }
    return {
        deletedAt: null,
        fields: {
            accountId: goal.accountId,
            currency: goal.currency,
            dateCreated: at,
            exchangeRate: target.exchangeRate ?? start.exchangeRate,
            name: goal.name,
            sortOrder: Math.max(-1, ...books.savingsGoals.map((row) => row.sortOrder)) + 1,
            startAmount: goal.startAmount,
            startAmountUsd: start.amountUsd,
            targetAmount: goal.targetAmount,
            targetAmountUsd: target.amountUsd,
            targetDate: goal.targetDate,
        },
        localId: id,
        restoredAt: null,
        table: "savingsGoals",
        updatedAt: at,
    };
}

function refrozen(books: Pick<LedgerBooks, "exchangeRates">, goal: Goal, amount: number) {
    if (goal.currency === "USD") {
        return amount;
    }
    if (goal.exchangeRate !== undefined && goal.exchangeRate !== null && goal.exchangeRate !== 0) {
        return amount / goal.exchangeRate;
    }
    if (goal.targetAmountUsd !== null && goal.targetAmount !== 0 && goal.targetAmountUsd !== 0) {
        return (amount * goal.targetAmountUsd) / goal.targetAmount;
    }
    return frozen(books, amount, goal.currency, goal.dateCreated).amountUsd;
}

export function editedGoal(
    books: Pick<LedgerBooks, "exchangeRates">,
    goal: Goal,
    change: { name: string; targetAmount: number; targetDate: number },
    at: number
): CommitRow | null {
    const targetAmountUsd =
        change.targetAmount === goal.targetAmount ? goal.targetAmountUsd : refrozen(books, goal, change.targetAmount);
    if (targetAmountUsd === null) {
        return null;
    }
    return nextRow("savingsGoals", goal, { ...change, targetAmountUsd }, at);
}

export const deletedGoal = (goal: Goal, at: number) => nextRow("savingsGoals", goal, { deletedAt: at }, at);
