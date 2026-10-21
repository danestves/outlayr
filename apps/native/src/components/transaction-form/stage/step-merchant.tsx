import { View } from "react-native";

import { ROUNDED, Text, TextInput } from "@/components/text";
import { useColors } from "@/theme/use-colors";

import { StageOptionRow } from "./stage-options";
import type { StageOptionItem } from "./stage-options";

const RULE_HEIGHT = 2;

// Matches `MerchantSlot`, which writes the same string into the same column.
const MAX_NAME_LENGTH = 50;

export interface StepMerchantProps {
    /** Not the sentence's label: both fields are on screen at once, and one label on two inputs is ambiguous. */
    accessibilityLabel: string;
    onChange: (next: string) => void;
    placeholder: string;
    recent: readonly string[];
    recentLabel: string;
    suggestions: readonly string[];
    /** Controlled: the sentence's inline field edits the same string. */
    value: string;
}

function toOptions(names: readonly string[]): StageOptionItem<string>[] {
    return names.map((name) => ({ id: name, label: name }));
}

// Nothing is focused on arrival: most entries pick a known merchant from a row, one tap with no keyboard between.
export function StepMerchant({
    accessibilityLabel,
    onChange,
    placeholder,
    recent,
    recentLabel,
    suggestions,
    value,
}: StepMerchantProps) {
    const colors = useColors();
    const filled = value.length > 0;

    return (
        <View className="gap-4">
            <View>
                <TextInput
                    accessibilityLabel={accessibilityLabel}
                    autoCapitalize="words"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                    maxLength={MAX_NAME_LENGTH}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.muted}
                    returnKeyType="done"
                    style={{
                        color: colors.foreground,
                        fontFamily: ROUNDED,
                        fontSize: 17,
                        padding: 0,
                        paddingBottom: 8,
                    }}
                    testID="stage-merchant-field"
                    value={value}
                />
                <View
                    className="rounded-full"
                    pointerEvents="none"
                    style={{
                        backgroundColor: filled ? colors.tint : colors.separator,
                        height: RULE_HEIGHT,
                    }}
                />
            </View>

            {suggestions.length === 0 ? null : (
                <View testID="stage-merchant-suggestions">
                    <StageOptionRow onSelect={onChange} options={toOptions(suggestions)} selectedId={value} />
                </View>
            )}

            {recent.length === 0 ? null : (
                <View className="gap-2" testID="stage-merchant-recent">
                    <Text className="text-footnote text-muted">{recentLabel}</Text>
                    <StageOptionRow onSelect={onChange} options={toOptions(recent)} selectedId={value} />
                </View>
            )}
        </View>
    );
}
