import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion } from "react-native-reanimated";

import { cn, tv } from "@/components/tw";
import { useSettingBool } from "@/contexts/display-settings-context";
import { budgetRail } from "@/domain/budget-math";
import { useChartDraw } from "@/hooks/use-chart-draw";

interface BudgetProgressBarProps {
    height?: number;
    limit: number;
    paceBehind?: boolean;
    /** Fraction of the period remaining; null hides the pace marker. */
    paceRemaining?: number | null;
    spent: number;
    /** Ignored once over: past the limit the rail states the verdict, not the category. */
    tint?: string | null;
}

const rail = tv({
    base: "w-full overflow-hidden rounded-full",
    variants: {
        over: { false: "bg-rail-track", true: "bg-rail-over" },
    },
});

const railFill = tv({
    base: "h-full rounded-full",
    variants: {
        over: { false: "bg-foreground", true: "bg-over-budget" },
    },
});

export function BudgetProgressBar({
    spent,
    limit,
    paceRemaining = null,
    paceBehind = false,
    height = 6,
    tint = null,
}: BudgetProgressBarProps) {
    const { fill: pct, over } = budgetRail(spent, limit);
    const reduceMotion = useReducedMotion();
    const animated = useSettingBool("animatedCharts") && !reduceMotion;
    const fill = useChartDraw(animated, pct);
    const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
    // Over budget the rail is no longer drawn to the limit's scale, so the pace marker has nothing to point at.
    const showMarker = !over && paceRemaining != null && paceRemaining > 0 && paceRemaining < 1;

    return (
        <View className={cn("relative", showMarker ? "pt-[9px]" : "pt-0")}>
            {showMarker && paceRemaining != null ? (
                <View
                    className={cn(
                        "absolute top-0 size-0 -translate-x-1.5 border-t-[7px] border-r-[6px] border-l-[6px] border-r-transparent border-l-transparent",
                        paceBehind ? "border-t-over-budget" : "border-t-foreground"
                    )}
                    style={{ left: `${paceRemaining * 100}%` }}
                />
            ) : null}
            <View className={rail({ over })} style={{ height }}>
                <Animated.View
                    className={railFill({ over })}
                    style={[over || tint == null ? null : { backgroundColor: tint }, fillStyle]}
                />
            </View>
        </View>
    );
}
