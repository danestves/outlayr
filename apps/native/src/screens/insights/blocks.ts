import type { CategoryBreakdownEntry } from "@/data/insights";

export interface BlockRect {
    height: number;
    width: number;
    x: number;
    y: number;
}

const MIN_SIDE = 12;
const MIN_REST_SHARE = 0.06;

function rowWorst(areas: readonly number[], start: number, end: number, side: number): number {
    let sum = 0;
    for (let index = start; index < end; index += 1) {
        sum += areas[index];
    }
    const thickness = sum / side;
    let worst = 0;
    for (let index = start; index < end; index += 1) {
        const length = areas[index] / thickness;
        worst = Math.max(worst, thickness / length, length / thickness);
    }
    return worst;
}

export function squarify(values: readonly number[], width: number, height: number): BlockRect[] {
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0 || width <= 0 || height <= 0) {
        return values.map(() => ({ height: 0, width: 0, x: 0, y: 0 }));
    }
    const areas = values.map((value) => (value / total) * width * height);
    const rects: BlockRect[] = [];
    let box: BlockRect = { height, width, x: 0, y: 0 };
    let start = 0;
    while (start < areas.length) {
        const side = Math.min(box.width, box.height);
        let end = start + 1;
        while (end < areas.length && rowWorst(areas, start, end + 1, side) <= rowWorst(areas, start, end, side)) {
            end += 1;
        }
        let rowArea = 0;
        for (let index = start; index < end; index += 1) {
            rowArea += areas[index];
        }
        const thickness = rowArea / side;
        const vertical = box.width >= box.height;
        let offset = 0;
        for (let index = start; index < end; index += 1) {
            const length = areas[index] / thickness;
            rects.push(
                vertical
                    ? { height: length, width: thickness, x: box.x, y: box.y + offset }
                    : { height: thickness, width: length, x: box.x + offset, y: box.y }
            );
            offset += length;
        }
        box = vertical
            ? { height: box.height, width: box.width - thickness, x: box.x + thickness, y: box.y }
            : { height: box.height - thickness, width: box.width, x: box.x, y: box.y + thickness };
        start = end;
    }
    return rects;
}

export function layoutBlocks(entries: readonly CategoryBreakdownEntry[], width: number, height: number) {
    const positive = entries.filter((entry) => entry.amount > 0).sort((a, b) => b.amount - a.amount);
    const total = positive.reduce((sum, entry) => sum + entry.amount, 0);
    let count = positive.length;
    for (;;) {
        const shown = positive.slice(0, count);
        const rest = positive.slice(count);
        const restAmount = rest.reduce((sum, entry) => sum + entry.amount, 0);
        const values = shown.map((entry) => entry.amount);
        if (rest.length > 0) {
            values.push(Math.max(restAmount, total * MIN_REST_SHARE));
        }
        const rects = squarify(values, width, height);
        const thin = shown.findIndex((_, index) => Math.min(rects[index].width, rects[index].height) < MIN_SIDE);
        if (thin === -1 || width <= 0 || height <= 0) {
            return { rects, rest, shown };
        }
        count = thin;
    }
}
