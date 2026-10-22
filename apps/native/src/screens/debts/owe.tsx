import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { CategoryPickerSheet } from "@/components/category-picker-sheet";
import { CurrencyPickerSheet } from "@/components/currency-picker-sheet";
import { EditorCta } from "@/components/editor-cta";
import { InlineFailure } from "@/components/form/inline-failure";
import { MonoLabel } from "@/components/mono-label";
import { Sentence } from "@/components/sentence/sentence";
import { SentenceBlank } from "@/components/sentence/sentence-blank";
import { SentenceValue } from "@/components/sentence/sentence-value";
import { Text } from "@/components/text";
import { CurrencyCode } from "@/components/transaction-form/sentence/currency-code";
import { StageOptionRow } from "@/components/transaction-form/stage/stage-options";
import { StepMerchant } from "@/components/transaction-form/stage/step-merchant";
import { useDatabase } from "@/contexts/local-data-context";
import { formatAmount, minorUnitsFor } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";

import { present } from "./new-debt-form";
import { useOweForm } from "./use-owe-form";
import type { OweProps, OweSlot, PayBy } from "./use-owe-form";

export function Owe(props: OweProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const insets = useSafeAreaInsets();
    const db = useDatabase();
    const form = useOweForm(props);
    const { active, amount, amountSheet, category, categorySheet, currency, currencySheet, days, payBy, person } = form;

    const friday = { day: days.friday.getDate() };
    const when = {
        friday: t("debts.owe.when.friday", friday),
        monthEnd: t("debts.owe.when.monthEnd"),
        none: t("debts.owe.when.none"),
        tomorrow: t("debts.owe.when.tomorrow"),
    } satisfies Record<PayBy, string>;
    const chips = [
        { id: "tomorrow", label: t("debts.owe.chip.tomorrow") },
        { id: "friday", label: t("debts.owe.chip.friday", friday) },
        { id: "monthEnd", label: t("debts.owe.chip.monthEnd") },
        { id: "none", label: t("debts.owe.chip.none") },
    ] as const satisfies readonly { id: PayBy; label: string }[];

    const labels = {
        amount: t("debts.owe.field.amount"),
        category: t("debts.owe.field.category"),
        what: t("debts.owe.field.what"),
        when: t("debts.owe.field.when"),
        who: t("debts.owe.field.who"),
    } satisfies Record<OweSlot, string>;
    const blanks = {
        amount: t("transfers.sentence.blank.amount"),
        category: t("transaction.sentence.blank.category"),
        what: t("debts.owe.blank.what"),
        when: when.none,
        who: t("debts.owe.blank.who"),
    } satisfies Record<OweSlot, string>;
    const name = person?.name ?? form.name.trim();
    const what = form.what.trim();
    const values = {
        amount: amount > 0 ? formatAmount(amount, currency, true, language) : null,
        category: category?.name ?? null,
        what: what === "" ? null : what,
        when: when[payBy],
        who: name === "" ? null : name,
    } satisfies Record<OweSlot, string | null>;

    const press = (slot: OweSlot) => {
        if (slot === "amount") {
            present(amountSheet);
        } else if (slot === "category") {
            present(categorySheet);
        } else {
            form.setActive(slot);
        }
    };

    const part = (slot: OweSlot) => {
        const value = values[slot];
        const shared = { accessibilityLabel: labels[slot], active: active === slot, onPress: () => press(slot) };
        return value === null ? (
            <SentenceBlank
                {...shared}
                label={blanks[slot]}
                optional={slot === "what"}
                optionalHint={t("transaction.sentence.optional")}
            />
        ) : (
            <SentenceValue
                {...shared}
                figure={slot === "amount" ? { amount, code: currency } : undefined}
                swapKey={slot}
                value={value}
            />
        );
    };

    return (
        <View className="bg-background flex-1">
            <ScrollView
                contentContainerStyle={{ gap: 24, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 8 }}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
            >
                <Sentence
                    slots={{
                        amount: (
                            <View className="flex-row items-baseline gap-1.5">
                                {part("amount")}
                                {person === null ? (
                                    <CurrencyCode
                                        accessibilityLabel={t("transaction.sentence.currency")}
                                        code={currency}
                                        onPress={() => present(currencySheet)}
                                    />
                                ) : null}
                            </View>
                        ),
                        category: part("category"),
                        what: part("what"),
                        when: part("when"),
                        who: part("who"),
                    }}
                    template={`${t("debts.owe.sentence")} ${t("debts.owe.when")}`}
                />

                <View className="border-border gap-3 border-t pt-3">
                    <MonoLabel accessibilityRole="header">{labels[active]}</MonoLabel>
                    {active === "who" ? (
                        <StepMerchant
                            accessibilityLabel={labels.who}
                            onChange={form.setName}
                            placeholder={t("debts.owe.who.placeholder")}
                            recent={[]}
                            recentLabel=""
                            suggestions={form.suggestions.map((row) => row.name)}
                            value={form.name}
                        />
                    ) : null}
                    {active === "what" ? (
                        <StepMerchant
                            accessibilityLabel={labels.what}
                            onChange={form.setWhat}
                            placeholder={t("debts.owe.what.placeholder")}
                            recent={[]}
                            recentLabel=""
                            suggestions={[]}
                            value={form.what}
                        />
                    ) : null}
                    {active === "when" ? (
                        <>
                            <StageOptionRow onSelect={form.pickPayBy} options={chips} selectedId={payBy} />
                            {payBy === "none" || payBy === "tomorrow" ? null : (
                                <Text className="text-footnote text-muted">{t("debts.owe.remind")}</Text>
                            )}
                        </>
                    ) : null}
                </View>
            </ScrollView>

            <View className="px-5" style={{ paddingBottom: insets.bottom + 8 }}>
                <InlineFailure message={form.failure} />
                <EditorCta busy={form.busy} canSave={form.canSave} label={t("common.save")} onPress={form.onSave} />
            </View>

            <AmountEntrySheet
                code={currency}
                minorUnits={minorUnitsFor(currency)}
                onChange={form.setAmountText}
                onDone={() => amountSheet.current?.dismiss()}
                ref={amountSheet}
                value={form.amountText}
            />
            <CategoryPickerSheet
                db={db}
                income={false}
                onSelect={(picked) => {
                    categorySheet.current?.dismiss();
                    form.setCategory(picked);
                }}
                ref={categorySheet}
                selectedId={category?.id ?? null}
            />
            <CurrencyPickerSheet
                onSelect={(code) => {
                    currencySheet.current?.dismiss();
                    form.setNewCurrency(code);
                }}
                ref={currencySheet}
                selected={currency}
            />
        </View>
    );
}
