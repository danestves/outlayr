import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRef } from "react";
import { Keyboard } from "react-native";

import type { TagRow } from "@/data/tags-core";
import type { Database } from "@/db/client";
import { normalizeTagName } from "@/domain/tags";
import { namedWithCount } from "@/domain/transaction-form-labels";
import { useTranslation } from "@/i18n/context";

import { TagPickerSheet } from "../tag-picker-sheet";
import { createTagEntry } from "./entry-flows";
import type { EntryForm } from "./form-values";
import type { FieldSource, LookupSlot } from "./merchant-lookup";
import type { SentenceVerb } from "./sentence/fact-glyphs";

interface EntryTagsOptions {
    allTags: readonly TagRow[];
    claim: (slot: LookupSlot) => void;
    db: Database;
    form: EntryForm;
    pendingTagNames: readonly string[];
    savedTagIds: string[];
    source: FieldSource;
    tagIds: string[];
}

export function useEntryTags({
    allTags,
    claim,
    db,
    form,
    pendingTagNames,
    savedTagIds,
    source,
    tagIds,
}: EntryTagsOptions) {
    const t = useTranslation();
    const sheetRef = useRef<BottomSheetModal>(null);

    // Until touched, the row's tags are the saved ones: the field is still the empty array it mounted with.
    const effectiveTagIdsOf = (ids: string[]) => (source === "initial" ? savedTagIds : ids);
    const labels = [
        ...allTags.filter((tag) => effectiveTagIdsOf(tagIds).includes(tag.id)).map((tag) => tag.name),
        ...pendingTagNames,
    ];

    const verb: SentenceVerb = {
        accessibilityLabel:
            labels.length === 0
                ? t("transaction.sentence.add.label", { fact: t("transaction.sentence.add.tags") })
                : t("transaction.sentence.extra.tags", {
                      tags: labels.join(", "),
                  }),
        active: labels.length > 0,
        key: "tags",
        label: labels.length === 0 ? t("transaction.sentence.add.tags") : namedWithCount(labels),
        onPress: () => {
            Keyboard.dismiss();
            sheetRef.current?.present();
        },
    };

    const sheet = (
        <TagPickerSheet
            onCreate={(createdTagName) =>
                createTagEntry(db, createdTagName, (id) => {
                    claim("tags");
                    form.setFieldValue("tagIds", [...effectiveTagIdsOf(form.state.values.tagIds), id]);
                    form.setFieldValue("pendingTagNames", (current) =>
                        current.filter((pendingName) => normalizeTagName(pendingName) !== createdTagName)
                    );
                })
            }
            onToggle={(tagId) => {
                claim("tags");
                const current = effectiveTagIdsOf(form.state.values.tagIds);
                form.setFieldValue(
                    "tagIds",
                    current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
                );
            }}
            pendingTagNames={pendingTagNames}
            ref={sheetRef}
            selected={effectiveTagIdsOf(tagIds)}
            tags={allTags}
        />
    );

    const commitOf = (value: { pendingTagNames: readonly string[]; tagIds: string[] }) =>
        source === "initial" ? undefined : { pendingNames: value.pendingTagNames, tagIds: value.tagIds };

    return { commitOf, sheet, verb };
}
