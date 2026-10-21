import type { InsightsMeasure } from "@/data/insights";

import { insightsMeasureAlternatives, insightsMeasureMagnitude, netTotal } from "./insights-measure";
import type { InsightsTotals } from "./insights-measure";

function hasFigure(measure: InsightsMeasure, totals: InsightsTotals): boolean {
    if (measure === "net") {
        return totals.income !== 0 && totals.spent !== 0 && netTotal(totals) !== 0;
    }
    return insightsMeasureMagnitude(measure, totals) !== 0;
}

export function quietAlternative(measure: InsightsMeasure, totals: InsightsTotals): InsightsMeasure | null {
    return insightsMeasureAlternatives(measure).find((m) => hasFigure(m, totals)) ?? null;
}
