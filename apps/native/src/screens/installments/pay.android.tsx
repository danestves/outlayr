import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { HeroNumber } from "@/components/amount-text";
import { FilledButton } from "@/components/filled-button";
import { InlineFailure } from "@/components/form/inline-failure";
import { ChoiceRow } from "@/components/list/list-row";
import { OutlinedDateField } from "@/components/material/outlined-date-field";
import { OutlinedSelectField } from "@/components/material/outlined-field";
import { SheetHeader } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { useMaterialColors } from "@/theme/use-material-colors";

import { SourceChoice, SourceTile, usePayEntry, usePayForm } from "./pay-form";
import type { PayFormProps } from "./pay-form";

function fieldValue(value: string) {
    return (
        <Text className="text-body text-m3-on-surface" numberOfLines={1}>
            {value}
        </Text>
    );
}

/** Not pinned to the foot: a sheet is as tall as its largest detent, so it would rest off screen. */
export function PayInstallment({ all, planId }: { all: boolean; planId: string }) {
    const props = usePayEntry(planId, all);
    return props === null ? null : <PayForm {...props} />;
}

function PayForm(props: PayFormProps) {
    const { account, sources } = props;
    const t = useTranslation();
    const m3 = useMaterialColors();
    const insets = useSafeAreaInsets();
    const {
        accountName,
        amount,
        busy,
        canPay,
        confirm,
        converted,
        date,
        failure,
        forLabel,
        from,
        minorUnits,
        money,
        padRef,
        padText,
        pickFrom,
        pickingFrom,
        plan,
        setDate,
        setPadText,
        setPickingFrom,
    } = usePayForm(props);
    const fromLabel = from ? from.name : `${t("installments.from.none")} · ${t("installments.notFromAccount")}`;
    const payTitle = account ? t("installments.pay.to", { account: account.name }) : undefined;

    return (
        <View className="bg-m3-surface-container-low flex-1">
            <SheetHeader
                onClose={pickingFrom ? () => setPickingFrom(false) : undefined}
                title={pickingFrom ? t("installments.from") : payTitle}
            />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}
            >
                {pickingFrom ? (
                    <View>
                        <ChoiceRow
                            detail={t("installments.from.outside", { account: accountName })}
                            label={t("installments.from.none")}
                            leading={<SourceTile account={null} />}
                            onPress={() => pickFrom(null)}
                            selected={from === null}
                        />
                        {sources.map((option) => (
                            <SourceChoice
                                account={option}
                                amount={amount}
                                date={date}
                                key={option.id}
                                onPress={() => pickFrom(option.id)}
                                selected={option.id === from?.id}
                                toCurrency={plan.currency}
                            />
                        ))}
                    </View>
                ) : (
                    <View className="gap-4">
                        <Pressable
                            accessibilityLabel={t("installments.cuota.amount")}
                            accessibilityRole="button"
                            className="items-center gap-1 py-2 active:opacity-70"
                            onPress={() => padRef.current?.present()}
                        >
                            <HeroNumber amount={amount} code={plan.currency} showCents sign="" still />
                            <Text className="text-body text-m3-on-surface-variant text-center" numberOfLines={1}>
                                {forLabel}
                            </Text>
                            {converted ? (
                                <Text className="text-caption text-m3-on-surface-variant tabular-nums">
                                    {converted}
                                </Text>
                            ) : null}
                        </Pressable>
                        <OutlinedSelectField
                            accessibilityValue={fromLabel}
                            dropdown={false}
                            ground={m3.surfaceContainerLow}
                            label={t("installments.from")}
                            onPress={() => setPickingFrom(true)}
                            value={fieldValue(fromLabel)}
                        />
                        <OutlinedDateField
                            ground={m3.surfaceContainerLow}
                            label={t("installments.pay.date")}
                            onChange={setDate}
                            range={{ end: new Date() }}
                            value={date}
                        />
                        <View className="pt-2">
                            <InlineFailure message={failure} />
                            <FilledButton
                                busy={busy}
                                disabled={busy || !canPay}
                                label={t("installments.pay", { amount: money(amount) })}
                                onPress={confirm}
                            />
                        </View>
                    </View>
                )}
            </ScrollView>

            <AmountEntrySheet
                code={plan.currency}
                minorUnits={minorUnits}
                onChange={setPadText}
                onDone={() => padRef.current?.dismiss()}
                ref={padRef}
                value={padText}
            />
        </View>
    );
}
