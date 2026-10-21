import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import { useRef, useState } from "react";
import type { Ref } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { revealEntering } from "@/components/sentence/sentence-motion";
import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { InstallmentRow } from "@/data/installments-core";
import { formatTargetDate } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { useMergedRef } from "@/hooks/use-merged-ref";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useLanguage, useTranslation } from "@/i18n/context";
import { CompactDatePicker } from "@/screens/budgets/components/compact-date-picker";
import { EditorRow } from "@/screens/budgets/components/editor-row";

import { installmentTitle } from "./labels";
import { useCuotaEditor } from "./use-cuota-editor";
import { useFeeEditor } from "./use-fee-editor";

export interface CuotaSheetProps {
    accountId: string;
    count: number;
    currency: string;
    /** The purchase's date: a cuota due before it would take the upfront's payment. */
    earliest?: Date;
    onDismiss: () => void;
    ref?: Ref<BottomSheetModal>;
    row: InstallmentRow | null;
}

export function CuotaSheet({ accountId, count, currency, earliest, onDismiss, ref, row }: CuotaSheetProps) {
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
                <BottomSheetView style={{ paddingBottom: 36, paddingHorizontal: 20, paddingTop: 8 }}>
                    {row ? (
                        <CuotaBody
                            accountId={accountId}
                            count={count}
                            currency={currency}
                            earliest={earliest}
                            key={row.id}
                            onClose={() => sheetRef.current?.dismiss()}
                            row={row}
                        />
                    ) : null}
                </BottomSheetView>
            </SheetGestureRoot>
        </BottomSheetModal>
    );
}

function CuotaBody({
    accountId,
    count,
    currency,
    earliest,
    onClose,
    row,
}: {
    accountId: string;
    count: number;
    currency: string;
    earliest?: Date;
    onClose: () => void;
    row: InstallmentRow;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const [pickingDate, setPickingDate] = useState(false);
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

    return (
        <View>
            <Text accessibilityRole="header" className="text-foreground pb-3 text-center text-lg font-medium">
                {installmentTitle(t, row, count)}
            </Text>
            <View className="border-border border-t">
                <EditorRow
                    label={t("installments.cuota.due")}
                    onPress={() => setPickingDate((open) => !open)}
                    value={formatTargetDate(dueDate, language)}
                />
                {pickingDate ? (
                    <Animated.View className="border-border border-b py-2" entering={revealEntering()}>
                        <CompactDatePicker
                            label={t("installments.cuota.due")}
                            onChange={(next) => {
                                setPickingDate(false);
                                moveTo(next);
                            }}
                            onDismiss={() => setPickingDate(false)}
                            range={{ start: earliest }}
                            value={dueDate}
                        />
                    </Animated.View>
                ) : null}
                <EditorRow
                    label={t("installments.cuota.amount")}
                    onPress={() => padRef.current?.present()}
                    value={formatAmount(amount, currency, showCents, language)}
                />
                {row.fee > 0 ? (
                    <Animated.View entering={hadFee ? undefined : revealEntering()}>
                        <EditorRow
                            label={t("installments.fee.label")}
                            onPress={openFee}
                            value={formatAmount(row.fee, currency, showCents, language)}
                        />
                        <Pressable
                            accessibilityRole="button"
                            className="border-border border-b py-3.5 active:opacity-60"
                            onPress={removeFee}
                        >
                            <Text className="text-over-budget text-body">{t("installments.fee.remove")}</Text>
                        </Pressable>
                    </Animated.View>
                ) : (
                    <Pressable
                        accessibilityRole="button"
                        className="border-border border-b py-3.5 active:opacity-60"
                        onPress={openFee}
                    >
                        <Text className="text-tint text-body">{t("installments.fee.add")}</Text>
                    </Pressable>
                )}
                <Pressable
                    accessibilityRole="button"
                    className="border-border border-b py-3.5 active:opacity-60"
                    onPress={remove}
                >
                    <Text className="text-over-budget text-body">{t("installments.cuota.delete")}</Text>
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
