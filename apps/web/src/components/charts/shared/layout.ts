export interface StackedBand<Series> {
    index: number;
    series: Series;
    value: number;
    y1: number;
    y2: number;
}

export function stackBands<Series>(
    series: readonly Series[],
    rowCount: number,
    valueAt: (series: Series, index: number) => number
): StackedBand<Series>[][] {
    const running = Array.from({ length: rowCount }, () => 0);
    return series.map((entry) =>
        running.map((base, index) => {
            const raw = valueAt(entry, index);
            const value = Number.isFinite(raw) ? Math.max(raw, 0) : 0;
            running[index] = base + value;
            return { index, series: entry, value, y1: base, y2: base + value };
        })
    );
}

export function placeLabels<Label extends { y: number }>(
    labels: readonly Label[],
    { gap, max, min }: { gap: number; max: number; min: number }
): Label[] {
    const placed = labels.toSorted((a, b) => a.y - b.y).map((label) => ({ ...label }));
    let floor = min;
    for (const label of placed) {
        label.y = Math.max(label.y, floor);
        floor = label.y + gap;
    }
    let ceiling = max;
    for (const label of placed.toReversed()) {
        label.y = Math.min(label.y, ceiling);
        ceiling = label.y - gap;
    }
    return placed;
}
