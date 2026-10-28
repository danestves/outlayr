import { describe, expect, it } from "vite-plus/test";

import { ACCENTS, DEFAULT_ACCENT, WALLPAPER_ACCENT_VALUE } from "./accent";
import { defaultMaterialAccentValue, materialAccentOptions, materialSeed, offeredAccentValue } from "./material-accent";

describe("materialSeed", () => {
    it("follows the wallpaper only where there is one to follow", () => {
        expect(materialSeed(WALLPAPER_ACCENT_VALUE, true)).toBeUndefined();
        expect(materialSeed(WALLPAPER_ACCENT_VALUE, false)).toBe(DEFAULT_ACCENT.light);
    });

    it("seeds from the brand accent the owner picked, wallpaper or not", () => {
        for (const accent of ACCENTS) {
            expect(materialSeed(accent.value, true)).toBe(accent.light);
        }
    });
});

describe("materialAccentOptions", () => {
    it("leads with Wallpaper, without a swatch, when the device has dynamic colour", () => {
        const [first, ...rest] = materialAccentOptions(true);
        expect(first).toStrictEqual({ label: "settings.theme.wallpaper", value: WALLPAPER_ACCENT_VALUE });
        expect(rest).toStrictEqual([...ACCENTS]);
    });

    it("offers the brand accents alone below Android 12", () => {
        expect(materialAccentOptions(false)).toBe(ACCENTS);
    });
});

describe("offeredAccentValue", () => {
    it("keeps a stored accent the row offers", () => {
        expect(offeredAccentValue(3, ACCENTS, DEFAULT_ACCENT.value)).toBe(3);
    });

    it("shows the default for Wallpaper synced to a row without it", () => {
        expect(offeredAccentValue(WALLPAPER_ACCENT_VALUE, ACCENTS, DEFAULT_ACCENT.value)).toBe(DEFAULT_ACCENT.value);
    });
});

describe("the wallpaper value", () => {
    it("collides with no brand accent's stored value", () => {
        expect(ACCENTS.map((accent) => accent.value)).not.toContain(WALLPAPER_ACCENT_VALUE);
    });

    it("is the Android default only where dynamic colour exists", () => {
        expect(defaultMaterialAccentValue(true)).toBe(WALLPAPER_ACCENT_VALUE);
        expect(defaultMaterialAccentValue(false)).toBe(DEFAULT_ACCENT.value);
    });
});
