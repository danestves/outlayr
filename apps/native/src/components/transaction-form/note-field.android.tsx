import { useRef, useState } from "react";
import { TextInput } from "react-native";
import type { TextInputInstance } from "react-native";
import Animated from "react-native-reanimated";

import { cn } from "@/components/tw";
import { useKeyboardEvent } from "@/hooks/use-keyboard-height";
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
    const input = useRef<TextInputInstance>(null);
    const [focused, setFocused] = useState(false);
    const focus = (next: boolean) => {
        setFocused(next);
        onFocusChange(next);
    };
    // The back key hides the keyboard but leaves the field focused, which would keep the stage hidden.
    useKeyboardEvent("keyboardDidHide", () => {
        if (focused) {
            input.current?.blur();
        }
    });

    return (
        <FormScrollItem reveal={reveal}>
            <Animated.View entering={revealEntering()} style={{ width }}>
                <TextInput
                    accessibilityLabel={label}
                    // Capped while typing so the text view scrolls to its own caret and the whole field fits above
                    // the keyboard.
                    className={cn("text-body text-foreground min-h-24", focused ? "max-h-36" : null)}
                    defaultValue={defaultValue}
                    multiline
                    onBlur={() => focus(false)}
                    onChangeText={onChange}
                    onFocus={() => focus(true)}
                    placeholder={placeholder}
                    placeholderTextColor={colors.muted}
                    ref={input}
                    textAlignVertical="top"
                />
            </Animated.View>
        </FormScrollItem>
    );
};
