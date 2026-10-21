import { HugeiconsIcon } from "@hugeicons/react-native";
import { Chip } from "panelui-native/components/chip";
import Animated, { LinearTransition } from "react-native-reanimated";

import { useColors } from "@/theme/use-colors";

import { cn } from "../../tw";
import { FACT_GLYPHS } from "./fact-glyphs";
import type { SentenceVerb } from "./fact-glyphs";

// A set chip is `--tint` in both themes; its glyph follows the swipe pills' literal white.
const ON_TINT = "#ffffff";

const CHIP_ICON = 15;

export function FactChips({ chips }: { chips: readonly SentenceVerb[] }) {
    const colors = useColors();
    // `layout`, not per-chip entering: a label that becomes its value changes width, and the row must close the gap
    // without every later chip jumping.
    return (
        <Animated.View className="mt-7 flex-row flex-wrap gap-2" layout={LinearTransition.duration(240)}>
            {chips.map((verb) => (
                <Chip
                    accessibilityLabel={verb.accessibilityLabel}
                    className={cn(
                        "h-auto min-h-[34px] gap-[7px]",
                        verb.active ? "border-tint bg-tint" : "border-separator border-dashed",
                        verb.disabled && "opacity-40"
                    )}
                    closeLabel={verb.removeAccessibilityLabel}
                    disabled={verb.disabled}
                    haptics
                    hitSlop={4}
                    key={verb.key}
                    // An arbitrary size: panelui's stock tailwind-merge files an unknown `text-*` token as a colour and
                    // drops it beside `text-muted`. Ink, not white, on the fill: white is 3.33:1 on the dark theme's
                    // `--tint` and fails AA.
                    labelClassName={cn(
                        "font-sans-medium text-[15px] leading-[21px]",
                        verb.active ? "text-accent-foreground" : "text-muted"
                    )}
                    onClose={verb.active ? verb.onRemove : undefined}
                    onPress={verb.onPress}
                    selected={verb.active}
                    size="lg"
                    start={
                        <HugeiconsIcon
                            color={verb.active ? ON_TINT : colors.muted}
                            icon={verb.active ? FACT_GLYPHS[verb.key].set : FACT_GLYPHS[verb.key].unset}
                            size={CHIP_ICON}
                        />
                    }
                    variant="outline"
                >
                    {verb.label}
                </Chip>
            ))}
        </Animated.View>
    );
}
