import { relativeLuminance, rgbToHex } from "@/theme/shade";
import type { Rgb } from "@/theme/shade";

// A stored logo is a JPEG with no alpha, so a transparent PNG drawn as-is turns black where it was see-through.

/** Unpremultiplied RGBA, row-major. */
export interface LogoPixels {
    data: Uint8Array;
    height: number;
    width: number;
}

/** A rectangle in fractions of the image it belongs to. */
export interface LogoRect {
    height: number;
    width: number;
    x: number;
    y: number;
}

export type LogoPlate = { kind: "keep" } | { color: string; kind: "plate"; source: LogoRect; target: LogoRect };

const KEEP: LogoPlate = { kind: "keep" };
const FULL: LogoRect = { height: 1, width: 1, x: 0, y: 0 };

const CLEAR_ALPHA = 16;
const TRANSPARENT_SHARE = 0.01;
const MARK_ALPHA = 24;
const BORDER_TOLERANCE = 30;
const BORDER_UNIFORM_SHARE = 0.85;
const MARK_DISTANCE = 40;
const TIGHT_MARGIN = 0.1;
const VISIBLE_CONTRAST = 1.6;
const MARK_SIZE = 0.6;
const MARK_MAX_SIDE = 0.78;
const BLEED_SPAN = 0.95;
const BLEED_FILL = 0.9;
const HUE_BINS = 12;
const HUE_BIN_DEGREES = 360 / HUE_BINS;
const BRANDED_CHROMA = 0.25;
const BRANDED_HUE_SHARE = 0.7;

const WHITE: Rgb = [1, 1, 1];
const INK: Rgb = [28 / 255, 27 / 255, 25 / 255];
const PAPER: Rgb = [246 / 255, 244 / 255, 239 / 255];

function hsl(r: number, g: number, b: number): [hue: number, saturation: number, lightness: number] {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const lightness = (max + min) / 2;
    if (max === min) {
        return [0, 0, lightness];
    }
    const delta = max - min;
    const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    let sector = (r - g) / 255 / delta + 4;
    if (max === r / 255) {
        sector = (g - b) / 255 / delta + (g < b ? 6 : 0);
    } else if (max === g / 255) {
        sector = (b - r) / 255 / delta + 2;
    }
    return [sector * 60, saturation, lightness];
}

