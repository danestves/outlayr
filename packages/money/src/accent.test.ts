import { describe, expect, it } from "vite-plus/test";

import { ACCENT_PALETTE, accentOf, DEFAULT_ACCENT_COLORS, ON_ACCENT, WALLPAPER_ACCENT_VALUE } from "./accent";

const AA_TEXT_CONTRAST = 4.5;

function luminance(hex: string) {
    const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
        const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(a: string, b: string) {
    const [lighter = 0, darker = 0] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
}

describe(accentOf, () => {
    it.each(ACCENT_PALETTE)("reads the stored $value as $key", (accent) => {
        expect(accentOf(String(accent.value))).toBe(accent);
    });

    it.each([[String(WALLPAPER_ACCENT_VALUE)], ["banana"], [""], ["-1"], [null], [undefined]])(
        "reads %j as vermilion, the default",
        (stored) => {
            expect(accentOf(stored)).toBe(DEFAULT_ACCENT_COLORS);
            expect(DEFAULT_ACCENT_COLORS.key).toBe("vermilion");
        }
    );
});

describe("text on an accent fill", () => {
    it.each(["light", "dark"] as const)(`holds ${AA_TEXT_CONTRAST}:1 on every accent in %s`, (scheme) => {
        const failures = ACCENT_PALETTE.filter(
            (accent) => contrast(ON_ACCENT[scheme], accent[scheme]) < AA_TEXT_CONTRAST
        ).map((accent) => accent.key);
        expect(failures).toStrictEqual([]);
    });
});
