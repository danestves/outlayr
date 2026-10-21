import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { ModalClose as ModalCloseBase } from "./modal-close";

const PRESSED_ALPHA = 0.1;
const DISABLED_ALPHA = 0.38;

// The modal runs edge to edge here, so unlike iOS's card it has to clear the top inset itself.
export const ModalClose: typeof ModalCloseBase = ({ accessibilityLabel, disabled = false, onPress }) => {
    const m3 = useMaterialColors();
    const insets = useSafeAreaInsets();
    return (
        <View className="h-16 flex-row items-center px-1" style={{ marginTop: insets.top }}>
            <Pressable
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                android_ripple={{ borderless: true, color: withAlpha(m3.onSurface, PRESSED_ALPHA), radius: 20 }}
                className="size-12 items-center justify-center"
                disabled={disabled}
                onPress={onPress}
            >
                <HugeiconsIcon
                    color={disabled ? withAlpha(m3.onSurface, DISABLED_ALPHA) : m3.onSurface}
                    icon={Cancel01Icon}
                    size={24}
                />
            </Pressable>
        </View>
    );
};
