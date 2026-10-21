// Stored numbers match the Swift app's `logInsightsType` preference, so a carried-over install keeps its choice.
export type LogMeasure = "net" | "in" | "out";

const LOG_MEASURE_ORDER: readonly LogMeasure[] = ["net", "in", "out"];

const STORED = { in: 2, net: 1, out: 3 } satisfies Record<LogMeasure, number>;

export function logMeasureFromStored(value: number): LogMeasure {
    return LOG_MEASURE_ORDER.find((m) => STORED[m] === value) ?? "net";
}

export function storedLogMeasure(measure: LogMeasure): number {
    return STORED[measure];
}

export interface LogFigures {
    count: number;
    currencyCode: string;
    expense: number;
    income: number;
}

export const ZERO_FIGURES: Omit<LogFigures, "currencyCode"> = {
    count: 0,
    expense: 0,
    income: 0,
};

export function netTotal(figures: LogFigures): number {
    return figures.income - figures.expense;
}

export function measureMagnitude(measure: LogMeasure, figures: LogFigures): number {
    // oxlint-disable-next-line default-case -- `LogMeasure` is a closed union, and a default clause would swallow the missing-return error that forces a new member to be handled here
    switch (measure) {
        case "net": {
            return Math.abs(netTotal(figures));
        }
        case "in": {
            return figures.income;
        }
        case "out": {
            return figures.expense;
        }
    }
}

export function measureIsPositive(measure: LogMeasure, figures: LogFigures): boolean {
    // oxlint-disable-next-line default-case -- `LogMeasure` is a closed union, and a default clause would swallow the missing-return error that forces a new member to be handled here
    switch (measure) {
        case "net": {
            return netTotal(figures) >= 0;
        }
        case "in": {
            return true;
        }
        case "out": {
            return false;
        }
    }
}

export function measureIsIncome(measure: LogMeasure): boolean {
    return measure === "in";
}

export function measureAlternatives(measure: LogMeasure): LogMeasure[] {
    return LOG_MEASURE_ORDER.filter((m) => m !== measure);
}
