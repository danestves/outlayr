import { describe, expect, it } from "vite-plus/test";

import { categoryIsSaveable } from "./identity-seed";

const SYMBOLLESS = { emoji: null, icon: null };

describe("categoryIsSaveable", () => {
    it.each([
        ["a new category with a symbol", true, "create", "Food", false, null],
        ["a new category without a symbol", false, "create", "Food", true, null],
        ["a blank name", false, "create", "  ", false, null],
        ["a rename of a category stored without a symbol", true, "edit", "Food", true, SYMBOLLESS],
        ["an edit that clears a stored icon", false, "edit", "Food", true, { ...SYMBOLLESS, icon: "cart" }],
    ] as const)("saves %s: %s", (_label, saveable, mode, name, symbolEmpty, stored) => {
        expect(categoryIsSaveable(mode, name, symbolEmpty, stored)).toBe(saveable);
    });
});
