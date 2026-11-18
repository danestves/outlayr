type TrakTable = readonly (readonly [size: number, units: number])[];

const UNITS_PER_EM = 2048;

const ROUNDED: TrakTable = [
    [6, 174],
    [9, 130],
    [10, 116],
    [11, 104],
    [12, 92],
    [13, 80],
    [14, 70],
    [15, 60],
    [16, 52],
    [17, 45],
    [20, 37],
    [22, 32],
    [28, 26],
    [32, 24],
    [36, 22],
    [50, 14],
    [64, 6],
    [80, 0],
];

const SYSTEM: TrakTable = [
    [6, 82],
    [9, 38],
    [10, 24],
    [11, 12],
    [12, 0],
    [13, -12],
    [14, -22],
    [15, -32],
    [16, -40],
    [17, -52],
    [20, -46],
    [22, -24],
    [24, 6],
    [28, 28],
    [32, 26],
    [36, 21],
    [50, 14],
    [64, 7],
    [80, 0],
];

function unitsAt(table: TrakTable, size: number): number {
    const upper = table.findIndex(([at]) => at >= size);
    if (upper === -1) {
        return table.at(-1)?.[1] ?? 0;
    }
    const [toSize, toUnits] = table[upper] ?? [size, 0];
    const [fromSize, fromUnits] = table[upper - 1] ?? [toSize, toUnits];
    return toSize === fromSize
        ? toUnits
        : fromUnits + ((toUnits - fromUnits) * (size - fromSize)) / (toSize - fromSize);
}

const toEm = (units: number) => `${(units / UNITS_PER_EM).toFixed(5)}em`;

export const roundedTrak = (size: number) => toEm(unitsAt(ROUNDED, size));

export const systemTrak = (size: number) => toEm(unitsAt(SYSTEM, size));

const ASCENT_EM = 1950 / 2048;
const LINE_EM = 2444 / 2048;
const PIXELS_PER_POINT = 3;
const MEASURE_EPSILON = 0.001;
const STRUT_ADVANCE = 1;

export const textLineHeight = (size: number) => size * LINE_EM;

export const fontAscent = (size: number) => size * ASCENT_EM;

export const monoWidth = (text: string, size: number, advance: number, tracking = 0) =>
    [...text].length * (advance * size + tracking);

export const measuredLength = (length: number) =>
    Math.ceil((length + MEASURE_EPSILON) * PIXELS_PER_POINT) / PIXELS_PER_POINT;

export const STRUT_WIDTH = measuredLength(STRUT_ADVANCE);

export function flowFigureHeight(size: number, lineHeight?: number) {
    const natural = textLineHeight(size);
    return Math.max(measuredLength(lineHeight ?? natural), Math.ceil(natural));
}
