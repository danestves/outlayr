import ArrowDataTransferVerticalIcon from "@hugeicons-pro/core-stroke-rounded/ArrowDataTransferVerticalIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import { useColors } from "@/theme/use-colors";

import { Text } from "../text";
import { cn } from "../tw";
import { useSentenceStyle } from "./sentence";

// Matches `SentenceValue`'s rule.
const RULE_BOTTOM = 7;

const SWAP_GLYPH = 13;

interface SentenceToggleProps {
    accessibilityLabel: string;
    onPress: () => void;
    value: string;
}

// A solid rule, like a value's: the dashed rule marks an empty slot, and a toggle always has a value.
export function SentenceToggle({ accessibilityLabel, onPress, value }: SentenceToggleProps) {
    const { textClassName } = useSentenceStyle();
    const colors = useColors();

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityValue={{ text: value }}
            onPress={onPress}
        >
            <View className="flex-row items-baseline gap-1.5">
                <Text className={cn(textClassName, "text-foreground")}>{value}</Text>
                <HugeiconsIcon color={colors.tint} icon={ArrowDataTransferVerticalIcon} size={SWAP_GLYPH} />
            </View>
            <View
                className="bg-tint absolute right-0 left-0 h-[2px] rounded-full"
                pointerEvents="none"
                style={{ bottom: RULE_BOTTOM }}
            />
        </Pressable>
    );
}
