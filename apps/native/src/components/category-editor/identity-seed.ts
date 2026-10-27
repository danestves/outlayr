import type { IdentitySelection } from "@/components/identity-picker-shared";
import { EMPTY_DRAFT } from "@/contexts/identity-draft-context";
import { CATEGORY_PALETTE } from "@/data/categories-core";
import type { Category } from "@/data/categories-core";

export function categoryIdentitySeed(
    mode: "create" | "edit",
    loaded: Category | null,
    parent: Category | null
): IdentitySelection {
    if (mode === "edit") {
        // The raw icon/emoji, not the resolved fallback, so an unknown glyph is not rewritten on save.
        return loaded
            ? {
                  color: loaded.color ?? CATEGORY_PALETTE[0],
                  emoji: loaded.emoji ?? null,
                  icon: loaded.icon ?? null,
                  photoColor: null,
                  photoUri: null,
              }
            : EMPTY_DRAFT;
    }
    return parent ? { ...EMPTY_DRAFT, color: parent.color ?? CATEGORY_PALETTE[0] } : EMPTY_DRAFT;
}

export function categoryCreatesIncome(mode: "create" | "edit", parentId: string | null, atExpenseLimit: boolean) {
    return mode === "create" && parentId === null && atExpenseLimit;
}

export function categoryColorFollowsSiblings(mode: "create" | "edit", parentId: string | null, colorTouched: boolean) {
    return mode === "create" && parentId === null && !colorTouched;
}
