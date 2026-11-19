import { categoryBudgetFigures, overallBudgetFigures } from "@outlayr/money/budget-figures";
import type { BudgetFigures, StoredBudget } from "@outlayr/money/budget-figures";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { startOfDay } from "@outlayr/money/calendar";
import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import type { RateTable } from "@outlayr/money/valuation";
import type { Locale } from "@outlayr/shared/i18n";

import { dominantCategory } from "../../../../native/src/domain/budget-dominant";
import { compareBudgetSeverity } from "../../../../native/src/domain/budget-severity";
import { daysBetween } from "../../../../native/src/domain/local-day";
import { buildBurndown } from "./budgets-burndown";
import type { Burndown } from "./budgets-burndown";
import { dayMonth } from "./dates";
import type { BudgetCategory, DemoRow, Ledger } from "./ledger";
import { amountParts, formatAmount, symbolPrefix } from "./money";
import type { AppKey, AppT } from "./strings";

export type CategoryName = DemoRow["category"];

export const CATEGORY_LABEL = {
    "Dining Out": "categories.preset.diningOut",
    Entertainment: "categories.preset.entertainment",
    Fuel: "categories.preset.fuel",
    Groceries: "categories.preset.groceries",
    Rent: "categories.preset.rent",
    Shopping: "categories.preset.shopping",
    Transport: "categories.preset.transport",
    Utilities: "categories.preset.utilities",
} as const satisfies Partial<Record<CategoryName, AppKey>>;

type LabelledCategory = keyof typeof CATEGORY_LABEL;

const isLabelled = (name: string): name is LabelledCategory => name in CATEGORY_LABEL;

export function categoryLabel(name: string, t: AppT): string {
    return isLabelled(name) ? t(CATEGORY_LABEL[name]) : name;
}

function roundsToNothing(amount: number, code: string): boolean {
    const magnitude = Math.abs(amount);
    return roundMoney(magnitude, 0) === 0 && roundMoney(magnitude, decimalsFor(code)) !== 0;
}

export function formatMoney(amount: number, code: string, locale: Locale, showCents: boolean): string {
    return showCents ? formatAmount(amount, code, locale) : formatWhole(amount, code, locale);
}

export function formatWhole(amount: number, code: string, locale: Locale): string {
    const parts = amountParts(amount, code, locale);
    if (roundsToNothing(amount, code)) {
        return `${symbolPrefix(parts.symbol)}${parts.integer}${parts.decimal}${parts.fraction}`;
    }
    const whole = amountParts(roundMoney(Math.abs(amount), 0), code, locale);
    return `${symbolPrefix(whole.symbol)}${whole.integer}`;
}

const SEED_START = new Date(2026, 8, 1);
const SEED_CREATED = new Date(2026, 5, 1);

function seedBudget(ledger: Ledger, amount: number): StoredBudget {
    return {
        amount,
        amountUsd: amount / ledger.cast.fx,
        currency: ledger.currency,
        dateCreated: SEED_CREATED,
        rollover: false,
        startDate: SEED_START,
        type: BUDGET_TYPE.month,
    };
}

const NO_RATES: RateTable = { earliest: () => null, get: () => null };

export function contributions(ledger: Ledger, now: Date): ExpenseContribution[] {
    return ledger.rows
        .filter((row) => !row.income && row.date.getTime() <= now.getTime())
        .map((row) => ({
            amount: row.amount,
            categoryId: row.category,
            date: row.date,
            parentId: null,
        }));
}

export function daysLeftInWindow(window: BudgetWindow, now: Date): number {
    return Math.max(0, daysBetween(startOfDay(now).getTime(), window.end.getTime()));
}

export const leftPerDay = (leftover: number, window: BudgetWindow, now: Date) =>
    leftover / Math.max(1, daysLeftInWindow(window, now));

export const timeLeftLabel = (window: BudgetWindow, now: Date, t: AppT) =>
    t("budgetTime.daysLeft", { count: daysLeftInWindow(window, now) });

const BLAME_SHARE = 0.2;

export function burndownVerdict(burndown: Burndown, code: string, locale: Locale, t: AppT): string | null {
    const { projectedBalance, runwayDate, runwayDay, totalDays } = burndown;
    if (runwayDate && runwayDay != null) {
        const date = dayMonth(runwayDate, locale, t).toUpperCase();
        const early = totalDays - runwayDay;
        return early > 0
            ? t("budgets.hero.verdictRanOutEarly", { date, days: t("budgets.days", { count: early }) })
            : t("budgets.hero.verdictRanOutFinal", { date });
    }
    if (projectedBalance != null && projectedBalance < 0) {
        return t("budgets.hero.verdictEndsShort", { amount: formatWhole(Math.abs(projectedBalance), code, locale) });
    }
    return null;
}

export function heroVerdict(main: MainBudget, code: string, locale: Locale, t: AppT): string | null {
    const sentence = burndownVerdict(main.burndown, code, locale, t);
    if (!sentence) {
        return null;
    }
    const { dominant } = main;
    return dominant && dominant.share >= BLAME_SHARE
        ? `${sentence} ${t("budgets.hero.verdictBlame", { name: categoryLabel(dominant.name, t), percent: Math.round(dominant.share * 100) })}`
        : sentence;
}

export interface MainBudget extends BudgetFigures {
    burndown: Burndown;
    dominant: { name: string; share: number } | null;
}

export function mainBudget(ledger: Ledger, now: Date): MainBudget {
    const rows = contributions(ledger, now);
    const figures = overallBudgetFigures(seedBudget(ledger, ledger.mainBudget), rows, {
        displayCurrency: ledger.currency,
        now,
        rates: NO_RATES,
    });
    const top = dominantCategory(rows, figures.window, Math.min(now.getTime(), figures.window.end.getTime()));
    return {
        ...figures,
        burndown: buildBurndown(rows, { limit: figures.amount, now, window: figures.window }),
        dominant: top ? { name: top.categoryId, share: top.share } : null,
    };
}

export interface CategoryBudget extends BudgetFigures {
    burndown: Burndown;
    name: BudgetCategory;
}

export function categoryBudgets(ledger: Ledger, now: Date): CategoryBudget[] {
    const rows = contributions(ledger, now);
    return ledger.categoryBudgets
        .map(([name, limit]) => {
            const figures = categoryBudgetFigures({ ...seedBudget(ledger, limit), categoryId: name }, rows, {
                displayCurrency: ledger.currency,
                now,
                rates: NO_RATES,
            });
            return {
                ...figures,
                burndown: buildBurndown(rows, { categoryId: name, limit: figures.amount, now, window: figures.window }),
                name,
            };
        })
        .toSorted(compareBudgetSeverity);
}
