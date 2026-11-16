import type { Language } from "@/i18n/languages";

import { netTotal } from "./log-measure";
import type { LogFigures, LogMeasure } from "./log-measure";
import { formatFixed } from "./money";

function signedFigure(measure: LogMeasure, figures: LogFigures): number {
    // oxlint-disable-next-line default-case -- `LogMeasure` is a closed union, and a default clause would swallow the missing-return error that forces a new member to be handled here
    switch (measure) {
        case "net": {
            return netTotal(figures);
        }
        case "in": {
            return figures.income;
        }
        case "out": {
            return figures.expense;
        }
    }
}

export interface MeasureTrend {
    good: boolean;
    /** A fraction: 0.12 is up twelve percent. */
    change: number;
}

export function measureTrend(measure: LogMeasure, current: LogFigures, previous: LogFigures): MeasureTrend | null {
    const before = signedFigure(measure, previous);
    if (before === 0) {
        return null;
    }
    const change = (signedFigure(measure, current) - before) / Math.abs(before);
    return { change, good: measure === "out" ? change <= 0 : change >= 0 };
}

export function formatTrend(change: number, language: Language): string {
    return `${change < 0 ? "-" : "+"}${formatFixed(Math.abs(change) * 100, 1, language)}%`;
}
