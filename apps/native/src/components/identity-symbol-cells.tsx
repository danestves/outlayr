import { useTheme } from "panelui-native/theme";
import { Pressable, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { glyphShade, withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

export const SYMBOL_COLUMNS = 6;
export const SYMBOL_GAP = 10;
export const SYMBOL_MARGIN = 20;
const SYMBOL_CELL_RADIUS = 10;
const SYMBOL_SELECTED_WASH = 0.18;
const EMOJI_SIZE = 26;
const GLYPH_SIZE = 20;
const TRAILING_DIGITS = /\d+$/;
const INNER_CAPITAL = /\B(?=[A-Z])/g;

export function symbolCellSize(width: number): number {
    return Math.floor((width - SYMBOL_MARGIN * 2 - SYMBOL_GAP * (SYMBOL_COLUMNS - 1)) / SYMBOL_COLUMNS);
}

interface SymbolCellProps {
    hitSlop?: number;
    onPress: () => void;
    selected: boolean;
    size: number;
    tint: string;
}

function useCellStyle(tint: string, selected: boolean, size: number) {
    const colors = useColors();
    return {
        alignItems: "center" as const,
        // `colors.surface`, not the grouped-cell colour, which is lighter than the sheet these sit on.
        backgroundColor: selected ? withAlpha(tint, SYMBOL_SELECTED_WASH) : colors.surface,
        borderColor: tint,
        borderRadius: SYMBOL_CELL_RADIUS,
        borderWidth: selected ? 2 : 0,
        height: size,
        justifyContent: "center" as const,
        width: size,
    };
}

export function SymbolIconCell({
    iconKey,
    tint,
    selected,
    size,
    hitSlop,
    onPress,
}: SymbolCellProps & { iconKey: string }) {
    const colors = useColors();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    return (
        <Pressable
            accessibilityLabel={iconKey.replace(TRAILING_DIGITS, "").replaceAll(INNER_CAPITAL, " ")}
            accessibilityLanguage="en"
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={hitSlop}
            onPress={onPress}
            style={useCellStyle(tint, selected, size)}
        >
            <CategoryIcon
                color={selected ? glyphShade(tint, isDark) : colors.muted}
                name={iconKey}
                size={GLYPH_SIZE}
                type="solid"
            />
        </Pressable>
    );
}

export function SymbolEmojiCell({
    emoji,
    tint,
    selected,
    size,
    hitSlop,
    onPress,
}: SymbolCellProps & { emoji: string }) {
    return (
        <Pressable
            accessibilityLabel={emoji}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={hitSlop}
            onPress={onPress}
            style={useCellStyle(tint, selected, size)}
        >
            <Text style={{ fontSize: EMOJI_SIZE }}>{emoji}</Text>
        </Pressable>
    );
}

const SWATCH = 34;
const RING_INSET = 3;
const SWATCH_BOX = SWATCH + RING_INSET * 2;

export function ColorSwatch({
    hex,
    label,
    selected,
    used = false,
    hitSlop,
    onPress,
}: {
    hex: string;
    hitSlop?: number;
    label: string;
    selected: boolean;
    used?: boolean;
    onPress: () => void;
}) {
    const colors = useColors();
    const t = useTranslation();
    const dimmed = used && !selected;
    return (
        <Pressable
            accessibilityHint={dimmed ? t("transaction.identity.colorUsed") : undefined}
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            disabled={dimmed}
            hitSlop={hitSlop}
            onPress={onPress}
            style={({ pressed }) => ({
                alignItems: "center",
                height: SWATCH_BOX,
                justifyContent: "center",
                transform: [{ scale: pressed ? 0.92 : 1 }],
                width: SWATCH_BOX,
            })}
        >
            <View
                style={{
                    backgroundColor: hex,
                    borderColor: withAlpha(colors.foreground, 0.12),
                    borderRadius: SWATCH / 2,
                    borderWidth: dimmed ? 1 : 0,
                    height: SWATCH,
                    opacity: dimmed ? 0.3 : 1,
                    width: SWATCH,
                }}
            />
            {selected ? (
                <View
                    pointerEvents="none"
                    style={{
                        borderColor: colors.foreground,
                        borderRadius: SWATCH_BOX / 2,
                        borderWidth: 2,
                        height: SWATCH_BOX,
                        position: "absolute",
                        width: SWATCH_BOX,
                    }}
                />
            ) : null}
        </Pressable>
    );
}