function fromHsl(hue: number, saturation: number, lightness: number): Rgb {
    const chroma = saturation * Math.min(lightness, 1 - lightness);
    const channel = (n: number) => {
        const k = (n + hue / 30) % 12;
        return lightness - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [channel(0), channel(8), channel(4)];
}

function contrast(a: number, b: number): number {
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function distance(data: Uint8Array, index: number, color: readonly [number, number, number]): number {
    return Math.hypot(data[index] - color[0], data[index + 1] - color[1], data[index + 2] - color[2]);
}

function borderColor({ data, width, height }: LogoPixels): [number, number, number] | null {
    const border: number[] = [];
    for (let x = 0; x < width; x += 1) {
        border.push(x * 4, ((height - 1) * width + x) * 4);
    }
    for (let y = 0; y < height; y += 1) {
        border.push(y * width * 4, (y * width + width - 1) * 4);
    }
    const median = (offset: number) =>
        border.map((index) => data[index + offset]).sort((a, b) => a - b)[Math.floor(border.length / 2)];
    const color: [number, number, number] = [median(0), median(1), median(2)];
    const matching = border.filter((index) => distance(data, index, color) < BORDER_TOLERANCE).length;
    return matching / border.length > BORDER_UNIFORM_SHARE ? color : null;
}

function plateFor({ data }: LogoPixels, marks: readonly number[]): Rgb {
    let weight = 0;
    let onWhite = 0;
    let onInk = 0;
    let chroma = 0;
    const bins = Array.from({ length: HUE_BINS }, () => ({ cos: 0, sin: 0, weight: 0 }));
    const white = relativeLuminance(WHITE);
    const ink = relativeLuminance(INK);

    for (const index of marks) {
        const [r, g, b, a] = [data[index], data[index + 1], data[index + 2], data[index + 3] / 255];
        const luminance = relativeLuminance([r / 255, g / 255, b / 255]);
        weight += a;
        onWhite += contrast(luminance, white) >= VISIBLE_CONTRAST ? a : 0;
        onInk += contrast(luminance, ink) >= VISIBLE_CONTRAST ? a : 0;
        const [hue, saturation, lightness] = hsl(r, g, b);
        if (saturation > 0.3 && lightness > 0.15 && lightness < 0.85) {
            const bin = bins[Math.floor(hue / HUE_BIN_DEGREES) % HUE_BINS];
            const radians = (hue * Math.PI) / 180;
            bin.cos += Math.cos(radians) * a;
            bin.sin += Math.sin(radians) * a;
            bin.weight += a;
            chroma += a;
        }
    }

    const top = bins.reduce((best, bin, index) => (bin.weight > bins[best].weight ? index : best), 0);
    const near = [bins[(top + HUE_BINS - 1) % HUE_BINS], bins[top], bins[(top + 1) % HUE_BINS]];
    const hueShare = chroma > 0 ? near.reduce((sum, bin) => sum + bin.weight, 0) / chroma : 0;
    // The mean angle, not the mean number: reds straddle 0°, and 350° and 10° average to 0°, not 180°.
    const sin = near.reduce((sum, bin) => sum + bin.sin, 0);
    const cos = near.reduce((sum, bin) => sum + bin.cos, 0);
    const hue = ((Math.atan2(sin, cos) * 180) / Math.PI + 360) % 360;
    const branded = weight > 0 && chroma / weight > BRANDED_CHROMA && hueShare > BRANDED_HUE_SHARE;
    const light = onWhite < weight / 2 && onInk > onWhite;
    if (light) {
        return branded ? fromHsl(hue, 0.25, 0.13) : INK;
    }
    return branded ? fromHsl(hue, 0.45, 0.955) : PAPER;
}

function fit(width: number, height: number): LogoRect {
    const scale = Math.min(MARK_SIZE / Math.sqrt(width * height), MARK_MAX_SIDE / Math.max(width, height));
    return { height: height * scale, width: width * scale, x: (1 - width * scale) / 2, y: (1 - height * scale) / 2 };
}

export function logoPlate(pixels: LogoPixels): LogoPlate {
    const { data, width, height } = pixels;
    const count = width * height;
    let clear = 0;
    for (let index = 3; index < count * 4; index += 4) {
        clear += data[index] < CLEAR_ALPHA ? 1 : 0;
    }
    const transparent = clear > count * TRANSPARENT_SHARE;
    const ground = transparent ? null : borderColor(pixels);
    if (!transparent && ground == null) {
        return KEEP;
    }

    const marks: number[] = [];
    let [left, top, right, bottom] = [width, height, -1, -1];
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            const isMark =
                ground == null ? data[index + 3] >= MARK_ALPHA : distance(data, index, ground) > MARK_DISTANCE;
            if (isMark) {
                marks.push(index);
                [left, top, right, bottom] = [
                    Math.min(left, x),
                    Math.min(top, y),
                    Math.max(right, x),
                    Math.max(bottom, y),
                ];
            }
        }
    }
    if (right < 0) {
        return KEEP;
    }

    const boxWidth = right - left + 1;
    const boxHeight = bottom - top + 1;
    const margin = Math.min(left / width, top / height, (width - 1 - right) / width, (height - 1 - bottom) / height);
    if (ground != null && margin >= TIGHT_MARGIN) {
        return KEEP;
    }

    const color = rgbToHex(
        ground == null ? plateFor(pixels, marks) : [ground[0] / 255, ground[1] / 255, ground[2] / 255]
    );
    const bleed =
        ground == null &&
        boxWidth >= width * BLEED_SPAN &&
        boxHeight >= height * BLEED_SPAN &&
        marks.length >= boxWidth * boxHeight * BLEED_FILL;
    if (bleed) {
        return { color, kind: "plate", source: FULL, target: FULL };
    }
    const longest = Math.max(width, height);
    return {
        color,
        kind: "plate",
        source: { height: boxHeight / height, width: boxWidth / width, x: left / width, y: top / height },
        target: fit(boxWidth / longest, boxHeight / longest),
    };
}
