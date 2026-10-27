import type { CategoryError } from "@/data/categories-core";
import type { TranslationKey } from "@/i18n/catalog";

/** A `CategoryValidationError` carries one of these codes; the editor shows the matching copy. */
export const CATEGORY_ERROR_KEYS = {
    duplicate: "categories.error.duplicate",
    duplicateEmoji: "categories.error.duplicateEmoji",
    duplicateIcon: "categories.error.duplicateIcon",
    duplicateName: "categories.error.duplicateName",
    incomplete: "categories.error.incomplete",
    missingIcon: "categories.error.missingIcon",
    missingName: "categories.error.missingName",
} satisfies Record<CategoryError, TranslationKey>;
