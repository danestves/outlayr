import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { AppSymbol } from "@/components/app-symbol";
import { Text } from "@/components/text";
import { useColors } from "@/theme/use-colors";

// For screens that stay up after a failure (`formSheet`, `modal`): a native presentation covers the root toast
// viewport (see `@/lib/notify`). Nothing moves focus, hence the announcement.
export function InlineFailure({ message }: { message: string | null }) {
    const colors = useColors();

    useEffect(() => {
        if (message !== null) {
            AccessibilityInfo.announceForAccessibility(message);
        }
    }, [message]);

    if (message === null) {
        return null;
    }

    return (
        <Animated.View
            accessibilityRole="alert"
            className="flex-row items-center gap-1.5 px-1 pb-2"
            entering={FadeIn.duration(140)}
            exiting={FadeOut.duration(120)}
        >
            <AppSymbol name="exclamationmark.circle.fill" size={13} tintColor={colors.danger} type="monochrome" />
            <Text className="text-danger text-footnote flex-1 leading-snug">{message}</Text>
        </Animated.View>
    );
}
