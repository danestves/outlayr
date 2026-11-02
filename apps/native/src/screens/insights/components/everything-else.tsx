import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { WidgetCard } from "@/components/widget-card";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

export interface EverythingRow {
    id: string;
    label: string;
    onPress: () => void;
    value?: string;
}

function Row({ last, row }: { last: boolean; row: EverythingRow }) {
    const colors = useColors();
    const stacked = useAccessibilityTextSize();
    return (
        <Pressable
            accessibilityRole="button"
            className={cn("border-border flex-row items-center gap-3 py-3.5 active:opacity-60", !last && "border-b")}
            onPress={row.onPress}
        >
            <View className={cn("flex-1", stacked ? "gap-0.5" : "flex-row items-center justify-between gap-3")}>
                <Text className="font-sans-medium text-body text-foreground shrink" numberOfLines={stacked ? 2 : 1}>
                    {row.label}
                </Text>
                {row.value ? (
                    <Text className="text-caption text-muted tabular-nums" numberOfLines={1}>
                        {row.value}
                    </Text>
                ) : null}
            </View>
            <HugeiconsIcon color={colors.muted} icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
        </Pressable>
    );
}

export function EverythingElse({ rows }: { rows: readonly EverythingRow[] }) {
    const t = useTranslation();
    return (
        <View className="pt-7">
            <MonoLabel accessibilityRole="header">{t("insights.answers.everything")}</MonoLabel>
            <WidgetCard className="mt-2 px-4 py-0">
                {rows.map((row, index) => (
                    <Row key={row.id} last={index === rows.length - 1} row={row} />
                ))}
            </WidgetCard>
        </View>
    );
}
