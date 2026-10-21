import type { InsightsPeriod } from "@/data/insights";
import type { TranslationKey } from "@/i18n/catalog";

/** `value` is the stored `insightsTimeFrame` setting. */
export const PERIODS = [
    { labelKey: "insights.period.week", period: "week", value: 1 },
    { labelKey: "insights.period.month", period: "month", value: 2 },
    { labelKey: "insights.period.year", period: "year", value: 3 },
] as const satisfies readonly { labelKey: TranslationKey; period: InsightsPeriod; value: number }[];
