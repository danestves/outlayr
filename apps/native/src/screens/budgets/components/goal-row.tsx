import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion } from "react-native-reanimated";

import { MONO_LABEL_CLASS } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings, useSettingBool } from "@/contexts/display-settings-context";
import type { SavingsGoalWithProgress } from "@/data/savings-goals";
import { formatTargetMonth } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useChartDraw } from "@/hooks/use-chart-draw";
import { useLanguage, useTranslation } from "@/i18n/context";

interface GoalRowProps {
    currency: string;
    entry: SavingsGoalWithProgress;
    onPress: (id: string) => void;
}

export function GoalRow({ currency, entry, onPress }: GoalRowProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const stacked = useAccessibilityTextSize();

    const { exact, goal, progress, saved, target } = entry;
    const reached = exact && progress.reached;
    const money = (value: number) => formatAmount(value, currency, showCents, language);
    const percent = Math.round(progress.fraction * 100);
    const { standing } = progress;
    const onPace = standing?.onPace ?? false;
    const ahead = onPace || (standing != null && standing.against >= 0);
    const word = standingWord(reached, standing != null, onPace, ahead, t);
    const expected = standing && target > 0 ? standing.expected / target : null;

    let meta: string;
    if (!exact) {
        meta = t("goals.card.unvalued");
    } else if (reached) {
        meta = formatTargetMonth(goal.targetDate, language);
    } else {
        meta = [
            `${percent}%`,
            formatTargetMonth(goal.targetDate, language),
            progress.pace ? t("goals.pace", { amount: money(progress.pace.perMonth) }) : null,
        ]
            .filter(Boolean)
            .join(" · ");
    }

    return (
        <Pressable
            accessibilityHint={t("goals.a11y.openHint")}
            accessibilityLabel={
                exact
                    ? t("goals.a11y.card", {
                          name: goal.name,
                          percent: String(percent),
                          saved: money(saved),
                          standing: word ?? t("goals.a11y.noStanding"),
                          target: money(target),
                      })
                    : t("goals.a11y.unvalued", { name: goal.name })
            }
            accessibilityRole="button"
            className="border-border gap-2 border-b py-3.5 active:opacity-70"
            onPress={() => onPress(goal.id)}
        >
            <View className={stacked ? "items-start gap-1" : "flex-row items-center gap-2"}>
                <Text
                    className={cn("font-sans-semibold text-body text-foreground", !stacked && "flex-1")}
                    numberOfLines={stacked ? undefined : 1}
                >
                    {goal.name}
                </Text>
                {exact ? (
                    <Text className="font-sans-semibold text-body text-foreground tabular-nums" numberOfLines={1}>
                        {reached ? money(saved) : money(progress.remaining)}
                        <Text className="font-sans-medium text-label text-muted">
                            {` ${reached ? t("goals.reached").toLocaleLowerCase(language) : t("goals.toGo")}`}
                        </Text>
                    </Text>
                ) : null}
            </View>

            {exact ? (
                <GoalRail
                    behind={!reached && !ahead}
                    expected={expected}
                    fraction={progress.fraction}
                    reached={reached}
                />
            ) : null}

            <Text className={cn(MONO_LABEL_CLASS, "text-muted")} numberOfLines={stacked ? undefined : 1}>
                {meta}
                {word ? <Text className={wordTone(reached, onPace, ahead)}>{` · ${word}`}</Text> : null}
            </Text>
        </Pressable>
    );
}

function standingWord(
    reached: boolean,
    measured: boolean,
    onPace: boolean,
    ahead: boolean,
    t: ReturnType<typeof useTranslation>
): string | null {
    if (reached) {
        return t("goals.reached");
    }
    if (!measured) {
        return null;
    }
    if (onPace) {
        return t("goals.onPace");
    }
    return ahead ? t("goals.ahead") : t("goals.behind");
}

function wordTone(reached: boolean, onPace: boolean, ahead: boolean): string {
    if (reached) {
        return "text-income";
    }
    if (onPace) {
        return "text-muted";
    }
    return ahead ? "text-income" : "text-over-budget";
}

function GoalRail({
    behind,
    expected,
    fraction,
    reached,
}: {
    behind: boolean;
    expected: number | null;
    fraction: number;
    reached: boolean;
}) {
    const reduceMotion = useReducedMotion();
    const animated = useSettingBool("animatedCharts") && !reduceMotion;
    const fill = useChartDraw(animated, Math.min(1, Math.max(0, fraction)));
    const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
    const tick = expected == null || reached ? null : Math.min(1, Math.max(0, expected));

    return (
        <View className="justify-center" style={{ height: 12 }}>
            <View className="bg-rail-track h-1.5 w-full overflow-hidden rounded-full">
                <Animated.View
                    className={cn(
                        "h-full rounded-full",
                        reached && "bg-income",
                        behind && "bg-over-budget",
                        !reached && !behind && "bg-foreground"
                    )}
                    style={fillStyle}
                />
            </View>
            {tick == null ? null : (
                <View className="bg-foreground absolute h-3 w-0.5 rounded-full" style={{ left: `${tick * 100}%` }} />
            )}
        </View>
    );
}
