import { useTheme } from "panelui-native/theme";
import { useState } from "react";
import { Pressable, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import type { CategoryBreakdownEntry, InsightsMeasure } from "@/data/insights";
import { formatAmount } from "@/domain/money";
import { LARGEST_STANDARD_FONT_SCALE } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import { glyphShade, TILE_WASH_OPACITY, withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { layoutBlocks } from "../blocks";
import { CategoryBreakdownRow } from "./category-breakdown-row";

const GAP = 3;
const DIMMED = 0.4;
const SMALL_ICON = 15;

type Tier = "big" | "wide" | "narrow" | "mid" | "small";

const PADDING: Record<Tier, number> = { big: 12, mid: 9, narrow: 9, small: 0, wide: 9 };

function tierOf(width: number, height: number): Tier {
    if (width >= 110 && height >= 110) {
        return "big";
    }
    if (width >= 150 && height >= 56) {
        return "wide";
    }
    if (width >= 110 && height >= 56) {
        return "narrow";
    }
    if (width >= 52 && height >= 44) {
        return "mid";
    }
    return "small";
}

function boxHeight(width: number, count: number): number {
    return Math.round(width * Math.min(0.85, 0.3 + 0.11 * count));
}

interface CategoryBlocksProps {
    code: string;
    entries: CategoryBreakdownEntry[];
    measure: InsightsMeasure;
    onSelect: (id: string | null) => void;
    selectedId: string | null;
    showCents: boolean;
}

export function CategoryBlocks({ code, entries, measure, onSelect, selectedId, showCents }: CategoryBlocksProps) {
    const colors = useColors();
    const t = useTranslation();
    const [width, setWidth] = useState(0);
    const [restOpen, setRestOpen] = useState(false);

    const height = boxHeight(width, entries.filter((entry) => entry.amount > 0).length);
    const { rects, rest, shown } = layoutBlocks(entries, width, height);
    const restSelected = rest.some((entry) => entry.id === selectedId);
    const showRest = restOpen || restSelected;

    const onLayout = (event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width);
    };

    const restRect = rest.length > 0 ? rects.at(-1) : undefined;

    return (
        <View>
            <View onLayout={onLayout} style={{ height }}>
                {width > 0
                    ? shown.map((entry, index) => (
                          <Block
                              code={code}
                              dimmed={selectedId != null && selectedId !== entry.id}
                              entry={entry}
                              key={entry.id}
                              measure={measure}
                              onPress={() => onSelect(selectedId === entry.id ? null : entry.id)}
                              rect={rects[index]}
                              selected={selectedId === entry.id}
                              showCents={showCents}
                          />
                      ))
                    : null}
                {width > 0 && restRect ? (
                    <Pressable
                        accessibilityLabel={t("insights.blocks.more", { count: rest.length })}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: showRest }}
                        className="active:opacity-70"
                        onPress={() => setRestOpen((open) => !open)}
                        style={{
                            alignItems: "center",
                            backgroundColor: colors.surfaceSecondary,
                            borderRadius: 10,
                            height: restRect.height - GAP,
                            justifyContent: "center",
                            left: restRect.x + GAP / 2,
                            opacity: selectedId != null && !restSelected ? DIMMED : 1,
                            position: "absolute",
                            top: restRect.y + GAP / 2,
                            width: restRect.width - GAP,
                        }}
                    >
                        <MonoLabel className="text-foreground" maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}>
                            {`+${rest.length}`}
                        </MonoLabel>
                    </Pressable>
                ) : null}
            </View>
            {showRest ? (
                <View className="pt-2">
                    {rest.map((entry) => (
                        <CategoryBreakdownRow
                            code={code}
                            dimmed={selectedId != null && selectedId !== entry.id}
                            entry={entry}
                            key={entry.id}
                            measure={measure}
                            onClear={() => onSelect(null)}
                            onPress={() => onSelect(selectedId === entry.id ? null : entry.id)}
                            selected={selectedId === entry.id}
                            showCents={showCents}
                        />
                    ))}
                </View>
            ) : null}
        </View>
    );
}

interface BlockProps {
    code: string;
    dimmed: boolean;
    entry: CategoryBreakdownEntry;
    measure: InsightsMeasure;
    onPress: () => void;
    rect: { height: number; width: number; x: number; y: number };
    selected: boolean;
    showCents: boolean;
}

