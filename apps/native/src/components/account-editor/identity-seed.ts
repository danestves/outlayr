import { isPerson } from "@outlayr/money/account-kind";

import type { IdentitySelection } from "@/components/identity-picker-shared";
import { EMPTY_DRAFT } from "@/contexts/identity-draft-context";
import type { Account } from "@/data/accounts-core";
import { remoteEnrichmentOn } from "@/data/settings-core";
import type { BoolSettingKey } from "@/data/settings-core";

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

export function accountIdentityLookup(
    mode: "create" | "edit",
    loaded: Pick<Account, "emoji" | "icon" | "imageKey" | "imageUri" | "kind"> | null,
    bool: (key: BoolSettingKey) => boolean
) {
    // `imageKey` counts on its own: a synced photo can be known before it downloads into `imageUri`, and a lookup
    // started in that gap would save a suggestion over the user's own picture.
    const hasStoredIdentity = Boolean(loaded?.emoji || loaded?.icon || loaded?.imageUri || loaded?.imageKey);
    const person = loaded != null && isPerson(loaded);
    return {
        // A stored identity is a choice already made. An account saved without one is looked up on open and on retype.
        enabled: !person && (mode === "create" || !hasStoredIdentity),
        groundedLookup: bool("groundedLookup"),
        remoteEnabled: remoteEnrichmentOn(bool),
    };
}
