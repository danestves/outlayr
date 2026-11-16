import { use } from "react";
import { View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { RowPressable } from "@/components/row-pressable";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import type { NarrowedMeasure } from "@/domain/log-measure";
import type { MeasureTrend } from "@/domain/log-trend";
import { formatTrend } from "@/domain/log-trend";
import { formatAmount } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";

import { SplitAmount } from "./split-amount";

const CELL_FONT_SIZE = 15;

export interface LogSplitCell {
    accessibilityHint: string;
    label: string;
    magnitude: number;
    measure: NarrowedMeasure;
    onPress: () => void;
    positive: boolean;
    selected: boolean;
    trend: MeasureTrend | null;
}

interface LogSplitProps {
    cells: readonly LogSplitCell[];
    code: string;
    showCents: boolean;
}

export function LogSplit({ cells, code, showCents }: LogSplitProps) {
    const stacked = useAccessibilityTextSize();
    const anySelected = cells.some((cell) => cell.selected);
    return (
        <View className={cn("border-border border-t py-2.5", !stacked && "flex-row")}>
            {cells.map((cell, index) => (
                <View
                    className={cn(
                        !stacked && "flex-1",
                        index > 0 && (stacked ? "border-border border-t" : "border-border border-l pl-4"),
                        anySelected && !cell.selected && "opacity-50"
                    )}
                    key={cell.measure}
                >
                    {cell.selected ? <View className="bg-foreground absolute inset-x-0 -top-2.5 h-0.5" /> : null}
                    <SplitCell cell={cell} code={code} showCents={showCents} />
                </View>
            ))}
        </View>
    );
}

function SplitCell({ cell, code, showCents }: { cell: LogSplitCell; code: string; showCents: boolean }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const amount = hidden
        ? t("log.amounts.hidden")
        : `${cell.positive ? "+" : "-"}${formatAmount(cell.magnitude, code, showCents, language)}`;
    const trend = cell.trend ? formatTrend(cell.trend.change, language) : null;
    return (
        <RowPressable
            accessibilityHint={cell.accessibilityHint}
            accessibilityLabel={[cell.label, amount, trend].filter(Boolean).join(", ")}
            accessibilityRole="button"
            accessibilityState={{ selected: cell.selected }}
            className="gap-0.5"
            onPress={cell.onPress}
        >
            <Text className={cn("font-sans-medium text-footnote", cell.selected ? "text-foreground" : "text-muted")}>
                {cell.label}
            </Text>
            <View className="flex-row flex-wrap items-baseline gap-x-2">
                <SplitAmount
                    code={code}
                    magnitude={cell.magnitude}
                    positive={cell.positive}
                    showCents={showCents}
                    size={CELL_FONT_SIZE}
                    toneClass="text-foreground"
                    typeClass="font-sans-bold"
                />
                {trend && cell.trend ? (
                    <Text
                        className={cn(
                            "font-sans-medium text-footnote tabular-nums",
                            cell.trend.good ? "text-income" : "text-expense"
                        )}
                    >
                        {trend}
                    </Text>
                ) : null}
            </View>
        </RowPressable>
    );
}
