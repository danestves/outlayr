import { Pressable, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { HeroNumber } from "@/components/amount-text";
import { EditorCta } from "@/components/editor-cta";
import { InlineFailure } from "@/components/form/inline-failure";
import { ChoiceRow } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { ScreenHeader } from "@/components/screen-header";
import { revealEntering } from "@/components/sentence/sentence-motion";
import { Text } from "@/components/text";
import { formatTargetDate } from "@/domain/dates";
import { useLanguage, useTranslation } from "@/i18n/context";
import { CompactDatePicker } from "@/screens/budgets/components/compact-date-picker";
import { EditorRow } from "@/screens/budgets/components/editor-row";

import { SourceChoice, SourceTile, usePayEntry, usePayForm } from "./pay-form";
import type { PayFormProps } from "./pay-form";

/** Installments never post themselves. */
export function PayInstallment({ all, planId }: { all: boolean; planId: string }) {
    const props = usePayEntry(planId, all);
    return props === null ? null : <PayForm {...props} />;
}

function PayForm(props: PayFormProps) {
    const { account, sources } = props;
    const t = useTranslation();
    const insets = useSafeAreaInsets();
    const { language } = useLanguage();
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
        pickingDate,
        pickingFrom,
        plan,
        setDate,
        setPadText,
        setPickingDate,
        setPickingFrom,
    } = usePayForm(props);

    return (
        <View className="bg-background flex-1" collapsable={false}>
            <ScreenHeader title={account ? t("installments.pay.to", { account: account.name }) : undefined} />
            {/* react-native-screens resizes a ScrollView on a formSheet's first-child chain to the whole sheet. */}
            <View collapsable={false} />
            <View className="flex-1">
                <ScrollView
                    contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 20 }}
                    contentInsetAdjustmentBehavior="automatic"
                >
                    {pickingFrom ? (
                        <Animated.View entering={revealEntering()}>
                            <MonoLabel accessibilityRole="header" className="pt-2 pb-1.5">
                                {t("installments.from")}
                            </MonoLabel>
                            <View className="border-border border-t">
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
                        </Animated.View>
                    ) : (
                        <>
                            <Pressable
                                accessibilityLabel={t("installments.cuota.amount")}
                                accessibilityRole="button"
                                className="items-center gap-1 pt-4 pb-6"
                                onPress={() => padRef.current?.present()}
                            >
                                <HeroNumber amount={amount} code={plan.currency} showCents sign="" still />
                                {converted ? (
                                    <Text className="text-muted text-subtitle tabular-nums">{converted}</Text>
                                ) : null}
                            </Pressable>

                            <View className="border-border border-t">
                                <View className="border-border flex-row items-center gap-3 border-b py-3.5">
                                    <Text className="text-body text-foreground flex-1">
                                        {t("installments.pay.for")}
                                    </Text>
                                    <Text className="text-body text-muted" numberOfLines={1}>
                                        {forLabel}
                                    </Text>
                                </View>
                                <EditorRow
                                    label={t("installments.from")}
                                    onPress={() => setPickingFrom(true)}
                                    value={
                                        from
                                            ? from.name
                                            : `${t("installments.from.none")} · ${t("installments.notFromAccount")}`
                                    }
                                />
                                <EditorRow
                                    label={t("installments.pay.date")}
                                    onPress={() => setPickingDate((open) => !open)}
                                    value={formatTargetDate(date, language)}
                                />
                                {pickingDate ? (
                                    <Animated.View className="border-border border-b py-2" entering={revealEntering()}>
                                        <CompactDatePicker
                                            label={t("installments.pay.date")}
                                            onChange={(picked) => {
                                                setPickingDate(false);
                                                setDate(picked);
                                            }}
                                            onDismiss={() => setPickingDate(false)}
                                            range={{ end: new Date() }}
                                            value={date}
                                        />
                                    </Animated.View>
                                ) : null}
                            </View>
                        </>
                    )}
                </ScrollView>
            </View>

            {pickingFrom ? null : (
                <View className="px-5" style={{ paddingBottom: insets.bottom + 8 }}>
                    <InlineFailure message={failure} />
                    <EditorCta
                        busy={busy}
                        canSave={canPay}
                        label={t("installments.pay", { amount: money(amount) })}
                        onPress={confirm}
                    />
                </View>
            )}

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
