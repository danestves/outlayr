import { View } from "react-native";

import { SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { moneyManagerSession, useMoneyManagerSession } from "@/lib/money-manager-session";

import { ImportRow } from "./components/import-row";
import { accountTitle, money } from "./labels";

export function MoneyManagerBalances() {
    const { draft } = useMoneyManagerSession();
    const t = useTranslation();
    if (draft === null) {
        return <SettingsScreen>{null}</SettingsScreen>;
    }

    return (
        <SettingsScreen>
            {draft.analysis.balanceGaps.map((gap) => {
                const matched = draft.choices.matchBalances[gap.accountUid] ?? false;
                return (
                    <SettingsSection key={gap.accountUid} title={accountTitle(draft, gap.accountUid)}>
                        <View className="border-border flex-row gap-4 border-b py-3.5">
                            <View className="flex-1 gap-1">
                                <Text className="text-muted text-subtitle">{t("mmImport.balances.shows")}</Text>
                                <Text className="font-sans-semibold text-foreground text-title tabular-nums">
                                    {money(gap.stored, gap.currency)}
                                </Text>
                            </View>
                            <View className="flex-1 gap-1">
                                <Text className="text-muted text-subtitle">{t("mmImport.balances.sum")}</Text>
                                <Text className="font-sans-semibold text-foreground text-title tabular-nums">
                                    {money(gap.computed, gap.currency)}
                                </Text>
                            </View>
                        </View>
                        <ImportRow
                            detail={
                                matched
                                    ? t("mmImport.balances.matchOn", {
                                          opening: money(gap.stored - gap.computed, gap.currency),
                                          stored: money(gap.stored, gap.currency),
                                      })
                                    : t("mmImport.balances.matchOff", { computed: money(gap.computed, gap.currency) })
                            }
                            testID={`mm-balance-${gap.accountUid}`}
                            title={t("mmImport.balances.match")}
                            toggle={{
                                onValueChange: (value) =>
                                    moneyManagerSession.updateChoices((choices) => ({
                                        ...choices,
                                        matchBalances: { ...choices.matchBalances, [gap.accountUid]: value },
                                    })),
                                value: matched,
                            }}
                        />
                    </SettingsSection>
                );
            })}
        </SettingsScreen>
    );
}
