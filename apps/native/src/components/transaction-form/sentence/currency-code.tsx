import { Pressable } from "react-native";

import { Text } from "../../text";

interface CurrencyCodeProps {
    accessibilityLabel: string;
    code: string;
    onPress: () => void;
}

export function CurrencyCode({ accessibilityLabel, code, onPress }: CurrencyCodeProps) {
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityValue={{ text: code }}
            // Three glyphs at 13/18 is a ~30x18 box; 14 on each edge takes it past 44 in both axes.
            hitSlop={14}
            onPress={onPress}
        >
            <Text className="text-tint text-footnote font-mono">{code}</Text>
        </Pressable>
    );
}
