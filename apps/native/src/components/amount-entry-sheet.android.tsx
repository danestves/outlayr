import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { currencySymbol } from "@/domain/money";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { AmountEntrySheet as AmountEntrySheetBase } from "./amount-entry-sheet";
import { AmountNumpad } from "./amount-numpad";
import { SheetGestureRoot } from "./sheet-gesture-root";
import { Text } from "./text";

/** Sized by its content: the sheet fits to it, so the root must not take `flex: 1`. */
const FIT_CONTENT = { alignSelf: "stretch" } as const;

const PRESSED_ALPHA = 0.1;

export const AmountEntrySheet: typeof AmountEntrySheetBase = ({
    value,
    minorUnits,
    code,
    toneClass,
    onChange,
    onDone,
    ref,
}) => {
    const m3 = useMaterialColors();
    const t = useTranslation();
    const insets = useSafeAreaInsets();
    const sheetBackground = { backgroundColor: useSheetSurface() };
    const symbol = currencySymbol(code);

    return (
        <BottomSheetModal backgroundStyle={sheetBackground} enableDynamicSizing enablePanDownToClose ref={ref}>
            <BottomSheetView style={{ paddingBottom: insets.bottom + 16 }}>
                <SheetGestureRoot style={FIT_CONTENT}>
                    <View className="h-14 flex-row items-center pr-1 pl-6">
                        <Text className="text-m3-on-surface flex-1 text-[22px] leading-7">{`${code} (${symbol})`}</Text>
                        <Pressable
                            accessibilityLabel={t("common.close")}
                            accessibilityRole="button"
                            android_ripple={{
                                borderless: true,
                                color: withAlpha(m3.onSurface, PRESSED_ALPHA),
                                radius: 20,
                            }}
                            className="size-12 items-center justify-center"
                            onPress={onDone}
                        >
                            <HugeiconsIcon color={m3.onSurfaceVariant} icon={Cancel01Icon} size={24} />
                        </Pressable>
                    </View>

                    <View className="px-4">
                        <AmountNumpad
                            code={code}
                            minorUnits={minorUnits}
                            onChange={onChange}
                            toneClass={toneClass}
                            value={value}
                        />
                    </View>

                    <View className="px-4 pt-6">
                        <Pressable
                            accessibilityRole="button"
                            android_ripple={{ color: withAlpha(m3.onPrimary, PRESSED_ALPHA) }}
                            className="bg-m3-primary h-14 items-center justify-center overflow-hidden rounded-full"
                            onPress={onDone}
                        >
                            <Text className="font-sans-medium text-body text-m3-on-primary">{t("common.done")}</Text>
                        </Pressable>
                    </View>
                </SheetGestureRoot>
            </BottomSheetView>
        </BottomSheetModal>
    );
};
