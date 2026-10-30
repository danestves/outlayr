import { View } from "react-native";

import { ImportRow } from "@/components/import-flow/import-row";
import { ImportHero } from "@/components/import-flow/parts";
import { ChoiceRow, SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { formatTargetDate } from "@/domain/dates";
import type { UncategorizedChoice } from "@/domain/money-manager/types";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { moneyManagerSession, useMoneyManagerSession } from "@/lib/money-manager-session";

import { accountTitle, grouped, money, tc } from "./labels";

const PREVIEW_PAIRS = 3;

const OPTIONS = [
    ["leave", "mmImport.uncategorized.leave", "mmImport.uncategorized.leaveDetail"],
    ["review", "mmImport.uncategorized.review", "mmImport.uncategorized.reviewDetail"],
    ["other", "mmImport.uncategorized.other", "mmImport.uncategorized.otherDetail"],
] as const satisfies readonly (readonly [UncategorizedChoice, TranslationKey, TranslationKey])[];

export function MoneyManagerUncategorized() {
    const { draft } = useMoneyManagerSession();
    const t = useTranslation();
    if (draft === null) {
        return <SettingsScreen>{null}</SettingsScreen>;
    }
    const { uncategorized } = draft.analysis;
    const total = uncategorized.expense + uncategorized.income;
    const { pairs } = uncategorized;
    const rest = draft.choices.pairsAsTransfers ? total - pairs.length * 2 : total;

    return (
        <SettingsScreen>
            <ImportHero
                caption={t("mmImport.uncategorized.caption", {
                    expense: grouped(uncategorized.expense),
                    income: grouped(uncategorized.income),
                })}
                eyebrow={t("mmImport.uncategorized.eyebrow")}
                value={grouped(total)}
            />
            {pairs.length > 0 ? (
                <SettingsSection title={tc(t, "mmImport.uncategorized.pairsTitle", pairs.length)}>
                    <ImportRow
                        detail={t("mmImport.uncategorized.makeTransfersDetail")}
                        testID="mm-pairs-toggle"
                        title={t("mmImport.uncategorized.makeTransfers")}
                        toggle={{
                            onValueChange: (value) =>
                                moneyManagerSession.updateChoices((choices) => ({
                                    ...choices,
                                    pairsAsTransfers: value,
                                })),
                            value: draft.choices.pairsAsTransfers,
                        }}
                    />
                    {pairs.slice(0, PREVIEW_PAIRS).map((pair) => (
                        <View className="border-border flex-row items-center gap-3 border-b py-3" key={pair.outUid}>
                            <Text className="text-muted text-footnote w-24 font-mono uppercase">
                                {formatTargetDate(new Date(`${pair.day}T12:00:00`))}
                            </Text>
                            <Text className="text-subtitle text-foreground flex-1" numberOfLines={1}>
                                {`${accountTitle(draft, pair.fromAccountUid)} → ${accountTitle(draft, pair.toAccountUid)}`}
                            </Text>
                            <Text className="text-subtitle text-foreground tabular-nums">
                                {money(pair.amount, pair.currency)}
                            </Text>
                        </View>
                    ))}
                    {pairs.length > PREVIEW_PAIRS ? (
                        <Text className="text-muted text-subtitle py-3">
                            {tc(t, "mmImport.uncategorized.morePairs", pairs.length - PREVIEW_PAIRS)}
                        </Text>
                    ) : null}
                </SettingsSection>
            ) : null}
            {rest > 0 ? (
                <SettingsSection title={t("mmImport.uncategorized.rest", { shown: grouped(rest) })}>
                    {OPTIONS.map(([value, label, detail]) => (
                        <ChoiceRow
                            detail={t(detail)}
                            key={value}
                            label={t(label)}
                            onPress={() =>
                                moneyManagerSession.updateChoices((choices) => ({ ...choices, uncategorized: value }))
                            }
                            selected={draft.choices.uncategorized === value}
                        />
                    ))}
                </SettingsSection>
            ) : null}
        </SettingsScreen>
    );
}
