import { useState } from "react";
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

// Not "transparent": Fabric on Android reads a zero color as unset and draws the field's text in its default ink.
const INVISIBLE_INK = "rgba(0,0,0,0.01)";

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
    // Past a line the slot stops growing, so the field can draw and scroll its own text without outrunning it.
    const [overflowing, setOverflowing] = useState(false);

    return (
        <View className="flex-row items-baseline gap-1.5">
            <SentenceWash active />
            {children}
            <View>
                <Text
                    aria-hidden
                    className={cn(textClassName, "pr-0.5", overflowing && "opacity-0")}
                    numberOfLines={1}
                    style={{ color: value === "" ? colors.muted : colors.foreground }}
                >
                    {value === "" ? placeholder : value}
                </Text>
                {/* As wide as the slot, so it wraps only once the copy above is cut short. */}
                <Text
                    aria-hidden
                    className={cn(textClassName, "absolute top-0 right-0 left-0 opacity-0")}
                    onTextLayout={(event) => setOverflowing(event.nativeEvent.lines.length > 1)}
                    pointerEvents="none"
                >
                    {value}
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
                    style={
                        overflowing
                            ? { color: colors.foreground, right: 0 }
                            : { color: INVISIBLE_INK, right: -FIELD_OVERHANG }
                    }
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
