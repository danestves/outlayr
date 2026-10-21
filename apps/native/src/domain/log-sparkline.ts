import { addDays, addMonths, firstOfMonth, startOfDay, startOfWeek } from "@outlayr/money/calendar";

import type { LogMeasure } from "./log-measure";

export interface SparklinePoint {
    amount: number;
    date: Date;
}

export interface SparklineRow {
    amount: number;
    date: Date;
    income: boolean;
}

/** A day's last instant, which is where Swift plants each daily sample. */
function endOfDay(day: Date): Date {
    return new Date(startOfDay(day).getTime() + 86_399_000);
}

function sampleEdges(
    period: "day" | "week" | "month" | "year" | "all",
    now: Date
): { edges: Date[]; unit: "day" | "month" } | null {
    const today = startOfDay(now);

    if (period === "all") {
        return null;
    }

    if (period === "year") {
        const next = addMonths(firstOfMonth(now), 1);
        const edges: Date[] = [];
        let edge = addMonths(next, -12);
        while (edge.getTime() < next.getTime()) {
            // Swift labels each monthly sample with the day before its boundary.
            edges.push(endOfDay(addDays(edge, -1)));
            edge = addMonths(edge, 1);
        }
        edges.push(endOfDay(today));
        return { edges, unit: "month" };
    }

    const start = period === "month" ? addMonths(today, -1) : addDays(today, -7);
    const edges: Date[] = [];
    let edge = endOfDay(start);
    while (edge.getTime() < today.getTime()) {
        edges.push(edge);
        edge = addDays(edge, 1);
    }
    edges.push(endOfDay(today));
    return { edges, unit: "day" };
}

export function sparklineSeries(
    rows: readonly SparklineRow[],
    measure: LogMeasure,
    period: "day" | "week" | "month" | "year" | "all",
    now: Date
): SparklinePoint[] {
    const sampled = sampleEdges(period, now);
    if (!sampled) {
        return [];
    }

    const sorted = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const windowStart = sampled.edges[0]?.getTime() ?? 0;

    if (measure === "net") {
        let running = 0;
        let index = 0;
        return sampled.edges.map((edge) => {
            while (index < sorted.length && sorted[index].date.getTime() < edge.getTime()) {
                const row = sorted[index];
                running += row.income ? row.amount : -row.amount;
                index += 1;
            }
            return { amount: running, date: edge };
        });
    }

    const wantIncome = measure === "in";
    let index = 0;
    return sampled.edges.map((edge) => {
        let bucket = 0;
        while (index < sorted.length && sorted[index].date.getTime() < edge.getTime()) {
            const row = sorted[index];
            if (row.income === wantIncome && row.date.getTime() > windowStart) {
                bucket += row.amount;
            }
            index += 1;
        }
        return { amount: bucket, date: edge };
    });
}

export function sparklineRange(period: "day" | "week" | "month" | "year" | "all", now: Date, firstWeekday = 1): number {
    const today = startOfDay(now);
    const day = 86_400_000;
    if (period === "month") {
        return Math.round((today.getTime() - firstOfMonth(now).getTime()) / day) + 1;
    }
    if (period === "year") {
        return now.getMonth() + 1;
    }
    return Math.round((today.getTime() - startOfWeek(now, firstWeekday).getTime()) / day) + 1;
}

export function sparklineIsPositive(measure: LogMeasure, points: readonly SparklinePoint[]): boolean {
    switch (measure) {
        case "net": {
            return (points[0]?.amount ?? 0) < (points.at(-1)?.amount ?? 0);
        }
        case "in": {
            return true;
        }
        default: {
            return false;
        }
    }
}
