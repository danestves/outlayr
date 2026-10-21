import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";
import type { AccessibilityActionEvent } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { ROW_TYPE } from "@/components/row-type";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import type { CategoryBreakdownEntry, InsightsMeasure } from "@/data/insights";
import { breakdownRiseIsFavourable } from "@/domain/insights-measure";
import { formatAmount } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

const CLEAR_ACTION = "clear";

interface CategoryBreakdownRowProps {
    code: string;
    dimmed?: boolean;
    entry: CategoryBreakdownEntry;
    measure: InsightsMeasure;
    onClear?: () => void;
    onPress?: () => void;
    selected?: boolean;
    showCents?: boolean;
}

export function CategoryBreakdownRow({
    entry,
    measure,
    code,
    showCents = true,
    onPress,
    selected = false,
    dimmed = false,
    onClear,
}: CategoryBreakdownRowProps) {
    const colors = useColors();
    const t = useTranslation();
    const { language } = useLanguage();
    const stacked = useAccessibilityTextSize();
    const income = measure === "income";
    const toneClass = income ? "text-income" : "text-foreground";
    const sign = income ? "+" : "-";
    const fill = income ? colors.income : entry.color;
    const pct = Math.round(entry.fraction * 100);

    const name = (
        <Text
            className={cn(ROW_TYPE.name, "text-foreground", !stacked && "flex-1")}
            numberOfLines={stacked ? undefined : 1}
        >
            {entry.name}
        </Text>
    );
    const figures = (
        <>
            <Text className={cn("tabular-nums", ROW_TYPE.cell, toneClass)} numberOfLines={1}>
                {sign}
                {formatAmount(entry.amount, code, showCents, language)}
            </Text>
            <Text className="text-label text-muted min-w-[34px] text-right font-mono">{pct}%</Text>
            {selected && onClear ? (
                <Pressable
                    accessibilityElementsHidden
                    accessibilityLabel={t("insights.category.clearFilter")}
                    accessibilityRole="button"
                    className="bg-surface size-[26px] items-center justify-center rounded-full active:opacity-70"
                    hitSlop={9}
                    importantForAccessibility="no-hide-descendants"
                    onPress={onClear}
                >
                    <HugeiconsIcon color={colors.muted} icon={Cancel01Icon} size={13} strokeWidth={2.5} />
                </Pressable>
            ) : (
                <DeltaCell delta={entry.delta} measure={measure} />
            )}
        </>
    );

    const body = (
        <View
            className={cn(
                "gap-2.5",
                dimmed && "opacity-40",
                selected ? "bg-surface-secondary rounded-xl p-2.5" : "py-3"
            )}
            style={selected ? { borderColor: colors.border, borderWidth: 1.3 } : undefined}
        >
            <View className="flex-row items-center gap-3">
                <CategoryIconTile color={entry.color} emoji={entry.emoji} icon={entry.icon} size={34} />
                {stacked ? (
                    <View className="flex-1 gap-1">
                        {name}
                        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">{figures}</View>
                    </View>
                ) : (
                    <>
                        {name}
                        {figures}
                    </>
                )}
            </View>
            <View className="bg-rail-track h-1 w-full overflow-hidden rounded-full">
                <View
                    className="h-full rounded-full"
                    style={{
                        backgroundColor: fill,
                        width: `${Math.max(0, Math.min(1, entry.fraction)) * 100}%`,
                    }}
                />
            </View>
        </View>
    );

    if (!onPress) {
        return body;
    }

    const clearable = selected && onClear !== undefined;
    return (
        <Pressable
            accessibilityActions={
                clearable ? [{ label: t("insights.category.clearFilter"), name: CLEAR_ACTION }] : undefined
            }
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onAccessibilityAction={
                clearable
                    ? (event: AccessibilityActionEvent) => {
                          if (event.nativeEvent.actionName === CLEAR_ACTION) {
                              onClear();
                          }
                      }
                    : undefined
            }
            onPress={onPress}
        >
            {body}
        </Pressable>
    );
}

function DeltaCell({ delta, measure }: { delta: number | null; measure: InsightsMeasure }) {
    if (delta == null) {
        return <View className="min-w-[46px]" />;
    }
    const rose = delta > 0;
    const favourable = breakdownRiseIsFavourable(measure) === rose;
    return (
        <Text
            className={cn("text-label min-w-[46px] text-right font-mono", favourable ? "text-income" : "text-danger")}
        >
            {rose ? "+" : ""}
            {Math.round(delta * 100)}%
        </Text>
    );
}
