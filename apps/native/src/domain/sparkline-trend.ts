import type { TranslationKey } from "@/i18n/catalog";

import type { LogMeasure } from "./log-measure";

export function sparklineTrendKey(amounts: readonly number[]): TranslationKey {
    const [first] = amounts;
    const last = amounts.at(-1);
    if (first === undefined || last === undefined || first === last) {
        return "insights.trend.flat";
    }
    return last > first ? "insights.trend.rising" : "insights.trend.falling";
}

// Only Net is a running balance. In and Out open on an empty bucket and can never close below it, so a direction
// would only flatter them; they name their granularity instead.
export function sparklineLabelKey(measure: LogMeasure, amounts: readonly number[], byMonth: boolean): TranslationKey {
    if (measure === "net") {
        return sparklineTrendKey(amounts);
    }
    return byMonth ? "insights.trend.monthlyTotals" : "insights.trend.dailyTotals";
}
