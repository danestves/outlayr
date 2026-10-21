import type { CursorUnit } from "./log-period-cursor";
import { cursorLabel } from "./log-period-cursor";

// Labels are the Swift `FilterType` raw values: SwiftUI renders the untranslated key itself, lowercase and all.
export type LogFilter = "all" | "type" | "day" | "week" | "month" | "category" | "recurring" | "transfers" | "upcoming";

export const LOG_FILTER_ORDER: readonly LogFilter[] = [
    "all",
    "type",
    "day",
    "week",
    "month",
    "category",
    "recurring",
    "transfers",
    "upcoming",
];

const LOG_FILTER_LABEL = {
    all: "all entries",
    category: "by category",
    day: "by day",
    month: "by month",
    recurring: "recurring",
    transfers: "transfers",
    type: "by type",
    upcoming: "upcoming",
    week: "by week",
} satisfies Record<LogFilter, string>;

export function filterPeriodUnit(filter: LogFilter): CursorUnit | null {
    switch (filter) {
        case "day": {
            return "day";
        }
        case "week": {
            return "week";
        }
        case "month": {
            return "month";
        }
        default: {
            return null;
        }
    }
}

export function filterHasMenu(filter: LogFilter): boolean {
    return filterPeriodUnit(filter) !== null || filter === "category" || filter === "type";
}

export interface FilterScopeLabels {
    categoryName?: string | null;
    cursor: Date;
    firstWeekday?: number;
    income: boolean;
}

export function filterDetail(filter: LogFilter, scope: FilterScopeLabels): string | null {
    const unit = filterPeriodUnit(filter);
    if (unit) {
        return cursorLabel(unit, scope.cursor, scope.firstWeekday ?? 1);
    }
    switch (filter) {
        case "category": {
            return scope.categoryName || LOG_FILTER_LABEL.category;
        }
        case "type": {
            return scope.income ? "Income" : "Expense";
        }
        case "recurring": {
            return LOG_FILTER_LABEL.recurring;
        }
        case "upcoming": {
            return LOG_FILTER_LABEL.upcoming;
        }
        default: {
            return null;
        }
    }
}
