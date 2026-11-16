import { useRef, useState } from "react";
import { TextInput } from "react-native";
import Animated from "react-native-reanimated";

import { cn } from "@/components/tw";
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
    const [focused, setFocused] = useState(false);

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
                        // Capped while typing so the text view scrolls to its own caret: the form cannot follow a
                        // native field into a growing note, and the typed line would sink under the keyboard.
                        className={cn("text-body text-foreground min-h-24", focused ? "max-h-36" : null)}
                        defaultValue={seeded}
                        multiline
                        onBlur={() => setFocused(false)}
                        onChangeText={(next) => {
                            notesRef.current = next;
                            onEdit();
                        }}
                        onEndEditing={() => setSummary(notesRef.current)}
                        onFocus={() => setFocused(true)}
                        placeholder={t("transaction.field.notesPlaceholder")}
                        placeholderTextColor={colors.muted}
                        textAlignVertical="top"
                    />
                </Animated.View>
            </FormScrollItem>
        ) : null;

    // An unmounting input never blurs, so a note closed while typing would otherwise keep the stage hidden.
    return { focused: focused && item !== null, item, line, read: () => notesRef.current, verb };
}
