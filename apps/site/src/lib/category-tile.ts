type Rgb = readonly [number, number, number];

const PAPER: Rgb = [0.949, 0.941, 0.918];
const INK: Rgb = [0.09, 0.082, 0.059];
const WASH_OPACITY = 0.22;
const TARGET_CONTRAST = 3.5;

function byte(digits: string, at: number) {
    return Number.parseInt(digits.slice(at, at + 2), 16) / 255;
}

function parse(hex: string): Rgb {
    const digits = hex.replace("#", "");
    return [byte(digits, 0), byte(digits, 2), byte(digits, 4)];
}

function format(rgb: Rgb) {
    return `#${rgb
        .map((channel) =>
            Math.round(channel * 255)
                .toString(16)
                .padStart(2, "0")
        )
        .join("")}`;
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
    return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount];
}

function linear(channel: number) {
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb) {
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: Rgb, b: Rgb) {
    const [x, y] = [luminance(a), luminance(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function categoryTile(hex: string) {
    const tint = parse(hex);
    const wash = mix(tint, PAPER, 1 - WASH_OPACITY);
    if (contrast(tint, wash) >= TARGET_CONTRAST) {
        return { glyph: hex, wash: format(wash) };
    }
    const anchor = contrast(INK, wash) >= contrast(PAPER, wash) ? INK : PAPER;
    let lo = 0;
    let hi = 1;
    for (let step = 0; step < 10; step += 1) {
        const mid = (lo + hi) / 2;
        if (contrast(mix(tint, anchor, mid), wash) >= TARGET_CONTRAST) {
            hi = mid;
        } else {
            lo = mid;
        }
    }
    const shaded = mix(tint, anchor, hi);
    return { glyph: format(contrast(shaded, wash) >= TARGET_CONTRAST ? shaded : anchor), wash: format(wash) };
}
