import { Pressable, View } from "react-native";

import { ActionMenu } from "@/components/action-menu";
import type { ActionMenuItem } from "@/components/action-menu";
import { HeroNumber } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { formatAmount } from "@/domain/money";
import { useLanguage } from "@/i18n/context";

const FIGURE_SIZE = 26;
const CELL_INSET = 14;
const SUFFIX_ALLOWANCE = 56;

export type PlanCellTone = "plain" | "short" | "income";

export interface PlanCellProps {
    amount: number;
    /** A category's own colour; falls back to the tone's. */
    barColor?: string | null;
    caption: string;
    currency: string;
    /** 0 to 1. */
    fill: number;
    label: string;
    menuItems?: readonly ActionMenuItem[];
    onPress?: () => void;
    right: boolean;
    suffix: string;
    tone?: PlanCellTone;
    /** Null on the first frame: a context menu's host has no flex until the grid is measured. */
    width: number | null;
}

const cellClass = (right: boolean) =>
    cn("gap-1.5 pt-3 pb-4 active:opacity-70", right ? "border-border border-l pl-3.5" : "pr-3.5");

export function PlanCell({
    amount,
    barColor,
    caption,
    currency,
    fill,
    label,
    menuItems,
    onPress,
    right,
    suffix,
    tone = "plain",
    width,
}: PlanCellProps) {
    const { showCents } = useDisplaySettings().state;
    const { language } = useLanguage();
    const short = tone === "short";
    const clamped = Math.min(1, Math.max(0, fill));
    let barClass = "bg-foreground";
    if (short) {
        barClass = "bg-over-budget";
    } else if (tone === "income") {
        barClass = "bg-income";
    }

    const cell = (
        <Pressable
            accessibilityLabel={[label, `${formatAmount(amount, currency, showCents, language)} ${suffix}`, caption]
                .filter(Boolean)
                .join(", ")}
            accessibilityRole={onPress ? "button" : undefined}
            className={cellClass(right)}
            disabled={!onPress}
            onPress={onPress}
            style={width === null ? { flex: 1 } : { width }}
        >
            <MonoLabel numberOfLines={1}>{label}</MonoLabel>
            <View className="flex-row items-baseline">
                <HeroNumber
                    amount={amount}
                    code={currency}
                    fitWidth={width === null ? undefined : width - CELL_INSET - SUFFIX_ALLOWANCE}
                    showCents={showCents}
                    sign=""
                    size={FIGURE_SIZE}
                    still
                    toneClass={short ? "text-over-budget" : "text-foreground"}
                />
                <Text className="text-label text-muted shrink" numberOfLines={1}>
                    {` ${suffix}`}
                </Text>
            </View>
            <View className={cn("h-1 overflow-hidden rounded-full", short ? "bg-rail-over" : "bg-rail-track")}>
                <View
                    className={cn("h-full rounded-full", (short || !barColor) && barClass)}
                    style={[{ width: `${clamped * 100}%` }, !short && barColor ? { backgroundColor: barColor } : null]}
                />
            </View>
            <MonoLabel numberOfLines={1}>{caption || " "}</MonoLabel>
        </Pressable>
    );

    if (!menuItems?.length || width === null) {
        return cell;
    }
    return (
        <ActionMenu items={menuItems} style={{ width }}>
            {cell}
        </ActionMenu>
    );
}

export function PlanAddCell({
    label,
    onPress,
    right,
    width,
}: {
    label: string;
    onPress: () => void;
    right: boolean;
    width: number | null;
}) {
    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            className={cn(cellClass(right), "justify-center")}
            onPress={onPress}
            style={width === null ? { flex: 1 } : { width }}
        >
            <Text className="text-title text-muted">+</Text>
            <MonoLabel>{label}</MonoLabel>
        </Pressable>
    );
}
