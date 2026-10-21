import type { InsightsPeriod } from "@/data/insights";

export function showXLabel(period: InsightsPeriod, index: number, label: string): boolean {
    if (period === "week") {
        return true;
    }
    if (period === "year") {
        return [1, 4, 7, 10].includes(index + 1);
    }
    return [1, 8, 15, 22, 29].includes(Number(label));
}
