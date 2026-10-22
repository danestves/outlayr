import { GlassContainer, GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { useCallback, useLayoutEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { AccessibilityActionEvent } from "react-native";

import { useSettingNumber } from "@/contexts/display-settings-context";
import { currencySymbol, formatFixed, numberLocale } from "@/domain/money";
import { applyNumpadKey, numpadMode, numpadToNumber } from "@/domain/numpad";
import type { NumpadKey, NumpadMode, NumpadTileKey } from "@/domain/numpad";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { SANS_BY_WEIGHT } from "@/theme/body-fonts";
import { useColors } from "@/theme/use-colors";

import { Text } from "./text";

const GLASS = isLiquidGlassAvailable();

// `GlassContainer` is third-party, so it takes a style rather than a class (see `styled.ts`).
const GRID_GAP = { gap: 8 } as const;

const CLEAR_ACTION = "clear";

const ROWS: NumpadTileKey[][] = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "back"],
];

interface AmountNumpadProps {
    code: string;
    minorUnits: number;
    /** Overrides `numberEntryType` for a field that is not money, such as an exchange rate. */
    mode?: NumpadMode;
    onChange: (next: string, key: NumpadKey) => void;
    showDisplay?: boolean;
    toneClass?: string;
    value: string;
}

export function AmountNumpad({
    value,
    minorUnits,
    code,
    toneClass,
    mode: modeOverride,
    onChange,
    showDisplay = true,
}: AmountNumpadProps) {
    const colors = useColors();
    const haptics = useHaptics();
    const t = useTranslation();
    const { language } = useLanguage();
    const preference = useSettingNumber("numberEntryType");
    const mode = modeOverride ?? numpadMode(preference);
    const locale = numberLocale(language);
    const symbol = currencySymbol(code);
    const amountColor = toneClass?.includes("income") ? colors.income : colors.foreground;

    // `value` is a render-time prop, so two presses inside one commit would build on the same string and drop a digit
    // (a tenfold error under `preDotted`). Keyed on the base, so it stops applying once a render catches up. Callers
    // store what they are handed verbatim; one that declined a keystroke would need to say so.
    const chained = useRef<{ base: string; next: string } | null>(null);

    const latest = useRef({ value, minorUnits, mode, onChange });
    useLayoutEffect(() => {
        latest.current = { value, minorUnits, mode, onChange };
    });

    const press = useCallback(
        (key: NumpadKey) => {
            const { value: base, minorUnits: units, mode: entryMode, onChange: emit } = latest.current;
            // `keyTap` is silent below the excessive haptics level, and a long press has no other tell.
            haptics(key === "clear" ? "medium" : "keyTap");
            const current = chained.current?.base === base ? chained.current.next : base;
            const next = applyNumpadKey(current, key, units, entryMode);
            chained.current = { base, next };
            emit(next, key);
        },
        [haptics]
    );

    return (
        // No horizontal inset: the caller owns it, so the keys line up with whatever sits under them.
        <View>
            {showDisplay ? (
                <>
                    <View className="items-center pt-2">
                        <Text className="text-body text-muted font-sans">{t("transaction.field.amount")}</Text>
                    </View>
                    <View className="min-h-14 items-center justify-center px-4 pt-2 pb-7">
                        <Text
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            style={{
                                color: amountColor,
                                fontFamily: SANS_BY_WEIGHT[500],
                                fontSize: 40,
                                fontWeight: "500",
                            }}
                        >
                            {`${symbol} ${formatFixed(numpadToNumber(value), minorUnits, language)}`}
                        </Text>
                    </View>
                </>
            ) : null}
            {/* Grouped: twelve loose `GlassView`s remounted by the stage mostly lose their effect, while a container
                attaches them as one set. Default `spacing` keeps them from merging. */}
            <GlassContainer style={GRID_GAP}>
                {ROWS.map((row) => (
                    <View className="flex-row gap-2" key={row.join(",")}>
                        {row.map((key) => (
                            <NumpadKeyTile
                                fg={colors.foreground}
                                glyph={key === "." ? locale.decimal : key}
                                hidden={key === "." && (minorUnits === 0 || mode === "preDotted")}
                                key={key}
                                label={key}
                                onLongPress={key === "back" ? () => press("clear") : undefined}
                                onPress={() => press(key)}
                            />
                        ))}
                    </View>
                ))}
            </GlassContainer>
        </View>
    );
}

function NumpadKeyTile({
    label,
    glyph,
    hidden,
    fg,
    onPress,
    onLongPress,
}: {
    label: NumpadTileKey;
    glyph: string;
    hidden: boolean;
    fg: string;
    onPress: () => void;
    onLongPress?: () => void;
}) {
    const t = useTranslation();
    // Holds the separator's cell open so "0" stays centred under "8".
    if (hidden) {
        return <View className="min-h-12 w-0 flex-1" />;
    }
    return (
        <Pressable
            accessibilityActions={
                onLongPress ? [{ label: t("transaction.numpad.clear"), name: CLEAR_ACTION }] : undefined
            }
            accessibilityLabel={label === "back" ? t("transaction.numpad.delete") : glyph}
            accessibilityRole="button"
            className="min-h-12 w-0 flex-1 items-center justify-center overflow-hidden rounded-xl active:scale-[0.96] active:opacity-65"
            onAccessibilityAction={
                onLongPress
                    ? (event: AccessibilityActionEvent) => {
                          if (event.nativeEvent.actionName === CLEAR_ACTION) {
                              onLongPress();
                          }
                      }
                    : undefined
            }
            onLongPress={onLongPress}
            onPress={onPress}
        >
            {GLASS ? (
                <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
            ) : (
                <View className="bg-surface absolute inset-0" />
            )}
            {label === "back" ? (
                <SymbolView name="delete.left" size={20} tintColor={fg} type="monochrome" weight="medium" />
            ) : (
                <Text className="font-sans-medium text-foreground text-[23px]">{glyph}</Text>
            )}
        </Pressable>
    );
}
