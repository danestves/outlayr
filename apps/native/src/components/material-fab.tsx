import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

/** The Log FAB's numbers: 56dp, 16dp corners, 16dp in from the edge. */
const SIZE = 56;
const MARGIN = 16;

/**
 * The FAB floats above the system bar, so a list's end padding grows with the bottom inset:
 * about 48dp more with 3-button navigation.
 */
export function useFabClearance(): number {
    return SIZE + MARGIN * 2 + useSafeAreaInsets().bottom;
}

export function MaterialFab({ label, onPress }: { label: string; onPress: () => void }) {
    const m3 = useMaterialColors();
    const insets = useSafeAreaInsets();

    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            android_ripple={{ borderless: false, color: withAlpha(m3.onPrimaryContainer, 0.12) }}
            className="bg-m3-primary-container absolute items-center justify-center overflow-hidden rounded-2xl"
            onPress={onPress}
            style={{
                bottom: insets.bottom + MARGIN,
                elevation: 6,
                height: SIZE,
                right: insets.right + MARGIN,
                width: SIZE,
            }}
        >
            <HugeiconsIcon color={m3.onPrimaryContainer} icon={PlusSignIcon} size={24} strokeWidth={1.8} />
        </Pressable>
    );
}
