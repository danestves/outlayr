import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { OutlinedDateField } from "@/components/material/outlined-date-field";
import { OutlinedSelectField } from "@/components/material/outlined-field";
import { revealEntering } from "@/components/sentence/sentence-motion";
import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { InstallmentRow } from "@/data/installments-core";
import { formatAmount } from "@/domain/money";
import { useMergedRef } from "@/hooks/use-merged-ref";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useLanguage, useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { CuotaSheetProps } from "./cuota-sheet";
import { installmentTitle } from "./labels";
import { useCuotaEditor } from "./use-cuota-editor";
import { useFeeEditor } from "./use-fee-editor";

const PRESSED_ALPHA = 0.1;

function fieldValue(value: string) {
    return (
        <Text className="text-body text-m3-on-surface tabular-nums" numberOfLines={1}>
            {value}
        </Text>
    );
}

export function CuotaSheet({ accountId, count, currency, earliest, onDismiss, ref, row }: CuotaSheetProps) {
    const insets = useSafeAreaInsets();
    const sheetSurface = useSheetSurface();
    const sheetRef = useRef<BottomSheetModal>(null);
    const setRefs = useMergedRef(sheetRef, ref);
    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            enablePanDownToClose
            onDismiss={onDismiss}
            ref={setRefs}
        >
            <SheetGestureRoot style={{}}>
                <BottomSheetView style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}>
                    {row ? (
                        <CuotaBody
                            accountId={accountId}
                            count={count}
                            currency={currency}
                            earliest={earliest}
                            key={row.id}
                            onClose={() => sheetRef.current?.dismiss()}
                            row={row}
                            sheetSurface={sheetSurface}
                        />
                    ) : null}
                </BottomSheetView>
            </SheetGestureRoot>
        </BottomSheetModal>
    );
}

interface CuotaBodyProps {
    accountId: string;
    count: number;
    currency: string;
    earliest?: Date;
    onClose: () => void;
    row: InstallmentRow;
    sheetSurface: string;
}

function CuotaBody({ accountId, count, currency, earliest, onClose, row, sheetSurface }: CuotaBodyProps) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const { amount, commitAmount, dueDate, minorUnits, moveTo, padRef, padText, remove, setPadText } = useCuotaEditor({
        currency,
        onClose,
        row,
    });
    const [hadFee] = useState(row.fee > 0);
    const {
        commit: commitFee,
        open: openFee,
        padRef: feePadRef,
        padText: feePadText,
        remove: removeFee,
        setPadText: setFeePadText,
    } = useFeeEditor({ accountId, currency, row });
    const shownAmount = formatAmount(amount, currency, showCents, language);
    const shownFee = formatAmount(row.fee, currency, showCents, language);

    return (
        <View>
            <Text accessibilityRole="header" className="text-m3-on-surface px-2 pb-4 text-[22px] leading-7">
                {installmentTitle(t, row, count)}
            </Text>
            <View className="gap-4">
                <OutlinedDateField
                    ground={sheetSurface}
                    label={t("installments.cuota.due")}
                    onChange={moveTo}
                    range={{ start: earliest }}
                    value={dueDate}
                />
                <OutlinedSelectField
                    accessibilityValue={shownAmount}
                    dropdown={false}
                    ground={sheetSurface}
                    label={t("installments.cuota.amount")}
                    onPress={() => padRef.current?.present()}
                    value={fieldValue(shownAmount)}
                />
                {row.fee > 0 ? (
                    <Animated.View entering={hadFee ? undefined : revealEntering()}>
                        <OutlinedSelectField
                            accessibilityValue={shownFee}
                            dropdown={false}
                            ground={sheetSurface}
                            label={t("installments.fee.label")}
                            onPress={openFee}
                            value={fieldValue(shownFee)}
                        />
                    </Animated.View>
                ) : null}
            </View>
            <View className="mt-2 flex-row flex-wrap">
                {row.fee > 0 ? (
                    <Pressable
                        accessibilityRole="button"
                        android_ripple={{ color: withAlpha(m3.error, PRESSED_ALPHA) }}
                        className="h-12 justify-center overflow-hidden rounded-full px-3"
                        onPress={removeFee}
                    >
                        <Text className="font-sans-medium text-body text-m3-error">{t("installments.fee.remove")}</Text>
                    </Pressable>
                ) : (
                    <Pressable
                        accessibilityRole="button"
                        android_ripple={{ color: withAlpha(m3.primary, PRESSED_ALPHA) }}
                        className="h-12 justify-center overflow-hidden rounded-full px-3"
                        onPress={openFee}
                    >
                        <Text className="font-sans-medium text-body text-m3-primary">{t("installments.fee.add")}</Text>
                    </Pressable>
                )}
                <Pressable
                    accessibilityRole="button"
                    android_ripple={{ color: withAlpha(m3.error, PRESSED_ALPHA) }}
                    className="h-12 justify-center overflow-hidden rounded-full px-3"
                    onPress={remove}
                >
                    <Text className="font-sans-medium text-body text-m3-error">{t("installments.cuota.delete")}</Text>
                </Pressable>
            </View>
            <AmountEntrySheet
                code={currency}
                minorUnits={minorUnits}
                onChange={setPadText}
                onDone={commitAmount}
                ref={padRef}
                value={padText}
            />
            <AmountEntrySheet
                code={currency}
                minorUnits={minorUnits}
                onChange={setFeePadText}
                onDone={commitFee}
                ref={feePadRef}
                value={feePadText}
            />
        </View>
    );
}
