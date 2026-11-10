const STEPS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10];
const HEADROOM = 1.15;
const FINE = 5;
const LABELS = 6;

/** Where a waterfall's lowest and highest running totals sit along its track, leaving the right end to the figures. */
const NEAR = 0.2173;
const FAR = 0.6168;

/** The smallest round step that reaches `top` in `rows` rows. */
export function stepFor(top: number, rows: number) {
    const raw = top / rows;
    if (raw <= 0) {
        return 1;
    }
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = STEPS.find((each) => each * magnitude >= raw) ?? 10;
    return step * magnitude;
}

/** An axis from zero: its top and the values its gridlines sit on, highest first. */
export function axisFromZero(top: number, rows: number) {
    const step = stepFor(top, rows);
    return { ticks: Array.from({ length: rows + 1 }, (_, index) => (rows - index) * step), top: rows * step };
}

/** An axis that hugs a line that never comes near zero, so its slope stays readable. */
export function floatingAxis(values: readonly number[], rows: number) {
    const low = Math.min(...values);
    const high = Math.max(...values);
    const span = high - low || Math.abs(high) || 1;
    const step = stepFor(span * HEADROOM, rows);
    const fine = step / FINE;
    const from = Math.floor(((low + high) / 2 - (rows / 2) * step) / fine) * fine;
    const floor = low >= 0 ? Math.max(0, from) : from;
    return {
        floor,
        ticks: Array.from({ length: rows + 1 }, (_, index) => floor + (rows - index) * step),
        top: floor + rows * step,
    };
}

/** Two axes on one scale either side of a zero line; a side with nothing on it gets no rows. */
export function mirrorAxis(up: number, down: number, rows: number) {
    const top = up > 0 ? axisFromZero(up, rows) : { ticks: [0], top: 0 };
    const bottom = down > 0 ? axisFromZero(down, rows) : { ticks: [0], top: 0 };
    const whole = top.top + bottom.top || 1;
    return {
        /** Each gridline's value and how far down the plot it sits, as a fraction. */
        lines: [
            ...top.ticks.map((value) => ({ at: (top.top - value) / whole, value })),
            ...bottom.ticks
                .toReversed()
                .flatMap((value) => (value > 0 ? [{ at: (top.top + value) / whole, value }] : [])),
        ],
        whole,
        zero: top.top / whole,
    };
}

export interface Point {
    x: number;
    y: number;
}

/** A curve through the points that leaves and enters each one level. */
export function bumpLine(points: readonly Point[]) {
    const [first, ...rest] = points;
    if (!first) {
        return "";
    }
    let path = `M${first.x} ${first.y}`;
    let previous = first;
    for (const point of rest) {
        const middle = (previous.x + point.x) / 2;
        path += `C${middle} ${previous.y} ${middle} ${point.y} ${point.x} ${point.y}`;
        previous = point;
    }
    return path;
}

export function bumpArea(points: readonly Point[], base: number) {
    const [first] = points;
    const last = points.at(-1);
    return first && last ? `${bumpLine(points)}L${last.x} ${base}L${first.x} ${base}Z` : "";
}

export interface PlacedStep {
    /** A total's value, or a move's change: negative for a fall. */
    amount: number;
    id: string;
    kind: "move" | "total";
    left: number;
    width: number;
}

/** Each step's bar as fractions of the track: totals from its start, moves between two running totals. */
export function waterfall(usual: number, moves: readonly { delta: number; id: string }[], now: number): PlacedStep[] {
    const levels = [usual];
    for (const move of moves) {
        levels.push((levels.at(-1) ?? usual) + move.delta);
    }
    const low = Math.min(...levels, now);
    const high = Math.max(...levels, now);
    const scale = high > low ? (FAR - NEAR) / (high - low) : 0;
    const at = (value: number) => (high > low ? NEAR + (value - low) * scale : FAR);
    const total = (id: string, amount: number): PlacedStep => ({
        amount,
        id,
        kind: "total",
        left: 0,
        width: at(amount),
    });
    return [
        total("usual", usual),
        ...moves.map((move, index): PlacedStep => {
            const from = levels[index] ?? usual;
            return {
                amount: move.delta,
                id: move.id,
                kind: "move",
                left: at(Math.min(from, from + move.delta)),
                width: Math.abs(move.delta) * scale,
            };
        }),
        total("now", now),
    ];
}

/** Which of `count` axis labels to print so about six fit, always keeping the last. */
export function labelled(count: number) {
    const stride = Math.max(1, Math.ceil(count / LABELS));
    return (index: number) => (count - 1 - index) % stride === 0;
}
