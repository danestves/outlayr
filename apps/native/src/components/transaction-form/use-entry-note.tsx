import { useRef, useState } from "react";
import { TextInput } from "react-native";
import Animated from "react-native-reanimated";

import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { revealEntering } from "../sentence/sentence-motion";
import { FormScrollItem } from "./form-scroll";
import type { SentenceVerb } from "./sentence/fact-glyphs";

interface EntryNoteOptions {
    contentWidth: number;
    hidden: boolean;
    onEdit: () => void;
    seeded: string;
}

export function useEntryNote({ contentWidth, hidden, onEdit, seeded }: EntryNoteOptions) {
    const t = useTranslation();
    const colors = useColors();
    // The note lives in a ref: lifting it to state would re-render the SwiftUI `Host` per keystroke. The merchant name
    // has two editors, so it is a form field, read only through `Subscribe` for the same reason.
    const notesRef = useRef(seeded);
    const [open, setOpen] = useState(seeded.length > 0);
    const [asked, setAsked] = useState(false);
    const [summary, setSummary] = useState(seeded);

    const line = summary.length === 0 ? null : t("transaction.sentence.extra.note", { note: summary });

    const verb: SentenceVerb = {
        accessibilityLabel: line ?? t("transaction.sentence.add.label", { fact: t("transaction.sentence.add.note") }),
        active: open || summary.length > 0,
        key: "note",
        label: t("transaction.sentence.add.note"),
        onPress: () => {
            setOpen((current) => !current);
            setAsked(true);
        },
    };

    const item =
        open && !hidden ? (
            <FormScrollItem reveal={asked}>
                <Animated.View entering={revealEntering()} style={{ width: contentWidth }}>
                    <TextInput
                        accessibilityLabel={t("transaction.field.notes")}
                        className="text-body text-foreground min-h-24"
                        defaultValue={seeded}
                        multiline
                        onChangeText={(next) => {
                            notesRef.current = next;
                            onEdit();
                        }}
                        onEndEditing={() => setSummary(notesRef.current)}
                        placeholder={t("transaction.field.notesPlaceholder")}
                        placeholderTextColor={colors.muted}
                        textAlignVertical="top"
                    />
                </Animated.View>
            </FormScrollItem>
        ) : null;

    return { item, line, read: () => notesRef.current, verb };
}
