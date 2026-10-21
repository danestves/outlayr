import type { LedgerCell } from "@/components/ledger-head";
import type { ToolbarIconName } from "@/components/toolbar-icons";
import type { LogPeriod } from "@/data/log-totals";
import type { LogFilter } from "@/domain/log-filter";
import { measureAlternatives, measureIsIncome, measureIsPositive, measureMagnitude } from "@/domain/log-measure";
import type { LogFigures, LogMeasure } from "@/domain/log-measure";
import type { TranslationKey } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";

/** Keys, not label constants: those resolve once at import and miss a language change. */
export const FILTER_LABEL_KEY = {
    all: "log.filter.all",
    category: "log.filter.category",
    day: "log.filter.day",
    month: "log.filter.month",
    recurring: "log.filter.recurring",
    transfers: "log.filter.transfers",
    type: "log.filter.type",
    upcoming: "log.filter.upcoming",
    week: "log.filter.week",
} satisfies Record<LogFilter, TranslationKey>;

export const FILTER_ICON = {
    all: "showAll",
    category: "showCategory",
    day: "showDay",
    month: "showMonth",
    recurring: "showRecurring",
    transfers: "showTransfers",
    type: "showType",
    upcoming: "showUpcoming",
    week: "showWeek",
} satisfies Record<LogFilter, ToolbarIconName>;

export const PERIOD_PHRASE_KEY = {
    all: "log.period.all",
    day: "log.period.day",
    month: "log.period.month",
    week: "log.period.week",
    year: "log.period.year",
} satisfies Record<LogPeriod, TranslationKey>;

export const MEASURE_WORD_KEY = {
    in: "log.measure.in",
    net: "log.measure.net",
    out: "log.measure.out",
} satisfies Record<LogMeasure, TranslationKey>;

export function measureCells(
    measure: LogMeasure,
    figures: LogFigures,
    t: TranslateFn,
    onMeasure: (next: LogMeasure) => void
): LedgerCell[] {
    return measureAlternatives(measure).map((alternative) => ({
        income: measureIsIncome(alternative),
        label: t(MEASURE_WORD_KEY[alternative]),
        magnitude: measureMagnitude(alternative, figures),
        onPress: () => onMeasure(alternative),
        positive: measureIsPositive(alternative, figures),
    }));
}

/** `scopeTotals` may fall back to another currency, and COP, MXN and USD all print "$", so a fallback is named. */
export function scopeMeasureLabel(
    t: TranslateFn,
    measure: LogMeasure,
    shownCurrency: string,
    displayCurrency: string
): string {
    const word = t(MEASURE_WORD_KEY[measure]);
    return shownCurrency === displayCurrency ? word : `${word} · ${shownCurrency}`;
}

export function filterScopeLabel(
    t: TranslateFn,
    filter: LogFilter,
    categoryName: string | null | undefined,
    income: boolean
): string | null {
    switch (filter) {
        case "category": {
            return categoryName || t("log.filter.category");
        }
        case "type": {
            return income ? t("log.type.income") : t("log.type.expense");
        }
        case "recurring": {
            return t("log.filter.recurring");
        }
        case "upcoming": {
            return t("log.filter.upcoming");
        }
        default: {
            return null;
        }
    }
}
