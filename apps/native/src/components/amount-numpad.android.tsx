import { SymbolView } from "expo-symbols";
import { useCallback, useLayoutEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import type { AccessibilityActionEvent } from "react-native";

import { useSettingNumber } from "@/contexts/display-settings-context";
import { currencySymbol, formatFixed, numberLocale } from "@/domain/money";
import { applyNumpadKey, numpadMode, numpadToNumber } from "@/domain/numpad";
import type { NumpadKey, NumpadTileKey } from "@/domain/numpad";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { AmountNumpad as AmountNumpadBase } from "./amount-numpad";
import { Text } from "./text";

const CLEAR_ACTION = "clear";

const PRESSED_ALPHA = 0.1;

const BACKSPACE_GLYPH = 24;

const ROWS: NumpadTileKey[][] = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "back"],
];

export const AmountNumpad: typeof AmountNumpadBase = ({
    value,
    minorUnits,
    code,
    toneClass,
    mode: modeOverride,
    onChange,
    showDisplay = true,
}) => {
    const colors = useColors();
    const haptics = useHaptics();
    const t = useTranslation();
    const { language } = useLanguage();
    const preference = useSettingNumber("numberEntryType");
    const mode = modeOverride ?? numpadMode(preference);
    const locale = numberLocale(language);
    const symbol = currencySymbol(code);
    const amountColor = toneClass?.includes("income") ? colors.income : colors.foreground;

    // See `amount-numpad.tsx`: two presses inside one commit must not drop a digit.
    const chained = useRef<{ base: string; next: string } | null>(null);

    const latest = useRef({ value, minorUnits, mode, onChange });
    useLayoutEffect(() => {
        latest.current = { value, minorUnits, mode, onChange };
    });

    const press = useCallback(
        (key: NumpadKey) => {
            const { value: base, minorUnits: units, mode: entryMode, onChange: emit } = latest.current;
            haptics(key === "clear" ? "medium" : "keyTap");
            const current = chained.current?.base === base ? chained.current.next : base;
            const next = applyNumpadKey(current, key, units, entryMode);
            chained.current = { base, next };
            emit(next, key);
        },
        [haptics]
    );

    return (
        <View>
            {showDisplay ? (
                <>
                    <View className="items-center pt-2">
                        <Text className="text-body text-m3-on-surface-variant">{t("transaction.field.amount")}</Text>
                    </View>
                    <View className="min-h-14 items-center justify-center px-4 pt-2 pb-7">
                        <Text
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            style={{ color: amountColor, fontFamily: "InstrumentSerif_400Regular", fontSize: 44 }}
                        >
                            {`${symbol} ${formatFixed(numpadToNumber(value), minorUnits, language)}`}
                        </Text>
                    </View>
                </>
            ) : null}
            <View className="gap-2">
                {ROWS.map((row) => (
                    <View className="flex-row gap-2" key={row.join(",")}>
                        {row.map((key) => (
                            <NumpadKeyTile
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
            </View>
        </View>
    );
};

function NumpadKeyTile({
    label,
    glyph,
    hidden,
    onPress,
    onLongPress,
}: {
    label: NumpadTileKey;
    glyph: string;
    hidden: boolean;
    onPress: () => void;
    onLongPress?: () => void;
}) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    // Holds the separator's cell open so "0" stays centred under "8".
    if (hidden) {
        return <View className="h-14 flex-1" />;
    }
    const back = label === "back";
    const ink = back ? m3.onPrimaryContainer : m3.onSecondaryContainer;
    return (
        <Pressable
            accessibilityActions={
                onLongPress ? [{ label: t("transaction.numpad.clear"), name: CLEAR_ACTION }] : undefined
            }
            accessibilityLabel={back ? t("transaction.numpad.delete") : glyph}
            accessibilityRole="button"
            android_ripple={{ color: withAlpha(ink, PRESSED_ALPHA) }}
            className={`h-14 flex-1 items-center justify-center overflow-hidden rounded-full ${
                back ? "bg-m3-primary-container" : "bg-m3-secondary-container"
            }`}
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
            {back ? (
                // Material's own glyph: Hugeicons has no backspace key. The font it
                // draws from loads on mount, behind the stage body's fade-in.
                <SymbolView
                    name={{ android: "backspace", ios: "delete.left" }}
                    size={BACKSPACE_GLYPH}
                    tintColor={ink}
                />
            ) : (
                <Text className="text-m3-on-secondary-container text-[26px] leading-8">{glyph}</Text>
            )}
        </Pressable>
    );
}
