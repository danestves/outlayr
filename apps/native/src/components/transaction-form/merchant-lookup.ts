import type { EnrichmentSuggestion } from "@/hooks/use-transaction-enrichment";

// Only a human edit ("user") locks a field, so a later suggestion can still replace an earlier one.
export type FieldSource = "initial" | "suggested" | "user";

export type LookupSlot = "category" | "identity" | "tags";

export interface LookupSources {
    categorySource: FieldSource;
    identitySource: FieldSource;
    tagsSource: FieldSource;
}

export interface LookupGuard {
    asked: boolean;
    touched: ReadonlySet<LookupSlot>;
}

export type SlotWrite = "clear" | "fill" | "keep";

export function replacesSlot({ asked, touched }: LookupGuard, slot: LookupSlot): boolean {
    return asked && !touched.has(slot);
}

export function suggestionWrites(
    guard: LookupGuard,
    { categorySource, tagsSource }: LookupSources,
    savedTagCount: number,
    suggestion: Pick<EnrichmentSuggestion, "categoryId" | "pendingCategory" | "pendingTagNames" | "tagIds">
) {
    let category: SlotWrite = "keep";
    if (replacesSlot(guard, "category") || categorySource !== "user") {
        if (suggestion.categoryId != null || suggestion.pendingCategory != null) {
            category = "fill";
        } else if (categorySource === "suggested") {
            category = "clear";
        }
    }
    // Tags an edit opened with are the user's, but they arrive by query rather than with `initial`, so the guard
    // reads them at apply time.
    const savedTagsStand = tagsSource === "initial" && savedTagCount > 0;
    let tags: SlotWrite = "keep";
    if (replacesSlot(guard, "tags") || (tagsSource !== "user" && !savedTagsStand)) {
        if (suggestion.tagIds.length > 0 || suggestion.pendingTagNames.length > 0) {
            tags = "fill";
        } else if (tagsSource === "suggested") {
            tags = "clear";
        }
    }
    return { category, tags };
}

export function logoBlocked(
    guard: LookupGuard,
    identitySource: FieldSource,
    identity: { held: boolean; pickerOpen: boolean }
): boolean {
    return (
        identity.pickerOpen ||
        // A requested lookup outranks what the well holds; only an open picker outranks it.
        (!replacesSlot(guard, "identity") &&
            (identitySource === "user" ||
                // An emoji or photo from `initial`/`copyOf` is a choice already made.
                (identitySource === "initial" && identity.held)))
    );
}

export function carriedSlots(
    { touched }: LookupGuard,
    { categorySource, identitySource, tagsSource }: LookupSources,
    suggestedDomain: string | null
) {
    return {
        carryCategory: categorySource === "suggested" && !touched.has("category"),
        carryTags: tagsSource === "suggested" && !touched.has("tags"),
        domain: identitySource === "suggested" && !touched.has("identity") ? suggestedDomain : null,
    };
}
