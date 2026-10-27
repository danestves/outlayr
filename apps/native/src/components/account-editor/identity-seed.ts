import type { IdentitySelection } from "@/components/identity-picker-shared";
import { EMPTY_DRAFT } from "@/contexts/identity-draft-context";
import type { Account } from "@/data/accounts-core";

export function accountIdentitySeed(mode: "create" | "edit", loaded: Account | null): IdentitySelection {
    if (mode !== "edit" || loaded === null) {
        return EMPTY_DRAFT;
    }
    return {
        color: loaded.customColor ?? null,
        emoji: loaded.emoji ?? null,
        icon: loaded.icon ?? null,
        photoColor: loaded.imageColor ?? null,
        photoUri: loaded.imageUri ?? null,
    };
}

export function logoMayReplaceIdentity(
    source: "initial" | "suggested" | "user",
    pickerOpen: boolean,
    hasIdentity: boolean
) {
    return source !== "user" && !pickerOpen && !(source === "initial" && hasIdentity);
}

export function draftHasIdentity(draft: IdentitySelection) {
    return Boolean(draft.emoji || draft.icon || draft.photoUri);
}
