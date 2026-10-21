import { SegmentedButton, SingleChoiceSegmentedButtonRow, Text as ComposeText } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Stack } from "expo-router";
import { memo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountTile } from "@/components/account-tile";
import { HeroNumber } from "@/components/amount-text";
import { InlineFailure } from "@/components/form/inline-failure";
import { MaterialHost } from "@/components/material-host";
import { OutlinedDateField } from "@/components/material/outlined-date-field";
import { OutlinedSelectField, OutlinedTextField } from "@/components/material/outlined-field";
import { SheetHeaderTextButton } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { Account } from "@/data/accounts-core";
import { tomorrowLocal } from "@/domain/local-day";
import { formatAmount } from "@/domain/money";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { useLanguage, useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import { NewDebtSheets, present, useNewDebtForm } from "./new-debt-form";
import type { NewDebtProps } from "./new-debt-form";

const SUGGESTION_TILE = 24;
const PRESSED_ALPHA = 0.1;
const LABEL_FONT = { fontFamily: "GoogleSansFlex_500Medium" } as const;

function selectValue(value: string) {
    return (
        <Text className="text-body text-m3-on-surface" numberOfLines={1}>
            {value}
        </Text>
    );
}

/** Memoized: a keystroke must not rebuild the bar. */
const SaveAction = memo(({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) => (
    <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
            <SheetHeaderTextButton disabled={disabled} label={label} onPress={onPress} />
        </Stack.Toolbar.View>
    </Stack.Toolbar>
));
SaveAction.displayName = "SaveAction";

export function NewDebt(props: NewDebtProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const m3 = useMaterialColors();
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const { showCents } = useDisplaySettings().state;
    const form = useNewDebtForm(props);
    const { choice, currency, soldOnCredit, theirCurrency } = form;

    return (
        <View className="bg-m3-surface flex-1">
            <SaveAction disabled={!form.canSave} label={t("common.save")} onPress={form.onSave} />

            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 + keyboardHeight }}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >
                <View className="gap-4 px-4 pt-2">
                    <MaterialHost matchContents={{ vertical: true }}>
                        <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
                            {form.choices.map((option) => (
                                <SegmentedButton
                                    key={option.verb}
                                    onClick={() => {
                                        form.setSoldOnCredit(false);
                                        form.setVerb(option.verb);
                                    }}
                                    selected={!soldOnCredit && option.verb === choice.verb}
                                >
                                    <SegmentedButton.Label>
                                        <ComposeText maxLines={1} style={LABEL_FONT}>
                                            {t(option.labelKey)}
                                        </ComposeText>
                                    </SegmentedButton.Label>
                                </SegmentedButton>
                            ))}
                            <SegmentedButton onClick={() => form.setSoldOnCredit(true)} selected={soldOnCredit}>
                                <SegmentedButton.Label>
                                    <ComposeText maxLines={1} style={LABEL_FONT}>
                                        {t("debts.verb.soldOnCredit")}
                                    </ComposeText>
                                </SegmentedButton.Label>
                            </SegmentedButton>
                        </SingleChoiceSegmentedButtonRow>
                    </MaterialHost>

                    <Pressable
                        accessibilityLabel={t("debts.a11y.amount")}
                        accessibilityRole="button"
                        className="items-center py-2 active:opacity-70"
                        onPress={() => present(form.amountSheet)}
                    >
                        <HeroNumber amount={form.amount} code={currency} showCents={showCents} sign="" still />
                    </Pressable>

                    <View>
                        <OutlinedTextField
                            autoCapitalize="words"
                            editable={form.lockedPerson === null}
                            ground={m3.surface}
                            label={form.personLabel}
                            onChangeText={form.setName}
                            placeholder={t("debts.field.personPlaceholder")}
                            returnKeyType="done"
                            value={form.lockedPerson?.name ?? form.name}
                        />
                        {form.suggestions.map((row) => (
                            <PersonSuggestion key={row.id} onPick={() => form.setName(row.name)} person={row} />
                        ))}
                    </View>

                    {soldOnCredit ? (
                        <OutlinedSelectField
                            accessibilityValue={form.category?.name ?? ""}
                            ground={m3.surface}
                            label={t("transaction.field.category")}
                            onPress={() => present(form.categorySheet)}
                            value={selectValue(form.category?.name ?? "")}
                        />
                    ) : (
                        <OutlinedSelectField
                            accessibilityValue={form.accountValue}
                            ground={m3.surface}
                            label={form.accountLabel}
                            onPress={() => present(form.accountSheet)}
                            value={selectValue(form.accountValue)}
                        />
                    )}
                    {theirCurrency === null ? null : (
                        <OutlinedSelectField
                            accessibilityValue={formatAmount(form.theirAmount, theirCurrency, true, language)}
                            dropdown={false}
                            ground={m3.surface}
                            label={t("debts.field.theirSide", { currency: theirCurrency })}
                            onPress={() => present(form.theirSheet)}
                            value={selectValue(formatAmount(form.theirAmount, theirCurrency, true, language))}
                        />
                    )}
                    {form.pickCurrency ? (
                        <OutlinedSelectField
                            accessibilityValue={currency}
                            ground={m3.surface}
                            label={t("debts.field.currency")}
                            onPress={() => present(form.currencySheet)}
                            value={selectValue(currency)}
                        />
                    ) : null}
                    {form.before ? null : (
                        <OutlinedDateField
                            ground={m3.surface}
                            label={t("debts.field.date")}
                            onChange={form.setDate}
                            range={{ end: new Date(form.nowMs) }}
                            value={form.date}
                        />
                    )}
                    <PayBackByField form={form} />
                    {form.before ? null : (
                        <OutlinedTextField
                            ground={m3.surface}
                            label={t("debts.field.note")}
                            onChangeText={form.setNote}
                            placeholder={t("debts.field.notePlaceholder")}
                            returnKeyType="done"
                            value={form.note}
                        />
                    )}
                    <InlineFailure message={form.failure} />
                </View>
            </ScrollView>

            <NewDebtSheets form={form} />
        </View>
    );
}

