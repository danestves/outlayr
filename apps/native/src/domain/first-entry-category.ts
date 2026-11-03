import type { CanonicalCategoryName } from "@outlayr/money/contract";

const BY_HOUR: readonly { presets: readonly CanonicalCategoryName<"expense">[]; until: number }[] = [
    { presets: ["Transport"], until: 5 },
    { presets: ["Coffee", "Dining Out"], until: 11 },
    { presets: ["Dining Out"], until: 15 },
    { presets: ["Groceries"], until: 18 },
    { presets: ["Dining Out"], until: 22 },
    { presets: ["Transport"], until: 24 },
];

export function firstEntryCategory<C extends { preset: string | null }>(
    categories: readonly C[],
    hour: number
): C | null {
    const presets = BY_HOUR.find((window) => hour < window.until)?.presets ?? [];
    for (const preset of presets) {
        const match = categories.find((category) => category.preset === preset);
        if (match) {
            return match;
        }
    }
    return categories[0] ?? null;
}
