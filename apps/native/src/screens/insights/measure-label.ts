import type { InsightsMeasure } from "@/domain/insights";
import type { TranslationKey } from "@/i18n/catalog";

export const MEASURE_KEY = {
    income: "insights.measure.income",
    net: "insights.measure.net",
    spent: "insights.measure.spent",
} satisfies Record<InsightsMeasure, TranslationKey>;
