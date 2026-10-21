import type { InsightsMeasure } from "@/data/insights";

export const INSIGHTS_MEASURE_ORDER: readonly InsightsMeasure[] = ["spent", "income", "net"];

const STORED = { income: 2, net: 3, spent: 1 } satisfies Record<InsightsMeasure, number>;

export function insightsMeasureFromStored(value: number): InsightsMeasure {
    return INSIGHTS_MEASURE_ORDER.find((m) => STORED[m] === value) ?? "spent";
}

export function storedInsightsMeasure(measure: InsightsMeasure): number {
    return STORED[measure];
}

export interface InsightsTotals {
    income: number;
    spent: number;
}

export function netTotal(totals: InsightsTotals): number {
    return totals.income - totals.spent;
}

export function insightsMeasureMagnitude(measure: InsightsMeasure, totals: InsightsTotals): number {
    switch (measure) {
        case "income": {
            return totals.income;
        }
        case "net": {
            return Math.abs(netTotal(totals));
        }
        default: {
            return totals.spent;
        }
    }
}

export function insightsMeasureIsPositive(measure: InsightsMeasure, totals: InsightsTotals): boolean {
    switch (measure) {
        case "income": {
            return true;
        }
        case "net": {
            return netTotal(totals) >= 0;
        }
        default: {
            return false;
        }
    }
}

export function insightsMeasureIsIncome(measure: InsightsMeasure): boolean {
    return measure === "income";
}

export function insightsMeasureAlternatives(measure: InsightsMeasure): InsightsMeasure[] {
    return INSIGHTS_MEASURE_ORDER.filter((m) => m !== measure);
}

export function measureRiseIsFavourable(measure: InsightsMeasure): boolean {
    return measure !== "spent";
}

// Not {@link measureRiseIsFavourable}: `categoryBreakdown` reads outflow under `net`, so a category rising is bad news.
export function breakdownRiseIsFavourable(measure: InsightsMeasure): boolean {
    return measure === "income";
}
