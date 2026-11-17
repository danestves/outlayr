import type { ReactNode } from "react";
import { View } from "react-native";

import { useColors } from "@/theme/use-colors";

import { Text, TextInput } from "../text";
import { cn } from "../tw";
import { useSentenceStyle } from "./sentence";
import { SentenceWash } from "./sentence-wash";

// Same clearance as `SentenceValue`'s rule, so the slot keeps its underline when it turns into a field.
const RULE_BOTTOM = 7;

interface SentenceInputProps {
    accessibilityLabel: string;
    children?: ReactNode;
    maxLength: number;
    onChange: (next: string) => void;
    onSubmit: () => void;
    placeholder: string;
    value: string;
}

// The hidden copy gives the row its baseline and width: an iOS TextInput has no baseline, so the sentence would align
// its bottom edge and drop the typed text below the other words.
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
                <Text aria-hidden className={cn(textClassName, "pr-0.5 opacity-0")} numberOfLines={1}>
                    {value === "" ? placeholder : value}
                </Text>
                <TextInput
                    accessibilityLabel={accessibilityLabel}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus
                    className={cn(textClassName, "text-foreground absolute inset-0 p-0")}
                    maxLength={maxLength}
                    onChangeText={onChange}
                    onSubmitEditing={onSubmit}
                    placeholder={placeholder}
                    placeholderTextColor={colors.muted}
                    returnKeyType="next"
                    selectionColor={colors.tint}
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
