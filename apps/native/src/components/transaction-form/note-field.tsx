import { Text, TextField, useNativeState } from "@expo/ui/swift-ui";
import { accessibilityLabel, foregroundStyle, lineLimit } from "@expo/ui/swift-ui/modifiers";
import { PixelRatio } from "react-native";

import { useColors } from "@/theme/use-colors";

import { BODY } from "./style";

const LINES = 4;
const LARGE_TEXT_LINES = 3;
const LARGE_TEXT_SCALE = 1.5;

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
// the keyboard. It does not re-scroll as the field grows, so the field holds four lines and scrolls its own caret.
// At large text the form's viewport ends above the stage, so a fourth line would sit under the keyboard.
export function NoteField({ defaultValue, label, onChange, onFocusChange, placeholder }: NoteFieldProps) {
    const colors = useColors();
    const text = useNativeState(defaultValue);
    const lines = PixelRatio.getFontScale() > LARGE_TEXT_SCALE ? LARGE_TEXT_LINES : LINES;

    return (
        <TextField
            axis="vertical"
            modifiers={[
                BODY,
                foregroundStyle(colors.foreground),
                lineLimit({ max: lines, min: lines }),
                accessibilityLabel(label),
            ]}
            onFocusChange={onFocusChange}
            onTextChange={onChange}
            text={text}
        >
            <TextField.Placeholder>
                <Text modifiers={[BODY, foregroundStyle(colors.muted)]}>{placeholder}</Text>
            </TextField.Placeholder>
        </TextField>
    );
}
