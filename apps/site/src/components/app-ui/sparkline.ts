interface Plot {
    height: number;
    left: number;
    top: number;
    width: number;
}

const COMPACT_PAD = { bottom: 2, left: 1, right: 1, top: 2 } as const;

const xOf = (index: number, total: number, plot: Plot) =>
    total <= 1 ? plot.left + plot.width / 2 : plot.left + (plot.width * index) / (total - 1);

const yOf = (value: number, plot: Plot, min: number, max: number) =>
    plot.top + plot.height - ((value - min) / (max - min || 1)) * plot.height;

function extentOf(values: readonly number[]): [number, number] {
    if (values.length === 0) {
        return [0, 1];
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
        return [min - 1, max + 1];
    }
    const headroom = (max - min) * 0.1;
    return [min - headroom, max + headroom];
}

function tangents(xs: readonly number[], ys: readonly number[]): number[] {
    const n = xs.length;
    const slopes = xs.slice(0, -1).map((x, i) => ((ys[i + 1] ?? 0) - (ys[i] ?? 0)) / ((xs[i + 1] ?? 0) - x || 1));
    const result = xs.map((_, i) => {
        if (i === 0) {
            return slopes[0] ?? 0;
        }
        if (i === n - 1) {
            return slopes[n - 2] ?? 0;
        }
        const previous = slopes[i - 1] ?? 0;
        const next = slopes[i] ?? 0;
        return previous * next <= 0 ? 0 : (previous + next) / 2;
    });
    for (const [i, slope] of slopes.entries()) {
        if (slope === 0) {
            result[i] = 0;
            result[i + 1] = 0;
            continue;
        }
        const a = (result[i] ?? 0) / slope;
        const b = (result[i + 1] ?? 0) / slope;
        const magnitude = Math.hypot(a, b);
        if (magnitude > 3) {
            result[i] = (3 / magnitude) * a * slope;
            result[i + 1] = (3 / magnitude) * b * slope;
        }
    }
    return result;
}

export function sparklinePath(values: readonly number[], width: number, height: number): string {
    const plot: Plot = {
        height: height - COMPACT_PAD.top - COMPACT_PAD.bottom,
        left: COMPACT_PAD.left,
        top: COMPACT_PAD.top,
        width: width - COMPACT_PAD.left - COMPACT_PAD.right,
    };
    const [min, max] = extentOf(values);
    const xs = values.map((_, i) => xOf(i, values.length, plot));
    const ys = values.map((value) => yOf(value, plot, min, max));
    if (xs.length < 3) {
        return xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
    }
    const ms = tangents(xs, ys);
    let d = `M${xs[0]},${ys[0]}`;
    for (let i = 0; i < xs.length - 1; i += 1) {
        const [x0 = 0, x1 = 0, y0 = 0, y1 = 0, m0 = 0, m1 = 0] = [xs[i], xs[i + 1], ys[i], ys[i + 1], ms[i], ms[i + 1]];
        const dx = (x1 - x0) / 3;
        d += ` C${x0 + dx},${y0 + m0 * dx} ${x1 - dx},${y1 - m1 * dx} ${x1},${y1}`;
    }
    return d;
}
