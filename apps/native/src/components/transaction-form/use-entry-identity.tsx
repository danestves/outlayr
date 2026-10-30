import { useRouter } from "expo-router";
import { useState } from "react";
import { Keyboard } from "react-native";

import type { IdentitySelection } from "@/components/identity-picker-shared";
import { EMPTY_DRAFT, useIdentityDraft, useIdentityFlyUp, useIdentitySeed } from "@/contexts/identity-draft-context";
import type { Transaction } from "@/data/transactions-core";
import type { LogAgainDraft } from "@/domain/transaction-actions";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { CategoryIconTile } from "../category-icon-tile";
import { identitySeedOf } from "./form-values";
import type { FieldSource, LookupSlot } from "./merchant-lookup";
import type { SentenceVerb } from "./sentence/fact-glyphs";

interface EntryIdentityOptions {
    claim: (slot: LookupSlot) => void;
    copyOf: LogAgainDraft | undefined;
    initial: Transaction | undefined;
    restored: { identity: IdentitySelection; identitySource: FieldSource } | undefined;
    source: FieldSource;
}

export function useEntryIdentity({ claim, copyOf, initial, restored, source }: EntryIdentityOptions) {
    const t = useTranslation();
    const colors = useColors();
    const router = useRouter();
    const { draft: identity, setDraft: setIdentity } = useIdentityDraft();
    const { pickerOpen, setPickerOpen } = useIdentityFlyUp();

    const [restoredIdentity] = useState(() =>
        restored !== undefined && restored.identitySource !== "initial" ? restored.identity : null
    );
    useIdentitySeed(restoredIdentity);

    // Skipped once identity is touched or suggested: re-seeding would wipe an in-progress choice or a logo still
    // correct for the name.
    useIdentitySeed(source === "initial" ? identitySeedOf(initial, copyOf) : null);

    // The spring starts on the tap frame, not the picker route's mount, so the hero does not wait on navigation.
    const openPicker = () => {
        // Or the note's keyboard stays standing over the pushed picker.
        Keyboard.dismiss();
        claim("identity");
        setPickerOpen(true);
        router.push("/transactions/identity");
    };

    const clearIdentity = () => {
        claim("identity");
        setIdentity(EMPTY_DRAFT);
    };

    const hasIdentityMark = Boolean(identity.photoUri ?? identity.emoji ?? identity.icon);
    const tile = hasIdentityMark ? (
        <CategoryIconTile
            color={identity.photoColor ?? identity.color ?? colors.foreground}
            emoji={identity.emoji}
            icon={identity.icon}
            imageUri={identity.photoUri}
            size={20}
            type="solid"
        />
    ) : undefined;

    const verb: SentenceVerb = {
        accessibilityLabel: hasIdentityMark
            ? t("transaction.sentence.set.icon")
            : t("transaction.sentence.add.label", { fact: t("transaction.sentence.add.icon") }),
        active: hasIdentityMark,
        key: "icon",
        label: t("transaction.sentence.add.icon"),
        onPress: openPicker,
        onRemove: clearIdentity,
        removeAccessibilityLabel: t("transaction.identity.hero.removeLogo"),
    };

    return { identity, pickerOpen, tile, verb };
}
