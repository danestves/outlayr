import { CANONICAL_CATEGORY_NAMES } from "./contract";
import type { CanonicalCategoryName } from "./contract";

const WHITESPACE_RUN = /\s+/;

// Uniform OKLCH lightness 0.600 and chroma 0.102, 15 degrees apart (above the ~9 degree floor where hues blur), so no
// tile shouts or vanishes. Identical in light and dark: `glyphShade` derives the readable glyph per theme.
export const CATEGORY_PALETTE = [
    "#B56858",
    "#B16C48",
    "#AB723A",
    "#A17830",
    "#957E2E",
    "#868535",
    "#758A41",
    "#618F51",
    "#4B9263",
    "#339475",
    "#189486",
    "#009296",
    "#1190A5",
    "#2C8CB0",
    "#4487B8",
    "#5981BD",
    "#6C7BBD",
    "#7D76BA",
    "#8D71B2",
    "#9A6CA8",
    "#A4689A",
    "#AD668B",
    "#B2657A",
    "#B56669",
] as const;

export type CategoryCollision = "duplicate" | "duplicateEmoji" | "duplicateIcon" | "duplicateName";

interface CategorySymbolRow {
    emoji: string | null;
    icon: string | null;
    name: string | null;
}

// Close enough to Swift's `.capitalized` to keep name-collision checks stable across the two apps.
export function capitalizeCategoryName(raw: string): string {
    return raw
        .trim()
        .split(WHITESPACE_RUN)
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

export function formatCategoryName(raw: string): string {
    const name = raw.trim().split(WHITESPACE_RUN).join(" ");
    return name.charAt(0).toUpperCase() + name.slice(1);
}

// U+FE0F is stripped so the text and emoji presentations of one glyph collide.
function emojiComparisonKey(emoji: string): string {
    return emoji.trim().split(String.fromCodePoint(0xfe_0f)).join("");
}

/** `name` must be title-cased already; icon and emoji are the raw candidates ("" when absent). */
export function detectCategoryCollision(
    candidate: { name: string; icon: string; emoji: string },
    siblings: readonly CategorySymbolRow[]
): CategoryCollision | null {
    const iconKeys = new Set(
        siblings.map((row) => row.icon).filter((icon): icon is string => icon != null && icon !== "")
    );
    const emojiKeys = new Set(
        siblings
            .map((row) => row.emoji)
            .filter((emoji): emoji is string => emoji != null && emoji !== "")
            .map(emojiComparisonKey)
    );
    const nameKeys = new Set(
        siblings
            .map((row) => row.name)
            .filter((name): name is string => name != null)
            .map(capitalizeCategoryName)
    );

    const iconTaken = candidate.icon !== "" && iconKeys.has(candidate.icon);
    const emojiTaken = candidate.emoji !== "" && emojiKeys.has(emojiComparisonKey(candidate.emoji));
    const nameTaken = nameKeys.has(candidate.name);

    if ((iconTaken || emojiTaken) && nameTaken) {
        return "duplicate";
    }
    if (iconTaken) {
        return "duplicateIcon";
    }
    if (emojiTaken) {
        return "duplicateEmoji";
    }
    if (nameTaken) {
        return "duplicateName";
    }
    return null;
}

export interface SuggestedCategoryPreset {
    color: string;
    /** Icon registry key, the same on both apps. */
    icon: string;
    name: string;
}

// Named so `name` stays `string`, which is what `merchant-map` matches against.
export interface SuggestedCategoryPresets {
    readonly expense: readonly SuggestedCategoryPreset[];
    readonly income: readonly SuggestedCategoryPreset[];
}

type PresetStyle = Omit<SuggestedCategoryPreset, "name">;

const EXPENSE_STYLES: Record<CanonicalCategoryName<"expense">, PresetStyle> = {
    Groceries: { color: "#53915A", icon: "ShoppingCart01" },
    "Dining Out": { color: "#A97332", icon: "Restaurant01" },
    Coffee: { color: "#AE703A", icon: "Coffee02" },
    Transport: { color: "#4D84BD", icon: "Bus01" },
    Fuel: { color: "#B46A4D", icon: "Fuel01" },
    Rent: { color: "#B26C43", icon: "Home01" },
    Home: { color: "#728B41", icon: "Sofa01" },
    Utilities: { color: "#937F2B", icon: "Flash" },
    "Phone & Internet": { color: "#0590A7", icon: "Wifi01" },
    Subscriptions: { color: "#7C76BC", icon: "Repeat" },
    Healthcare: { color: "#1D947F", icon: "Health" },
    Fitness: { color: "#B76662", icon: "Dumbbell01" },
    Shopping: { color: "#B16482", icon: "ShoppingBag01" },
    Fashion: { color: "#9B6BA8", icon: "Dress01" },
    Entertainment: { color: "#936EAF", icon: "FilmRoll01" },
    Travel: { color: "#2F8AB4", icon: "Airplane01" },
    Education: { color: "#7179BE", icon: "Mortarboard01" },
    Gifts: { color: "#B46477", icon: "Gift" },
    Pets: { color: "#A3772D", icon: "Bone01" },
    Family: { color: "#B66757", icon: "Kid" },
    "Personal Care": { color: "#AD658C", icon: "HairDryer" },
    Insurance: { color: "#667DBF", icon: "Shield01" },
    Taxes: { color: "#5A81BF", icon: "Taxes" },
};

const INCOME_STYLES: Record<CanonicalCategoryName<"income">, PresetStyle> = {
    Paycheck: { color: "#53915A", icon: "MoneyBag01" },
    Freelance: { color: "#00948A", icon: "Laptop" },
    "Part-Time": { color: "#3F87B9", icon: "Briefcase01" },
    Business: { color: "#459365", icon: "Building01" },
    Investments: { color: "#668E4B", icon: "ChartUp" },
    Interest: { color: "#359470", icon: "PercentCircle" },
    Bonus: { color: "#9C7B2A", icon: "Target01" },
    Tips: { color: "#A3772D", icon: "Tips" },
    Refund: { color: "#1E8DAE", icon: "Cashback" },
    Gifts: { color: "#B6646C", icon: "GiftCard" },
};

export const SUGGESTED_CATEGORY_PRESETS: SuggestedCategoryPresets = {
    expense: CANONICAL_CATEGORY_NAMES.expense.map((name) => ({ ...EXPENSE_STYLES[name], name })),
    income: CANONICAL_CATEGORY_NAMES.income.map((name) => ({ ...INCOME_STYLES[name], name })),
};

/** The next unused palette colour; once every one is taken, the palette cycles. */
export function firstAvailableColor(used: ReadonlySet<string>): string {
    const free = CATEGORY_PALETTE.find((hex) => !used.has(hex));
    return free ?? CATEGORY_PALETTE[used.size % CATEGORY_PALETTE.length] ?? CATEGORY_PALETTE[0];
}

export function suggestionsNotAdded(
    income: boolean,
    existing: readonly { icon: string | null; name: string | null; preset?: string | null }[],
    labelOf: (name: string) => string
): SuggestedCategoryPreset[] {
    const pool = income ? SUGGESTED_CATEGORY_PRESETS.income : SUGGESTED_CATEGORY_PRESETS.expense;
    const usedPresets = new Set(existing.map((row) => row.preset));
    const usedNames = new Set(
        existing
            .map((row) => row.name)
            .filter((name): name is string => name != null)
            .map(capitalizeCategoryName)
    );
    const usedIcons = new Set(
        existing.map((row) => row.icon).filter((icon): icon is string => icon != null && icon !== "")
    );
    return pool.filter(
        (preset) =>
            !(
                usedPresets.has(preset.name) ||
                usedNames.has(capitalizeCategoryName(preset.name)) ||
                usedNames.has(capitalizeCategoryName(labelOf(preset.name))) ||
                usedIcons.has(preset.icon)
            )
    );
}
