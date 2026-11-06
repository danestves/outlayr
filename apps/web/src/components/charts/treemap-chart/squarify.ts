export interface TreemapRect {
    height: number;
    width: number;
    x: number;
    y: number;
}

function worstRatio(areas: readonly number[], start: number, end: number, side: number) {
    const slice = areas.slice(start, end);
    const thickness = slice.reduce((sum, area) => sum + area, 0) / side;
    return Math.max(...slice.map((area) => Math.max(thickness / (area / thickness), area / thickness / thickness)));
}

export function squarifyLayout(
    values: readonly number[],
    width: number,
    height: number,
    tileAspect = 1
): TreemapRect[] {
    const clean = values.map((value) => (Number.isFinite(value) ? Math.max(value, 0) : 0));
    const total = clean.reduce((sum, value) => sum + value, 0);
    const rects: TreemapRect[] = clean.map(() => ({ height: 0, width: 0, x: 0, y: 0 }));
    if (total <= 0 || width <= 0 || height <= 0) {
        return rects;
    }
    const filled = clean.flatMap((value, index) => (value > 0 ? [index] : []));
    const stretchedWidth = width / tileAspect;
    const areas = filled.map((index) => ((clean[index] ?? 0) / total) * stretchedWidth * height);
    let box: TreemapRect = { height, width: stretchedWidth, x: 0, y: 0 };
    let start = 0;
    while (start < areas.length) {
        const side = Math.min(box.width, box.height);
        let end = start + 1;
        while (end < areas.length && worstRatio(areas, start, end + 1, side) <= worstRatio(areas, start, end, side)) {
            end += 1;
        }
        const rowArea = areas.slice(start, end).reduce((sum, area) => sum + area, 0);
        const thickness = rowArea / side;
        const vertical = box.width >= box.height;
        let offset = 0;
        for (let row = start; row < end; row += 1) {
            const length = (areas[row] ?? 0) / thickness;
            rects[filled[row] ?? 0] = vertical
                ? { height: length, width: thickness * tileAspect, x: box.x * tileAspect, y: box.y + offset }
                : { height: thickness, width: length * tileAspect, x: (box.x + offset) * tileAspect, y: box.y };
            offset += length;
        }
        box = vertical
            ? { height: box.height, width: box.width - thickness, x: box.x + thickness, y: box.y }
            : { height: box.height - thickness, width: box.width, x: box.x, y: box.y + thickness };
        start = end;
    }
    return rects;
}

export type TileLabelFit = "stacked" | "inline" | "name" | "none";

const SANS_CHAR = 0.52;
const MONO_CHAR = 0.6;
const NAME_SIZE = 12;
const VALUE_SIZE = 11;
const PADDING_X = 8;
const PADDING_Y = 6;
const LINE = 15;
const INLINE_GAP = 6;

const textWidth = (text: string, size: number, mono = false) => text.length * size * (mono ? MONO_CHAR : SANS_CHAR);

export function fitTileLabel(rect: TreemapRect, name: string, value: string | null): TileLabelFit {
    const innerWidth = rect.width - PADDING_X * 2;
    const innerHeight = rect.height - PADDING_Y * 2;
    const nameWidth = textWidth(name, NAME_SIZE);
    if (innerHeight < LINE || nameWidth > innerWidth) {
        return "none";
    }
    if (value === null) {
        return "name";
    }
    const valueWidth = textWidth(value, VALUE_SIZE, true);
    if (innerHeight >= LINE * 2 && valueWidth <= innerWidth) {
        return "stacked";
    }
    return nameWidth + INLINE_GAP + valueWidth <= innerWidth ? "inline" : "name";
}

export function labelInk(fill: string, dark: string, light: string, fallback: string): string {
    const match = /^#([0-9a-f]{6})$/iu.exec(fill);
    if (!match?.[1]) {
        return fallback;
    }
    const channels = [0, 2, 4].map((offset) => {
        const channel = Number.parseInt(match[1]?.slice(offset, offset + 2) ?? "00", 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
    const onDark = 1.05 / (luminance + 0.05);
    const onLight = (luminance + 0.05) / 0.056;
    return onLight >= onDark ? dark : light;
}
