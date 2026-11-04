import Alert02Icon from "@hugeicons-pro/core-solid-rounded/Alert02Icon";
import Delete02Icon from "@hugeicons-pro/core-solid-rounded/Delete02Icon";
import GiftIcon from "@hugeicons-pro/core-solid-rounded/GiftIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import { GlassContainer, GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable, StyleSheet, View } from "react-native";

import type { TransactionIdentity } from "@/domain/transaction-identity";
import type { TransferEnd } from "@/domain/transfer-log-rows";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";
import { useIsDark } from "@/theme/use-is-dark";

import { CategoryIconTile } from "./category-icon-tile";
import { MonoLabel } from "./mono-label";
import { Text } from "./text";
import { TILE_RADIUS, TILE_SIZE, TransferTile } from "./transfer-tile";
import { cn } from "./tw";

const GLASS = isLiquidGlassAvailable();
const RADIUS = 26;
const TINT_ALPHA = 0.1;
const WASH_ALPHA = 0.14;

const SIGNALS = {
    failure: { color: "danger", glyph: Alert02Icon },
    gift: { color: "income", glyph: GiftIcon },
    removed: { color: null, glyph: Delete02Icon },
    warning: { color: "warning", glyph: Alert02Icon },
} as const;

export type NoticeTone =
    | { identity: TransactionIdentity; imageUri: string | null; income: boolean; kind: "entry" }
    | { ends: { from: TransferEnd; to: TransferEnd }; kind: "transfer" }
    | { kind: keyof typeof SIGNALS };

export interface NoticeSlipProps {
    actionLabel?: string;
    amount?: { label: string; text: string };
    body?: string;
    onAction?: () => void;
    onDismiss?: () => void;
    stamp?: string;
    title: string;
    tone: NoticeTone;
}

function Ground({ hue }: { hue: string | null }) {
    const isDark = useIsDark();
    if (GLASS) {
        return (
            <GlassContainer style={StyleSheet.absoluteFill}>
                <GlassView
                    colorScheme={isDark ? "dark" : "light"}
                    glassEffectStyle="regular"
                    style={[StyleSheet.absoluteFill, { borderRadius: RADIUS }]}
                    tintColor={hue === null ? undefined : withAlpha(hue, TINT_ALPHA)}
                />
            </GlassContainer>
        );
    }
    return (
        <View className="bg-surface border-border absolute inset-0 border" style={{ borderRadius: RADIUS }}>
            {hue === null ? null : (
                <View className="absolute inset-0" style={{ backgroundColor: withAlpha(hue, WASH_ALPHA) }} />
            )}
        </View>
    );
}

function glyphOf(icon: IconSvgElement) {
    return ({ color, size }: { color: string; size: number }) => (
        <HugeiconsIcon color={color} icon={icon} size={size} />
    );
}

function hueOf(tone: NoticeTone, colors: ReturnType<typeof useColors>): string | null {
    switch (tone.kind) {
        case "entry": {
            return tone.identity.color;
        }
        case "transfer": {
            return colors.transfer;
        }
        default: {
            const { color } = SIGNALS[tone.kind];
            return color === null ? null : colors[color];
        }
    }
}

function Mark({ hue, tone }: { hue: string | null; tone: NoticeTone }) {
    const colors = useColors();
    switch (tone.kind) {
        case "entry": {
            return (
                <CategoryIconTile
                    color={tone.identity.color}
                    emoji={tone.identity.emoji}
                    icon={tone.identity.icon}
                    imageUri={tone.imageUri}
                    radius={TILE_RADIUS}
                    size={TILE_SIZE}
                    type="solid"
                />
            );
        }
        case "transfer": {
            return <TransferTile ends={tone.ends} future={false} />;
        }
        default: {
            return (
                <CategoryIconTile
                    color={hue ?? colors.foreground}
                    glyph={glyphOf(SIGNALS[tone.kind].glyph)}
                    icon={null}
                    radius={TILE_RADIUS}
                    size={TILE_SIZE}
                />
            );
        }
    }
}

export function NoticeSlip({ actionLabel, amount, body, onAction, onDismiss, stamp, title, tone }: NoticeSlipProps) {
    const hue = hueOf(tone, useColors());
    const action = actionLabel ? (
        <Pressable accessibilityRole="button" className="active:opacity-70" hitSlop={12} onPress={onAction}>
            <Text className="font-sans-semibold text-subtitle text-tint">{actionLabel}</Text>
        </Pressable>
    ) : null;

    return (
        <View
            accessibilityRole="alert"
            className="overflow-hidden"
            onAccessibilityEscape={onDismiss}
            style={{ borderRadius: RADIUS }}
        >
            <Ground hue={hue} />
            <View className="flex-row items-center gap-3 px-4 pt-3.5 pb-3">
                <Mark hue={hue} tone={tone} />
                <View className="flex-1 gap-0.5">
                    <Text className="font-sans-medium text-callout text-foreground" numberOfLines={amount ? 1 : 2}>
                        {title}
                    </Text>
                    {body ? (
                        <Text className="font-sans-medium text-subtitle text-muted" numberOfLines={3}>
                            {body}
                        </Text>
                    ) : null}
                </View>
                {amount ? (
                    <Text
                        accessibilityLabel={amount.label}
                        className={cn(
                            "font-sans-medium text-title tabular-nums",
                            tone.kind === "entry" && tone.income ? "text-income" : "text-foreground"
                        )}
                        numberOfLines={1}
                    >
                        {amount.text}
                    </Text>
                ) : null}
                {stamp ? null : action}
            </View>
            {stamp ? (
                <View className="border-foreground/10 flex-row items-center gap-3 border-t px-4 py-2.5">
                    <MonoLabel className="flex-1" numberOfLines={1}>
                        {stamp}
                    </MonoLabel>
                    {action}
                </View>
            ) : null}
        </View>
    );
}
