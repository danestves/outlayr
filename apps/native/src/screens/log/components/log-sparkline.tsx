import { LineChart } from "panelui-native/components/line-chart";
import { View } from "react-native";

import type { LogMeasure } from "@/domain/log-measure";
import type { SparklinePoint } from "@/domain/log-sparkline";
import { sparklineLabelKey } from "@/domain/sparkline-trend";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

const WIDTH = 96;
const HEIGHT = 42;

interface LogSparklineProps {
    byMonth: boolean;
    measure: LogMeasure;
    points: readonly SparklinePoint[];
}

export function LogSparkline({ byMonth, measure, points }: LogSparklineProps) {
    const t = useTranslation();
    const colors = useColors();
    return (
        <View
            accessibilityLabel={t(
                sparklineLabelKey(
                    measure,
                    points.map((point) => point.amount),
                    byMonth
                )
            )}
            accessibilityRole="image"
            accessible
            style={{ height: HEIGHT, width: WIDTH }}
        >
            <LineChart
                accessible={false}
                aspectRatio={WIDTH / HEIGHT}
                compact
                data={points.map((point) => ({ date: point.date.getTime(), value: point.amount }))}
                xDataKey="date"
            >
                <LineChart.Line color={colors.foreground} dataKey="value" strokeWidth={2} />
            </LineChart>
        </View>
    );
}
