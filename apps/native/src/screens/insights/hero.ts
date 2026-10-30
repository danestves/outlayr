import type { CategoryBreakdownEntry, InsightsBucket, InsightsMeasure } from "@/data/insights";
import type { InsightsTotals } from "@/domain/insights-measure";
import {
    insightsMeasureIsIncome,
    insightsMeasureIsPositive,
    insightsMeasureMagnitude,
} from "@/domain/insights-measure";

export function heroMagnitudeFor(
    filteredEntry: CategoryBreakdownEntry | null,
    readBalance: number | null,
    readBucket: InsightsBucket | null,
    measure: InsightsMeasure,
    totals: InsightsTotals
): number {
    if (readBalance != null) {
        return Math.abs(readBalance);
    }
    if (readBucket) {
        return Math.abs(readBucket.value);
    }
    if (filteredEntry) {
        return filteredEntry.amount;
    }
    return insightsMeasureMagnitude(measure, totals);
}

export function heroPositiveFor(
    filteredEntry: CategoryBreakdownEntry | null,
    readBalance: number | null,
    readBucket: InsightsBucket | null,
    isNet: boolean,
    measure: InsightsMeasure,
    totals: InsightsTotals
): boolean {
    if (filteredEntry) {
        return insightsMeasureIsIncome(measure);
    }
    if (readBalance != null) {
        return readBalance >= 0;
    }
    if (readBucket && isNet) {
        return readBucket.value >= 0;
    }
    return insightsMeasureIsPositive(measure, totals);
}
