import type { ReactNode } from "react";
import { Platform, View } from "react-native";

import { useColors } from "@/theme/use-colors";

import { Text, TextInput } from "../text";
import { cn } from "../tw";
import { useSentenceStyle } from "./sentence";
import { SentenceWash } from "./sentence-wash";

// Same clearance as `SentenceValue`'s rule, so the slot keeps its underline when it turns into a field.
const RULE_BOTTOM = 7;

// UIKit draws a field's line-height slack above its glyphs, where Text centers them in the line. Without it the
// field centers its own line, which lands on the sentence's baseline.
const LEADING = /\bleading-\S+/g;

// A keystroke lands in the native field a frame before the copy widens the slot. The overhang gives that character
// room, or the field scrolls its text sideways for a frame and its caret jumps.
const FIELD_OVERHANG = 32;

interface SentenceInputProps {
    accessibilityLabel: string;
    children?: ReactNode;
    maxLength: number;
    onChange: (next: string) => void;
    onSubmit: () => void;
    placeholder: string;
    value: string;
}

// The copy draws the text and the field only the caret: the copy is laid out in the same commit as the slot's width,
// so letters never outrun it. It also gives the row a baseline, which an iOS TextInput lacks.
export function SentenceInput({
    accessibilityLabel,
    children,
    maxLength,
    onChange,
    onSubmit,
    placeholder,
    value,
}: SentenceInputProps) {
    const { textClassName } = useSentenceStyle();
    const colors = useColors();

    return (
        <View className="flex-row items-baseline gap-1.5">
            <SentenceWash active />
            {children}
            <View>
                <Text
                    aria-hidden
                    className={cn(textClassName, "pr-0.5")}
                    numberOfLines={1}
                    style={{ color: value === "" ? colors.muted : colors.foreground }}
                >
                    {value === "" ? placeholder : value}
                </Text>
                <TextInput
                    accessibilityLabel={accessibilityLabel}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus
                    className={cn(
                        Platform.OS === "ios" ? textClassName.replaceAll(LEADING, "") : textClassName,
                        "absolute top-0 bottom-0 left-0 p-0"
                    )}
                    maxLength={maxLength}
                    onChangeText={onChange}
                    onSubmitEditing={onSubmit}
                    returnKeyType="next"
                    selectionColor={colors.tint}
                    style={{ color: "transparent", right: -FIELD_OVERHANG }}
                    submitBehavior="submit"
                    testID="sentence-merchant-field"
                    value={value}
                />
            </View>
            <View
                className="absolute right-0 left-0 h-[2px] rounded-full"
                pointerEvents="none"
                style={{ backgroundColor: colors.tint, bottom: RULE_BOTTOM }}
            />
        </View>
    );
}
