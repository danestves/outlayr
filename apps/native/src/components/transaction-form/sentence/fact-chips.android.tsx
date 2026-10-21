import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useHaptics } from "@/lib/use-haptics";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { FactChips as FactChipsBase } from "./fact-chips";
import { FACT_GLYPHS } from "./fact-glyphs";
import type { SentenceVerb } from "./fact-glyphs";

const CHIP_ICON = 18;

const PRESSED_ALPHA = 0.1;

// Takes a 32dp chip's touch target to M3's 48dp. Stacked rows' targets overlap in the 8dp gap; the later chip wins.
const CHIP_SLOP = { bottom: 8, top: 8 };
// The ✕ reaches into the gap after the chip, never into its own label.
const REMOVE_SLOP = { bottom: 8, left: 4, right: 8, top: 8 };

const DISABLED_ALPHA = 0.38;
const DISABLED_OUTLINE_ALPHA = 0.12;

function FactChip({ verb }: { verb: SentenceVerb }) {
    const m3 = useMaterialColors();
    const haptics = useHaptics();
    const set = verb.active;
    const ink = set ? m3.onSecondaryContainer : m3.onSurfaceVariant;
    const removable = set && verb.onRemove !== undefined;
    const disabled = verb.disabled === true;

    return (
        // Not clipped: clipping would cut the buttons' touch targets back to 32dp. Each button clips its own ripple.
        <View
            className="h-8 flex-row items-center rounded-lg"
            style={
                set
                    ? { backgroundColor: m3.secondaryContainer }
                    : {
                          borderColor: disabled ? withAlpha(m3.onSurface, DISABLED_OUTLINE_ALPHA) : m3.outline,
                          borderWidth: 1,
                      }
            }
        >
            <Pressable
                accessibilityLabel={verb.accessibilityLabel}
                accessibilityRole="button"
                accessibilityState={{ disabled, selected: set }}
                android_ripple={{ color: withAlpha(ink, PRESSED_ALPHA) }}
                className={cn(
                    "h-full flex-row items-center gap-2 overflow-hidden pl-2",
                    removable ? "rounded-l-lg" : "rounded-lg"
                )}
                disabled={disabled}
                hitSlop={CHIP_SLOP}
                onPress={() => {
                    haptics("selection");
                    verb.onPress();
                }}
                style={{ opacity: disabled ? DISABLED_ALPHA : 1, paddingRight: removable ? 4 : 16 }}
            >
                <HugeiconsIcon
                    color={set ? m3.onSecondaryContainer : m3.primary}
                    icon={set ? FACT_GLYPHS[verb.key].set : FACT_GLYPHS[verb.key].unset}
                    size={CHIP_ICON}
                />
                <Text className="font-sans-medium text-caption" numberOfLines={1} style={{ color: ink }}>
                    {verb.label}
                </Text>
            </Pressable>
            {removable ? (
                <Pressable
                    accessibilityLabel={verb.removeAccessibilityLabel}
                    accessibilityRole="button"
                    android_ripple={{ borderless: true, color: withAlpha(ink, PRESSED_ALPHA), radius: 14 }}
                    className="h-full justify-center pr-2 pl-1"
                    hitSlop={REMOVE_SLOP}
                    onPress={verb.onRemove}
                >
                    <HugeiconsIcon color={ink} icon={Cancel01Icon} size={CHIP_ICON} />
                </Pressable>
            ) : null}
        </View>
    );
}

export const FactChips: typeof FactChipsBase = ({ chips }) => (
    <Animated.View className="mt-7 flex-row flex-wrap gap-2" layout={LinearTransition.duration(240)}>
        {chips.map((verb) => (
            <FactChip key={verb.key} verb={verb} />
        ))}
    </Animated.View>
);
