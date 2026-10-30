import { describe, expect, it } from "vite-plus/test";

import { CATEGORY_PALETTE } from "@/data/categories-core";

import {
    iconFamilyPreset,
    nearestPaletteColor,
    normalizeLabel,
    presetForMoneyManager,
    suggestAccountKind,
} from "./matching";

describe("Money Manager category matching", () => {
    it("matches names across accents and keeps a notebook off the education preset", () => {
        expect(normalizeLabel("Educación")).toBe("educacion");
        expect(presetForMoneyManager("Café", null, false)).toBe("Coffee");
        expect(presetForMoneyManager("Mercado", "products", false)).toBe("Groceries");
        expect(presetForMoneyManager("Notebook", "notebook", false)).toBeNull();
        expect(iconFamilyPreset("car", false)).toBe("Transport");
        expect(iconFamilyPreset("bonus", false)).toBeNull();
        expect(suggestAccountKind("Tarjeta de crédito", "cash", 0)).toBe("liability");
        expect(suggestAccountKind("Visa", "credit_card", -15.8)).toBe("liability");
        expect(suggestAccountKind("Wally", "card", 1)).toBe("asset");
        expect(suggestAccountKind("Cash", "cash", -5)).toBe("asset");
        expect(nearestPaletteColor(null)).toBe(CATEGORY_PALETTE[0]);
        expect(CATEGORY_PALETTE).toContain(nearestPaletteColor("#FF0000"));
    });
});
