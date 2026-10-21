import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

import { Text } from "../text";
import { cn } from "../tw";
import { useSentenceStyle } from "./sentence";
import { SentenceWash } from "./sentence-wash";
import { useSentenceShake } from "./use-sentence-shake";

// Matches `SentenceValue`'s rule.
const RULE_BOTTOM = 7;

interface SentenceBlankProps {
    accessibilityLabel: string;
    active?: boolean;
    flagged?: boolean;
    label: string;
    onPress: () => void;
    optional?: boolean;
    optionalHint?: string;
    /** Rises on each rejected save, so a second attempt is answered again. */
    shake?: boolean;
}

// Still until flagged: a pulsing blank would repaint every frame, and there may be four of them.
export function SentenceBlank({
    accessibilityLabel,
    active,
    flagged,
    label,
    onPress,
    optional,
    optionalHint,
    shake,
}: SentenceBlankProps) {
    const { textClassName } = useSentenceStyle();
    const shakeStyle = useSentenceShake(shake);

    const tone = () => {
        if (flagged) {
            return "text-danger";
        }
        return optional && !active ? "text-grammar" : "text-foreground";
    };

    const rule = () => {
        if (flagged) {
            return "bg-danger h-[2px] rounded-full";
        }
        if (active) {
            return "bg-tint h-[2px] rounded-full";
        }
        return optional ? "border-grammar border-b border-dotted" : "border-tint border-b-2 border-dashed";
    };

    return (
        <Animated.View style={shakeStyle}>
            <Pressable
                accessibilityHint={optional ? optionalHint : undefined}
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                accessibilityValue={{ text: label }}
                onPress={onPress}
            >
                <SentenceWash active={active} />
                <Text className={cn(textClassName, tone())}>{label}</Text>
                <View
                    className={cn("absolute right-0 left-0", rule())}
                    pointerEvents="none"
                    style={{ bottom: RULE_BOTTOM }}
                />
            </Pressable>
        </Animated.View>
    );
}
