export interface SankeyRowGrid {
    height: number;
    minThickness?: number;
    taper?: number;
    top: number;
}

export type Span = readonly [number, number];

export const rowCenter = (grid: SankeyRowGrid, row: number) => grid.top + grid.height * (row + 0.5);

export function rowSpans(thicknesses: readonly number[], grid: SankeyRowGrid, row: number): Span[] {
    const taper = grid.taper ?? 0.4;
    const minimum = grid.minThickness ?? 3;
    const ends = thicknesses.map((thickness) => Math.max(thickness * taper, minimum));
    const total = ends.reduce((sum, end) => sum + end, 0);
    let cursor = rowCenter(grid, row) - total / 2;
    return ends.map((end) => {
        const span = [cursor, cursor + end] as const;
        cursor += end;
        return span;
    });
}

export function ribbonPath(x1: number, x2: number, curve: number, left: Span, right: Span): string {
    const c1 = x1 + (x2 - x1) * curve;
    const c2 = x2 - (x2 - x1) * curve;
    return `M${x1} ${left[0]}C${c1} ${left[0]} ${c2} ${right[0]} ${x2} ${right[0]}L${x2} ${right[1]}C${c2} ${right[1]} ${c1} ${left[1]} ${x1} ${left[1]}Z`;
}

const SAMPLES = 12;

function bezierPoint(x1: number, x2: number, curve: number, y1: number, y2: number, t: number): [number, number] {
    const c1 = x1 + (x2 - x1) * curve;
    const c2 = x2 - (x2 - x1) * curve;
    const u = 1 - t;
    const x = u * u * u * x1 + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * x2;
    const y = u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2;
    return [x, y];
}

export function ribbonPolygon(x1: number, x2: number, curve: number, left: Span, right: Span): [number, number][] {
    const steps = Array.from({ length: SAMPLES + 1 }, (_, index) => index / SAMPLES);
    return [
        ...steps.map((t) => bezierPoint(x1, x2, curve, left[0], right[0], t)),
        ...steps.toReversed().map((t) => bezierPoint(x1, x2, curve, left[1], right[1], t)),
    ];
}
