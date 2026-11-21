import { SUGGESTED_CATEGORY_PRESETS } from "@outlayr/money/category-rules";
import type { SuggestedCategoryPreset } from "@outlayr/money/category-rules";

const ALL_CATEGORY_PRESETS: readonly SuggestedCategoryPreset[] = [
    ...SUGGESTED_CATEGORY_PRESETS.expense,
    ...SUGGESTED_CATEGORY_PRESETS.income,
];

export function findCategoryPreset(categoryName: string): SuggestedCategoryPreset | null {
    return ALL_CATEGORY_PRESETS.find((preset) => preset.name === categoryName) ?? null;
}

// Hashed, not random, so a suggestion no preset covers keeps its colour across devices and re-renders.
export interface PendingCategory {
    color: string;
    emoji: string | null;
    icon: string;
    name: string;
    parentName: string | null;
}

export function presetForName(categoryName: string): SuggestedCategoryPreset {
    const exact = findCategoryPreset(categoryName);
    if (exact != null) {
        return exact;
    }
    let hash = 0;
    for (let index = 0; index < categoryName.length; index += 1) {
        // oxlint-disable-next-line no-bitwise, unicorn/prefer-code-point -- `>>> 0` truncates the running product to uint32, which is what keeps this hash off float precision; and the hash picks the preset a name has already been shown with, so it has to keep numbering surrogate halves the way it did when those categories were created
        hash = (hash * 31 + categoryName.charCodeAt(index)) >>> 0;
    }
    return ALL_CATEGORY_PRESETS[hash % ALL_CATEGORY_PRESETS.length];
}

export function pendingCategoryFor(
    name: string,
    parentName: string | null,
    emoji: string | null = null
): PendingCategory {
    const preset = presetForName(name);
    return { color: preset.color, emoji, icon: preset.icon, name, parentName };
}
