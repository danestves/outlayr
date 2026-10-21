/** Every chart reads its rule, dash, bar and scrub geometry from here. */

/** One meaning per pattern across every chart. */
export const CHART_DASH = {
    /** A projection: where things land if nothing changes. Not observed data. */
    projection: [3.5, 3.5],
    /** A target, an ideal, or an average: a line the data is measured against. */
    reference: [1.5, 4],
} as const;

/** `react-native-svg` wants the intervals as a string; Skia wants the array. */
export function dashArray(intervals: readonly number[]): string {
    return intervals.join(" ");
}

/** Solid: a dashed rule would read as a projection. */
export const CHART_SCRUB = {
    activeDotRadius: 4.5,
    dotRadius: 3.2,
    /** How far the rule runs past the plot, top and bottom, so it reads as a cut. */
    ruleOvershoot: 6,
    ruleWidth: 1,
} as const;

export const CHART_BAR = {
    /** A non-zero value never renders as nothing. */
    minHeight: 3,
    /** Cornered, not pilled: `rounded-full` on a short bar swallows the value into two caps. */
    radius: 6,
} as const;

export const CHART_DRAW = {
    durationMs: 600,
} as const;

/** Below ten, one decimal, more when `step` is under a tenth, so 0.04 and 0.09 do not both read 0. */
export function compactMagnitude(value: number, decimal = ".", step = 1): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
        return `${trim(value / 1_000_000, abs >= 10_000_000, decimal)}M`;
    }
    if (abs >= 1000) {
        return `${trim(value / 1000, abs >= 10_000, decimal)}k`;
    }
    if (abs < 10) {
        const scale = 10 ** Math.max(1, Math.ceil(-Math.log10(step)));
        return String(Math.round(value * scale) / scale || 0).replace(".", decimal);
    }
    return String(Math.round(value));
}

const TRAILING_ZERO_DECIMAL = /\.0$/;

function trim(value: number, whole: boolean, decimal: string): string {
    if (whole) {
        return String(Math.round(value));
    }
    return value.toFixed(1).replace(TRAILING_ZERO_DECIMAL, "").replace(".", decimal);
}
