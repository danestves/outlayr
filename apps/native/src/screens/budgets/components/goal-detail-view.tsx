import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { SavingsGoalDetail } from "@/data/savings-goals";
import { formatTargetMonth } from "@/domain/dates";
import { startOfLocalDay } from "@/domain/local-day";
import { formatAmount } from "@/domain/money";
import { goalRequiredLine } from "@/domain/savings-goal";
import { useLanguage, useTranslation } from "@/i18n/context";

import { GoalPaceChart } from "./goal-pace-chart";
import { InlineEditorKeyboard } from "./inline-editor-keyboard";

interface GoalDetailViewProps {
    /** The ledger's display currency: every figure here is already valued into it. */
    currency: string;
    editor: ReactNode;
    entry: SavingsGoalDetail;
    nowMs: number;
}

const CHART_HEIGHT = 150;
const STATED = "font-sans-medium text-[26px] leading-[36px] tracking-tight";

export function GoalDetailView({ currency, editor, entry, nowMs }: GoalDetailViewProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const [width, setWidth] = useState<number | null>(null);

    const { goal, progress, saved, start, target } = entry;
    const display = (value: number) => formatAmount(value, currency, showCents, language);

    const required = useMemo(
        () =>
            goalRequiredLine({ startAmount: start, startDate: goal.dateCreated, targetDate: goal.targetDate }, target),
        [start, goal.dateCreated, goal.targetDate, target]
    );

    const { standing } = progress;
    const ahead = (standing?.against ?? 0) >= 0;
    const verdict = (() => {
        // Comparability first: `reached` can be true across currencies, beside a headline saying there is no rate.
        if (!entry.exact) {
            return null;
        }
        if (progress.reached) {
            return t("goals.detail.verdictReached");
        }
        if (standing == null) {
            return null;
        }
        if (standing.onPace) {
            return t("goals.detail.verdictOnPace", { date: formatTargetMonth(goal.targetDate, language) });
        }
        return t(ahead ? "goals.detail.verdictAhead" : "goals.detail.verdictBehind", {
            amount: display(Math.abs(standing.against)),
        });
    })();

    // `standing` is null when reached or when the span is degenerate; only the first is an achievement.
    const paceValue = (() => {
        if (!entry.exact) {
            return "—";
        }
        if (progress.reached) {
            return t("goals.reached");
        }
        if (standing == null) {
            return "—";
        }
        if (standing.onPace) {
            return t("goals.onPace");
        }
        return `${ahead ? "+" : "−"}${display(Math.abs(standing.against))}`;
    })();
    const paceTone = (() => {
        if (!entry.exact) {
            return "text-muted";
        }
        if (progress.reached) {
            return "text-income";
        }
        if (standing == null || standing.onPace) {
            return "text-foreground";
        }
        return ahead ? "text-income" : "text-over-budget";
    })();

    return (
        <InlineEditorKeyboard>
            <ScrollView
                // The editor's name field is last in this scroller; without this the keyboard covers it.
                automaticallyAdjustKeyboardInsets
                className="bg-background flex-1"
                contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 20 }}
                contentInsetAdjustmentBehavior="automatic"
                keyboardDismissMode="on-drag"
            >
                <View className="pt-1 pb-5">
                    <Text className={cn(STATED, "text-foreground")}>
                        {goal.name}{" "}
                        <Text className={cn(STATED, "text-grammar")}>
                            {t("goals.editor.by").toLocaleLowerCase(language)}{" "}
                        </Text>
                        <Text className={cn(STATED, "text-tint")}>{formatTargetMonth(goal.targetDate, language)}.</Text>
                    </Text>
                    <Text className={cn(STATED, "text-grammar")}>
                        {entry.exact ? display(saved) : ""}{" "}
                        <Text className={cn(STATED, "text-grammar")}>
                            {entry.exact
                                ? t("goals.detail.of", {
                                      amount: display(target),
                                      percent: Math.round(progress.fraction * 100),
                                  })
                                : t("goals.detail.unvalued")}
                        </Text>
                    </Text>
                </View>

                <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
                    {entry.exact ? null : (
                        <View className="border-border justify-center border-y" style={{ height: CHART_HEIGHT }}>
                            <Text className="text-footnote text-muted text-center leading-snug">
                                {t("goals.detail.unvalued")}
                            </Text>
                        </View>
                    )}
                    {!entry.exact || width === null ? (
                        // The chart measures its own domain, so it waits for a real width.
                        <View style={{ height: entry.exact ? CHART_HEIGHT : 0 }} />
                    ) : (
                        <GoalPaceChart
                            actual={entry.actual}
                            height={CHART_HEIGHT}
                            label={verdict ? t("goals.a11y.chart", { standing: verdict }) : undefined}
                            nowMs={nowMs}
                            required={required}
                            // The local-day boundaries `goalRequiredLine` uses: raw instants clamp half the line
                            // against the left edge, so a goal opened at noon reads as far behind.
                            startTime={startOfLocalDay(goal.dateCreated.getTime())}
                            target={target}
                            targetTime={startOfLocalDay(goal.targetDate.getTime())}
                            width={width}
                        />
                    )}
                </View>

                <View className="border-border mt-4 flex-row border-y">
                    <Measure
                        label={t("goals.detail.perMonth")}
                        value={progress.pace == null ? "—" : display(progress.pace.perMonth)}
                    />
                    <Measure
                        label={t("goals.detail.monthsLeft")}
                        value={progress.pace == null ? "—" : String(progress.pace.monthsLeft)}
                    />
                    <Measure label={t("goals.detail.pace")} tone={paceTone} value={paceValue} />
                </View>

                {verdict ? <Text className="text-body text-muted pt-3 leading-snug">{verdict}</Text> : null}

                {editor}
            </ScrollView>
        </InlineEditorKeyboard>
    );
}

function Measure({ label, tone, value }: { label: string; tone?: string; value: string }) {
    return (
        <View className="flex-1 py-3">
            <Text className="text-micro text-muted tracking-eyebrow font-mono uppercase">{label}</Text>
            <Text
                className={cn("tabular-nums", "font-sans-semibold text-subtitle pt-0.5", tone ?? "text-foreground")}
                numberOfLines={1}
            >
                {value}
            </Text>
        </View>
    );
}
