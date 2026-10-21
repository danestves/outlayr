import { Canvas, Path as SkPath } from "@shopify/react-native-skia";
import { Pressable, View } from "react-native";
import { useDerivedValue, useReducedMotion } from "react-native-reanimated";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings, useSettingBool } from "@/contexts/display-settings-context";
import type { SavingsGoalWithProgress } from "@/data/savings-goals";
import { formatTargetMonth } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { useChartDraw } from "@/hooks/use-chart-draw";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

interface GoalCardProps {
    currency: string;
    entry: SavingsGoalWithProgress;
    onPress: (id: string) => void;
    width: number | null;
}

const ARC = { radius: 19, size: 46, stroke: 4 } as const;

export function GoalCard({ currency, entry, onPress, width }: GoalCardProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const colors = useColors();

    const { exact, goal, progress, saved, target } = entry;
    // Reached only counts when comparable: an unconverted EUR 1,000 target is "met" by a GBP 1,000 balance.
    const reached = exact && progress.reached;
    const money = (value: number) => formatAmount(value, currency, showCents, language);
    const percent = Math.round(progress.fraction * 100);
    const { standing } = progress;
    const onPace = standing?.onPace ?? false;
    // A null standing is not ahead: `?? 0 >= 0` would have called it ahead.
    const ahead = onPace || (standing != null && standing.against >= 0);
    const tone = arcTone(reached, ahead, colors);
    const word = standingWord(reached, standing != null, onPace, ahead, t);

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
            className={cn(
                "gap-2.5 rounded-2xl border p-3.5 active:opacity-70",
                reached ? "bg-foreground border-foreground" : "border-border"
            )}
            onPress={() => onPress(goal.id)}
            style={width === null ? { flex: 1 } : { width }}
        >
            <View className="flex-row items-start justify-between">
                <GoalArc fraction={exact ? progress.fraction : 0} tone={tone} />
                {exact ? (
                    <View className="items-end gap-0.5">
                        <Text
                            className={cn(
                                "text-micro font-mono tabular-nums",
                                reached ? "text-background/65" : "text-muted"
                            )}
                            numberOfLines={1}
                        >
                            {`${percent}%`}
                        </Text>
                        {reached ? null : (
                            <Text className="text-micro text-muted font-mono uppercase tabular-nums" numberOfLines={1}>
                                {formatTargetMonth(goal.targetDate, language)}
                            </Text>
                        )}
                    </View>
                ) : null}
            </View>

            <Text
                className={cn("font-sans-semibold text-subtitle", reached ? "text-background" : "text-foreground")}
                numberOfLines={1}
            >
                {goal.name}
            </Text>

            {exact ? null : (
                // A percentage or remainder read off two currencies would answer a comparison nobody made.
                <MonoLabel numberOfLines={2}>{t("goals.card.unvalued")}</MonoLabel>
            )}

            <View className={exact ? undefined : "hidden"}>
                <Text
                    className={cn(
                        "tabular-nums",
                        "font-sans-semibold text-body",
                        reached ? "text-background" : "text-foreground"
                    )}
                    numberOfLines={1}
                >
                    {reached ? money(saved) : money(progress.remaining)}
                </Text>
                <MonoLabel className={reached ? "text-background/65" : undefined} numberOfLines={1}>
                    {reached ? t("goals.reached") : t("goals.toGo")}
                </MonoLabel>
            </View>

            {exact && progress.pace ? (
                <View>
                    <MonoLabel numberOfLines={1}>
                        {t("goals.pace", { amount: money(progress.pace.perMonth) })}
                    </MonoLabel>
                    {word ? (
                        <MonoLabel className={paceTone(onPace, ahead)} numberOfLines={1}>
                            {word}
                        </MonoLabel>
                    ) : null}
                </View>
            ) : null}
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

function paceTone(onPace: boolean, ahead: boolean): string {
    if (onPace) {
        return "text-muted";
    }
    return ahead ? "text-income" : "text-over-budget";
}

function arcTone(reached: boolean, ahead: boolean, colors: ReturnType<typeof useColors>): string {
    if (reached) {
        return colors.background;
    }
    return ahead ? colors.foreground : colors.overBudget;
}

function GoalArc({ fraction, tone }: { fraction: number; tone: string }) {
    const colors = useColors();
    const reduceMotion = useReducedMotion();
    const animated = useSettingBool("animatedCharts") && !reduceMotion;
    const center = ARC.size / 2;
    const target = 270 * Math.min(1, Math.max(0, fraction));
    const sweep = useChartDraw(animated, target);
    const track = arcPath(center, ARC.radius, 135, 270);
    const filled = useDerivedValue(() => arcPath(center, ARC.radius, 135, sweep.get()));

    return (
        <Canvas pointerEvents="none" style={{ height: ARC.size, width: ARC.size }}>
            <SkPath color={colors.railTrack} path={track} strokeWidth={ARC.stroke} style="stroke" />
            {target > 0 ? (
                <SkPath color={tone} path={filled} strokeCap="round" strokeWidth={ARC.stroke} style="stroke" />
            ) : null}
        </Canvas>
    );
}

function arcPath(center: number, radius: number, startDegrees: number, sweepDegrees: number): string {
    "worklet";
    const toPoint = (degrees: number) => {
        const radians = (degrees * Math.PI) / 180;
        return `${center + radius * Math.cos(radians)} ${center + radius * Math.sin(radians)}`;
    };
    const large = sweepDegrees > 180 ? 1 : 0;
    return `M ${toPoint(startDegrees)} A ${radius} ${radius} 0 ${large} 1 ${toPoint(startDegrees + sweepDegrees)}`;
}
