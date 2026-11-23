import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { draftSchedule, upfrontOf } from "@outlayr/money/installment-draft";
import type { InstallmentDraft } from "@outlayr/money/installment-draft";
import type { ScheduledInstallment } from "@outlayr/money/installments";
import { useRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";

import { CategoryPickerSheet } from "@/components/category-picker-sheet";
import { ROUNDED, Text, TextInput } from "@/components/text";
import { InstallmentsSheet } from "@/components/transaction-form/installments-sheet";
import { MAX_NAME_LENGTH } from "@/components/transaction-form/stage/step-merchant";
import type { Account } from "@/data/accounts-core";
import type { Category } from "@/data/categories-core";
import type { Database } from "@/db/client";
import { formatChargeDate } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { StepHeader } from "./new-purchase-step-header";

interface NewPurchasePlanProps {
    account: Account;
    amount: number;
    category: Category | null;
    db: Database;
    draft: InstallmentDraft;
    funding: readonly Account[];
    name: string;
    onBack: () => void;
    onCategory: (category: Category) => void;
    onDraft: (draft: InstallmentDraft) => void;
    onName: (name: string) => void;
    onSave: () => void;
    problem: string | null;
    purchaseDay: Date;
    saving: boolean;
}

interface PlanSummary {
    count: number;
    each: string;
    every: string;
    /** True when the scheduled payments do not all share one amount. */
    mixed: boolean;
    t: TranslateFn;
    today: string | null;
}

function planSummary({ count, each, every, mixed, t, today }: PlanSummary): string {
    if (mixed) {
        return today === null
            ? `${t("installments.new.terms.plain", { count })} · ${every}`
            : t("installments.new.summary.mixed", { count, every, today });
    }
    return today === null
        ? t("installments.new.summary.plain", { count, each, every })
        : t("installments.new.summary", { count, each, every, today });
}

export function NewPurchasePlan({
    account,
    amount,
    category,
    db,
    draft,
    funding,
    name,
    onBack,
    onCategory,
    onDraft,
    onName,
    onSave,
    problem,
    purchaseDay,
    saving,
}: NewPurchasePlanProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const sheetRef = useRef<BottomSheetModal>(null);
    const categoryRef = useRef<BottomSheetModal>(null);
    const { currency } = account;
    const schedule = draftSchedule(draft, amount, purchaseDay, currency);
    const upfront = upfrontOf(draft, amount, currency);
    const installments = schedule?.filter((row) => row.sequence > 0) ?? [];
    const [first] = installments;
    const each = draft.each ?? first?.amount ?? 0;
    const sameEach = first !== undefined && installments.every((row) => row.amount === first.amount);
    const from = funding.find((row) => row.id === draft.upfrontAccountId) ?? null;
    const money = (value: number) => formatAmount(value, currency, true, language);
    const summary = planSummary({
        count: draft.count,
        each: money(each),
        every: t(`installments.every.${draft.every}`),
        mixed: !sameEach,
        t,
        today: upfront > 0 ? money(upfront) : null,
    });
    const present = () => sheetRef.current?.present();
    const submit = () => {
        if (category === null) {
            categoryRef.current?.present();
            return;
        }
        onSave();
    };

    return (
        <KeyboardAvoidingView behavior="padding" className="bg-background flex-1" enabled={Platform.OS === "android"}>
            <ScrollView
                automaticallyAdjustKeyboardInsets
                className="flex-1"
                contentContainerClassName="px-5 pb-safe-offset-10"
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <StepHeader onBack={onBack} title={t("installments.new.plan")} />
                <Pressable
                    accessibilityRole="button"
                    className="border-border border-b py-3.5 active:opacity-60"
                    onPress={present}
                >
                    <Text className={`text-body ${schedule === null ? "text-expense" : "text-foreground"}`}>
                        {schedule === null ? t("installments.nothingLeft") : summary}
                    </Text>
                </Pressable>

                {schedule?.map((row) => (
                    <PlanRow
                        from={from}
                        key={row.sequence}
                        money={money}
                        onPress={present}
                        purchaseDay={purchaseDay}
                        row={row}
                    />
                ))}

                <View className="pt-6">
                    <View className="border-border border-b py-3">
                        <Text className="text-footnote text-muted">{t("installments.new.name")}</Text>
                        <TextInput
                            accessibilityLabel={t("installments.new.name")}
                            autoCapitalize="words"
                            autoCorrect={false}
                            clearButtonMode="while-editing"
                            maxLength={MAX_NAME_LENGTH}
                            onChangeText={onName}
                            placeholder={t("installments.new.name")}
                            placeholderTextColor={colors.muted}
                            returnKeyType="done"
                            style={{
                                color: colors.foreground,
                                fontFamily: ROUNDED,
                                fontSize: 17,
                                padding: 0,
                                paddingTop: 4,
                            }}
                            value={name}
                        />
                    </View>
                    <FieldRow
                        label={t("installments.new.category")}
                        onPress={() => categoryRef.current?.present()}
                        value={category?.name ?? null}
                    />
                </View>

                {problem === null ? null : <Text className="text-expense text-subtitle pt-4">{problem}</Text>}

                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: saving }}
                    className="bg-tint mt-8 min-h-[48px] items-center justify-center rounded-[14px] px-4 py-2 active:opacity-80"
                    disabled={saving}
                    onPress={submit}
                    style={{ opacity: saving ? 0.6 : 1 }}
                >
                    <Text className="font-sans-semibold text-callout text-accent-foreground text-center">
                        {t("common.save")}
                    </Text>
                </Pressable>
            </ScrollView>

            <InstallmentsSheet
                accounts={funding}
                currency={currency}
                draft={draft}
                entryRateMissing={false}
                fees={[]}
                onChange={onDraft}
                price={amount}
                purchaseDay={purchaseDay}
                ref={sheetRef}
                schedule={schedule}
            />
            <CategoryPickerSheet
                db={db}
                income={false}
                onSelect={(picked) => {
                    categoryRef.current?.dismiss();
                    onCategory(picked);
                }}
                ref={categoryRef}
                selectedId={category?.id ?? null}
            />
        </KeyboardAvoidingView>
    );
}