function PayBackByField({ form }: { form: ReturnType<typeof useNewDebtForm> }) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    const label = t("debts.plan.payBackBy");
    if (form.payBackBy === null) {
        const empty = t("debts.field.notePlaceholder");
        return (
            <OutlinedSelectField
                accessibilityValue={empty}
                dropdown={false}
                ground={m3.surface}
                label={label}
                onPress={form.openPayBackBy}
                value={
                    <Text className="text-body text-m3-on-surface-variant" numberOfLines={1}>
                        {empty}
                    </Text>
                }
            />
        );
    }
    return (
        <OutlinedDateField
            ground={m3.surface}
            label={label}
            onChange={form.setPayBackBy}
            range={{ start: tomorrowLocal(form.nowMs) }}
            trailing={
                <Pressable
                    accessibilityLabel={t("debts.plan.remove")}
                    accessibilityRole="button"
                    android_ripple={{ borderless: true, color: withAlpha(m3.onSurface, PRESSED_ALPHA), radius: 20 }}
                    className="size-12 items-center justify-center"
                    onPress={() => form.setPayBackBy(null)}
                >
                    <HugeiconsIcon color={m3.onSurfaceVariant} icon={Cancel01Icon} size={24} />
                </Pressable>
            }
            value={form.payBackBy}
        />
    );
}

function PersonSuggestion({ onPick, person }: { onPick: () => void; person: Account }) {
    const m3 = useMaterialColors();
    return (
        <Pressable
            accessibilityLabel={person.name}
            accessibilityRole="button"
            android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
            className="min-h-12 flex-row items-center gap-3 px-4"
            onPress={onPick}
        >
            <AccountTile account={person} radius={6} size={SUGGESTION_TILE} />
            <Text className="text-body text-m3-primary flex-1" numberOfLines={1}>
                {person.name}
            </Text>
        </Pressable>
    );
}
