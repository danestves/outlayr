import { TextField, useNativeState } from "@expo/ui/swift-ui";
import { accessibilityLabel, foregroundStyle, lineLimit } from "@expo/ui/swift-ui/modifiers";

import { useColors } from "@/theme/use-colors";

import { BODY } from "./style";

export interface NoteFieldProps {
    defaultValue: string;
    label: string;
    onChange: (text: string) => void;
    onFocusChange: (focused: boolean) => void;
    placeholder: string;
    /** Android only: animates the field in when the note was just asked for. */
    reveal: boolean;
    width: number;
}

// A SwiftUI field, not a React Native one: the form's SwiftUI ScrollView keeps only its own focused fields clear of
// the keyboard, following the caret as the note grows.
export function NoteField({ defaultValue, label, onChange, onFocusChange, placeholder }: NoteFieldProps) {
    const colors = useColors();
    const text = useNativeState(defaultValue);

    return (
        <TextField
            axis="vertical"
            modifiers={[
                BODY,
                foregroundStyle(colors.foreground),
                lineLimit({ max: 8, min: 4 }),
                accessibilityLabel(label),
            ]}
            onFocusChange={onFocusChange}
            onTextChange={onChange}
            placeholder={placeholder}
            text={text}
        />
    );
}
