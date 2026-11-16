import { useRef, useState } from "react";

import { useTranslation } from "@/i18n/context";

import { NoteField } from "./note-field";
import type { SentenceVerb } from "./sentence/fact-glyphs";

interface EntryNoteOptions {
    contentWidth: number;
    hidden: boolean;
    onEdit: () => void;
    seeded: string;
}

export function useEntryNote({ contentWidth, hidden, onEdit, seeded }: EntryNoteOptions) {
    const t = useTranslation();
    // The note lives in a ref: lifting it to state would re-render the SwiftUI `Host` per keystroke. The merchant name
    // has two editors, so it is a form field, read only through `Subscribe` for the same reason.
    const notesRef = useRef(seeded);
    const [open, setOpen] = useState(seeded.length > 0);
    const [asked, setAsked] = useState(false);
    const [summary, setSummary] = useState(seeded);
    const [focused, setFocused] = useState(false);

    const line = summary.length === 0 ? null : t("transaction.sentence.extra.note", { note: summary });

    const verb: SentenceVerb = {
        accessibilityLabel: line ?? t("transaction.sentence.add.label", { fact: t("transaction.sentence.add.note") }),
        active: open || summary.length > 0,
        key: "note",
        label: t("transaction.sentence.add.note"),
        onPress: () => {
            if (open) {
                setSummary(notesRef.current);
            }
            setOpen((current) => !current);
            setAsked(true);
        },
    };

    const item =
        open && !hidden ? (
            <NoteField
                defaultValue={summary}
                label={t("transaction.field.notes")}
                onChange={(next) => {
                    notesRef.current = next;
                    onEdit();
                }}
                onFocusChange={(next) => {
                    setFocused(next);
                    if (!next) {
                        setSummary(notesRef.current);
                    }
                }}
                placeholder={t("transaction.field.notesPlaceholder")}
                reveal={asked}
                width={contentWidth}
            />
        ) : null;

    // An unmounting input never blurs: closing it from the chip syncs the summary, and focus is gated on the item.
    return { focused: focused && item !== null, item, line, read: () => notesRef.current, verb };
}