function Block({ code, dimmed, entry, measure, onPress, rect, selected, showCents }: BlockProps) {
    const colors = useColors();
    const t = useTranslation();
    const { language } = useLanguage();
    const { theme } = useTheme();
    const width = rect.width - GAP;
    const height = rect.height - GAP;
    const tier = tierOf(width, height);
    const glyph = glyphShade(entry.color, theme === "dark");
    const income = measure === "income";
    const sign = income ? "+" : "-";
    const toneClass = income ? "text-income" : "text-foreground";
    const percent = Math.round(entry.fraction * 100);
    const amount = formatAmount(entry.amount, code, showCents, language);

    const icon = (size: number) =>
        !entry.icon && entry.emoji ? (
            <Text maxFontSizeMultiplier={1} style={{ fontSize: size, lineHeight: size * 1.2 }}>
                {entry.emoji}
            </Text>
        ) : (
            <CategoryIcon color={glyph} name={entry.icon} size={size} strokeWidth={1.9} type="stroke" />
        );

    const share =
        entry.delta == null
            ? `${percent}%`
            : `${percent}%  ${entry.delta > 0 ? "+" : ""}${Math.round(entry.delta * 100)}%`;

    return (
        <Pressable
            accessibilityLabel={t("insights.block.label", { amount: `${sign}${amount}`, name: entry.name, percent })}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="active:opacity-80"
            onPress={onPress}
            style={{
                backgroundColor: withAlpha(entry.color, TILE_WASH_OPACITY),
                borderColor: colors.foreground,
                borderRadius: 10,
                borderWidth: selected ? 2 : 0,
                height,
                left: rect.x + GAP / 2,
                opacity: dimmed ? DIMMED : 1,
                overflow: "hidden",
                padding: PADDING[tier],
                position: "absolute",
                top: rect.y + GAP / 2,
                width,
                ...(tier === "small"
                    ? { alignItems: "center", justifyContent: "center" }
                    : { justifyContent: "space-between" }),
            }}
        >
            {tier === "big" || tier === "wide" ? (
                <View className="flex-row items-center justify-between gap-2">
                    {icon(tier === "big" ? 20 : 17)}
                    <Text
                        className="text-label text-muted font-mono"
                        maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                        numberOfLines={1}
                    >
                        {share}
                    </Text>
                </View>
            ) : null}
            {tier === "big" ? (
                <View>
                    <Text
                        className="font-sans-semibold text-caption text-foreground"
                        maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                        numberOfLines={1}
                    >
                        {entry.name}
                    </Text>
                    <Text
                        className={cn(
                            "font-sans-medium tabular-nums",
                            entry.fraction >= 0.4 ? "text-title" : "text-callout",
                            toneClass
                        )}
                        maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                        numberOfLines={1}
                    >
                        {sign}
                        {amount}
                    </Text>
                </View>
            ) : null}
            {tier === "wide" ? (
                <View className="flex-row items-end justify-between gap-2">
                    <Text
                        className="font-sans-semibold text-caption text-foreground shrink"
                        maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                        numberOfLines={1}
                    >
                        {entry.name}
                    </Text>
                    <Text
                        className={cn("font-sans-medium text-subtitle tabular-nums", toneClass)}
                        maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                        numberOfLines={1}
                    >
                        {sign}
                        {amount}
                    </Text>
                </View>
            ) : null}
            {tier === "narrow" ? (
                <View className="flex-row items-center gap-2">
                    {icon(17)}
                    <Text
                        className="font-sans-semibold text-caption text-foreground shrink"
                        maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                        numberOfLines={1}
                    >
                        {entry.name}
                    </Text>
                </View>
            ) : null}
            {tier === "narrow" ? (
                <Text
                    className={cn("font-sans-medium text-subtitle tabular-nums", toneClass)}
                    maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                    numberOfLines={1}
                >
                    {sign}
                    {amount}
                </Text>
            ) : null}
            {tier === "mid" ? icon(16) : null}
            {tier === "mid" ? (
                <Text
                    className="font-sans-semibold text-label text-foreground tabular-nums"
                    maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                    numberOfLines={1}
                >
                    {formatAmount(entry.amount, code, false, language)}
                </Text>
            ) : null}
            {tier === "small" && Math.min(width, height) >= SMALL_ICON + 6 ? icon(SMALL_ICON) : null}
        </Pressable>
    );
}
