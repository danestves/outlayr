import type { LedgerCell } from "@/components/ledger-head";
import type { ToolbarIconName } from "@/components/toolbar-icons";
import type { LogPeriod } from "@/data/log-totals";
import type { LogFilter, LogMenuFilter } from "@/domain/log-filter";
import { measureAlternatives, measureIsIncome, measureIsPositive, measureMagnitude } from "@/domain/log-measure";
import type { LogFigures, LogMeasure, NarrowedMeasure } from "@/domain/log-measure";
import { measureTrend } from "@/domain/log-trend";
import type { TranslationKey } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";

import type { LogSplitCell } from "./components/log-split";

/** Keys, not label constants: those resolve once at import and miss a language change. */
export const FILTER_LABEL_KEY = {
    all: "log.filter.all",
    category: "log.filter.category",
    day: "log.filter.day",
    month: "log.filter.month",
    recurring: "log.filter.recurring",
    transfers: "log.filter.transfers",
    upcoming: "log.filter.upcoming",
    week: "log.filter.week",
} satisfies Record<LogMenuFilter, TranslationKey>;

export const FILTER_ICON = {
    all: "showAll",
    category: "showCategory",
    day: "showDay",
    month: "showMonth",
    recurring: "showRecurring",
    transfers: "showTransfers",
    upcoming: "showUpcoming",
    week: "showWeek",
} satisfies Record<LogMenuFilter, ToolbarIconName>;

export const PERIOD_PHRASE_KEY = {
    all: "log.period.all",
    day: "log.period.day",
    month: "log.period.month",
    week: "log.period.week",
    year: "log.period.year",
} satisfies Record<LogPeriod, TranslationKey>;

export const HEAD_PERIOD_KEY = {
    all: "log.head.period.all",
    day: "log.head.period.day",
    month: "log.head.period.month",
    week: "log.head.period.week",
    year: "log.head.period.year",
} satisfies Record<LogPeriod, TranslationKey>;

export const TREND_BASE_KEY = {
    day: "log.head.vs.day",
    month: "log.head.vs.month",
    week: "log.head.vs.week",
    year: "log.head.vs.year",
} satisfies Record<Exclude<LogPeriod, "all">, TranslationKey>;

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

const HEAD_MEASURES: readonly NarrowedMeasure[] = ["in", "out"];

/** Tapping the cell already narrowing puts every entry back. Only Out carries a trend; Net's sits on the hero. */
export function splitCells(
    narrowed: NarrowedMeasure | null,
    figures: LogFigures,
    previous: LogFigures | null,
    t: TranslateFn,
    onNarrow: (next: NarrowedMeasure | null) => void
): LogSplitCell[] {
    return HEAD_MEASURES.map((measure) => {
        const narrowing = measure === narrowed ? null : measure;
        return {
            accessibilityHint: t(narrowing ? "log.ledger.showOnly" : "log.ledger.showAll"),
            label: t(MEASURE_WORD_KEY[measure]),
            magnitude: measureMagnitude(measure, figures),
            measure,
            onPress: () => onNarrow(narrowing),
            positive: measureIsPositive(measure, figures),
            selected: measure === narrowed,
            trend: measure === "out" && previous ? measureTrend(measure, figures, previous) : null,
        };
    });
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
    categoryName: string | null | undefined
): string | null {
    switch (filter) {
        case "category": {
            return categoryName || t("log.filter.category");
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
