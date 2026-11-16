import { useState } from "react";
import { TextInput } from "react-native";
import Animated from "react-native-reanimated";

import { cn } from "@/components/tw";
import { useColors } from "@/theme/use-colors";

import { revealEntering } from "../sentence/sentence-motion";
import { FormScrollItem } from "./form-scroll";
import type { NoteField as NoteFieldBase } from "./note-field";

export const NoteField: typeof NoteFieldBase = ({
    defaultValue,
    label,
    onChange,
    onFocusChange,
    placeholder,
    reveal,
    width,
}) => {
    const colors = useColors();
    const [focused, setFocused] = useState(false);
    const focus = (next: boolean) => {
        setFocused(next);
        onFocusChange(next);
    };

    return (
        <FormScrollItem reveal={reveal}>
            <Animated.View entering={revealEntering()} style={{ width }}>
                <TextInput
                    accessibilityLabel={label}
                    // Capped while typing so the text view scrolls to its own caret: the form scrolls the note clear
                    // only when the keyboard arrives, not as the note grows.
                    className={cn("text-body text-foreground min-h-24", focused ? "max-h-36" : null)}
                    defaultValue={defaultValue}
                    multiline
                    onBlur={() => focus(false)}
                    onChangeText={onChange}
                    onFocus={() => focus(true)}
                    placeholder={placeholder}
                    placeholderTextColor={colors.muted}
                    textAlignVertical="top"
                />
            </Animated.View>
        </FormScrollItem>
    );
};