function PlanRow({
    from,
    money,
    onPress,
    purchaseDay,
    row,
}: {
    from: Account | null;
    money: (value: number) => string;
    onPress: () => void;
    purchaseDay: Date;
    row: ScheduledInstallment;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const date = formatChargeDate(row.dueDate, purchaseDay, language);
    const paidToday = row.sequence === 0;
    const source =
        from === null ? t("installments.notFromAccount") : t("installments.new.fromAccount", { account: from.name });
    return (
        <Pressable
            accessibilityRole="button"
            className="border-border flex-row items-center gap-3 border-b py-3 active:opacity-60"
            onPress={onPress}
        >
            <View className="flex-1 gap-0.5">
                <Text className="text-body text-foreground">
                    {paidToday ? t("installments.new.paidToday") : t("installments.new.payment", { n: row.sequence })}
                </Text>
                <Text className="text-muted text-subtitle leading-snug">
                    {paidToday ? `${date} · ${source}` : date}
                </Text>
            </View>
            <Text className="text-body text-foreground tabular-nums">{money(row.amount)}</Text>
        </Pressable>
    );
}

function FieldRow({ label, onPress, value }: { label: string; onPress: () => void; value: string | null }) {
    const colors = useColors();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityValue={value === null ? undefined : { text: value }}
            className="border-border flex-row items-center gap-3 border-b py-3.5 active:opacity-60"
            onPress={onPress}
        >
            <Text className="text-body text-foreground flex-1">{label}</Text>
            {value === null ? null : (
                <Text className="text-body text-muted shrink" numberOfLines={1}>
                    {value}
                </Text>
            )}
            <HugeiconsIcon color={colors.subtle} icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
        </Pressable>
    );
}
