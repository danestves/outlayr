import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { MarkInk, useMark } from "@/components/empty-state";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import type { InsightsMeasure, InsightsPeriod } from "@/data/insights";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { MARK_CEILING } from "@/theme/empty-state-ink";
import { useColors } from "@/theme/use-colors";

import { MEASURE_KEY } from "../measure-label";

/** Matches the chart's plot height, so promoting a quiet measure never jumps. */
const PLOT_HEIGHT = 150;

const PERIOD_PHRASE_KEY = {
    month: "insights.quiet.thisMonth",
    week: "insights.quiet.thisWeek",
    year: "insights.quiet.thisYear",
} satisfies Record<InsightsPeriod, TranslationKey>;

interface InsightsQuietProps {
    alternative: InsightsMeasure | null;
    measure: InsightsMeasure;
    period: InsightsPeriod;
}

export function InsightsQuiet({ measure, alternative, period }: InsightsQuietProps) {
    const t = useTranslation();
    const phrase = t(PERIOD_PHRASE_KEY[period]);
    const sentence = alternative
        ? t("insights.quiet.alternative", {
              measure: t(MEASURE_KEY[alternative]),
              period: phrase,
          })
        : t("insights.quiet.empty", { period: phrase });

    return (
        <View>
            <View className="bg-border h-px w-full" />
            <View
                accessibilityLabel={t("insights.quiet.accessibility", {
                    measure: t(MEASURE_KEY[measure]),
                    period: phrase,
                    sentence,
                })}
                accessible
                className="items-center justify-center"
                style={{ height: PLOT_HEIGHT }}
            >
                <MonoLabel>{t("insights.quiet.title")}</MonoLabel>
                <View className="py-3">
                    <MarkInk tier="inFlow">
                        <ChartAtZero />
                    </MarkInk>
                </View>
                <Text className="text-footnote text-muted max-w-60 text-center">{sentence}</Text>
            </View>
            <View className="bg-border h-px w-full" />
        </View>
    );
}

const CHART_W = MARK_CEILING.inFlow;
const CHART_H = 44;
const COLUMNS = 6;

function ChartAtZero() {
    const ink = useMark();
    const colors = useColors();
    const floor = CHART_H - 8;
    const left = 5;
    const step = (CHART_W - left - 4) / COLUMNS;
    const stub = step * 0.62;

    return (
        <Svg height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} width={CHART_W}>
            <Path d={`M${left} 3 V${floor} H${CHART_W - 2}`} fill="none" stroke={ink.rule} strokeWidth={1} />
            <Path
                d={`M${left} 14 H${CHART_W - 2} M${left} 27 H${CHART_W - 2}`}
                stroke={ink.rule}
                strokeDasharray="2 5"
                strokeWidth={1}
            />
            {Array.from({ length: COLUMNS }, (_, index) => {
                const x = left + step * index + (step - stub) / 2;
                return <Rect fill={ink.fill} height={3} key={x} rx={1.5} width={stub} x={x} y={floor - 3} />;
            })}
            <Path
                d={`M${left} ${floor} H${CHART_W - 2}`}
                stroke={colors.foreground}
                strokeLinecap="round"
                strokeWidth={2}
            />
        </Svg>
    );
}
