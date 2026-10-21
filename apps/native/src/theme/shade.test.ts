import { describe, expect, it } from "@jest/globals";

import { SUGGESTED_CATEGORY_PRESETS } from "@/data/categories-core";

import { curtainShade, glyphShade, TILE_WASH_OPACITY, withAlpha } from "./shade";

/** Deliberately not imported from `color.ts`: an independent oracle checks it against the spec. */
function contrast(aHex: string, bHex: string): number {
    const toRgb = (hex: string): [number, number, number] => {
        const v = hex.replace("#", "");
        const int = Number.parseInt(v, 16);
        return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
    };
    const lum = (c: [number, number, number]) => {
        const ch = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
        return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
    };
    const l1 = lum(toRgb(aHex));
    const l2 = lum(toRgb(bHex));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function washOver(hex: string, isDark: boolean): string {
    const v = hex.replace("#", "");
    const int = Number.parseInt(v, 16);
    const tint = [(int >> 16) & 255, (int >> 8) & 255, int & 255];
    // Literals, so this stays independent of `shade.ts`.
    const sheet = isDark ? [23, 21, 15] : [242, 240, 234];
    const t = 1 - TILE_WASH_OPACITY;
    return `#${tint
        .map((c, i) =>
            Math.round(c * (1 - t) + (sheet[i] ?? 0) * t)
                .toString(16)
                .padStart(2, "0")
        )
        .join("")}`;
}

const PALETTE = [
    ...new Set(
        [...SUGGESTED_CATEGORY_PRESETS.expense, ...SUGGESTED_CATEGORY_PRESETS.income].map((preset) => preset.color)
    ),
];

describe("withAlpha", () => {
    it("converts #RRGGBB to rgba", () => {
        expect(withAlpha("#3AD6B2", 0.5)).toBe("rgba(58, 214, 178, 0.5)");
    });

    it("expands #RGB shorthand", () => {
        expect(withAlpha("#F00", 1)).toBe("rgba(255, 0, 0, 1)");
    });

    it("clamps alpha into 0..1", () => {
        expect(withAlpha("#000000", -3)).toBe("rgba(0, 0, 0, 0)");
        expect(withAlpha("#000000", 9)).toBe("rgba(0, 0, 0, 1)");
    });

    it("returns the input untouched when the hex is malformed", () => {
        expect(withAlpha("not-a-color", 0.4)).toBe("not-a-color");
        expect(withAlpha("#12345", 0.4)).toBe("#12345");
    });
});

describe("curtainShade", () => {
    it("always lightens in light mode and darkens in dark mode", () => {
        for (const hex of PALETTE) {
            const light = contrast(curtainShade(hex, false), "#ffffff");
            const dark = contrast(curtainShade(hex, true), "#ffffff");
            expect(light <= dark).toBeTruthy();
        }
    });

    it("returns the input untouched when the hex is malformed", () => {
        expect(curtainShade("nope", true)).toBe("nope");
    });
});

describe("glyphShade", () => {
    it("clears the contrast target against its own wash for every palette tint", () => {
        for (const isDark of [false, true]) {
            for (const hex of PALETTE) {
                const shade = glyphShade(hex, isDark);
                const ratio = contrast(shade, washOver(hex, isDark));
                // The oracle rounds in 0-255 space (0.96 * 255 = 244.8); 0.1 absorbs the difference.
                expect(ratio >= 3.4).toBeTruthy();
            }
        }
    });

    it("leaves a tint that already contrasts untouched", () => {
        expect(glyphShade("#101010", false)).toBe("#101010");
    });

    it("returns the input untouched when the hex is malformed", () => {
        expect(glyphShade("#zzz", false)).toBe("#zzz");
    });
});
