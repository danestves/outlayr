import { CATEGORY_ERROR_MESSAGES } from "@/data/categories-core";
import type { CategoryError } from "@/data/categories-core";
import type { TranslationKey } from "@/i18n/catalog";

/** The repo throws `CATEGORY_ERROR_MESSAGES` text, so the English string is the UI's only handle on the rule. */
export const CATEGORY_ERROR_KEYS = {
    duplicate: "categories.error.duplicate",
    duplicateEmoji: "categories.error.duplicateEmoji",
    duplicateIcon: "categories.error.duplicateIcon",
    duplicateName: "categories.error.duplicateName",
    incomplete: "categories.error.incomplete",
    missingIcon: "categories.error.missingIcon",
    missingName: "categories.error.missingName",
} satisfies Record<CategoryError, TranslationKey>;

export function categoryErrorCode(message: string): CategoryError | null {
    const match = Object.entries(CATEGORY_ERROR_MESSAGES).find(([, text]) => text === message);
    // SAFETY: the keys of CATEGORY_ERROR_MESSAGES are the `CategoryError` union; `Object.entries` widens them.
    return match ? (match[0] as CategoryError) : null;
}
