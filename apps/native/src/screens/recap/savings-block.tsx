import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useMonthSavings } from "@/data/use-month-savings";
import { BALANCES_CATEGORIES } from "@/domain/balances";
import { monthLongTitle } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { proRowCost } from "@/domain/month-savings";
import { monthlyCost } from "@/domain/pro-plans";
import { listNames } from "@/domain/savings-names";
import { useHeldSubscription } from "@/hooks/use-held-subscription";
import { useLanguage, useTranslation } from "@/i18n/context";

import { SavingsBar, SavingsRow, SavingsSection } from "./savings-rows";

export function SavingsBlock({ month, nowMs }: { month: Date; nowMs: number }) {
    const db = useDatabase();
    const t = useTranslation();
    const router = useRouter();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const currency = useGlobalCurrency(db);
    const savings = useMonthSavings(db, nowMs, month);
    const held = useHeldSubscription();

    if (!savings.hasBudgets) {
        return null;
    }

    const money = (amount: number) => formatAmount(amount, currency, showCents, language);
    const { budgetsKept, budgetsTotal, drop, kept, overNames, underBudgets } = savings;
    const proPrice = proRowCost(kept, held === null ? null : monthlyCost(held.plan), currency);
    const price = proPrice === null ? "" : formatAmount(proPrice, currency, true, language);

    return (
        <View className="pt-6">
            <SavingsSection label={monthLongTitle(month, language)} title={t("insights.savings.title")}>
                {budgetsKept > 0 && underBudgets > 0 ? (
                    <SavingsRow
                        detail={t("insights.savings.underDetail", {
                            count: budgetsTotal,
                            kept: budgetsKept,
                        })}
                        figure={money(underBudgets)}
                        label={t("insights.savings.under")}
                    />
                ) : null}
                {drop === null ? null : (
                    <SavingsRow
                        detail={t("insights.savings.belowDetail", { amount: money(drop.average) })}
                        figure={money(drop.amount)}
                        label={t("insights.savings.belowTitle", { category: drop.name })}
                    />
                )}
                {overNames.length === 0 ? null : (
                    <SavingsRow
                        detail={listNames(overNames, t)}
                        label={t("insights.savings.over", {
                            count: budgetsTotal,
                            over: overNames.length,
                        })}
                        trailing={
                            <Pressable
                                accessibilityRole="link"
                                hitSlop={8}
                                onPress={() => router.dismissTo(BALANCES_CATEGORIES)}
                            >
                                <Text className="font-sans-medium text-footnote text-foreground underline">
                                    {t("insights.savings.seeBudgets")}
                                </Text>
                            </Pressable>
                        }
                    />
                )}
                {proPrice === null ? null : (
                    <SavingsRow figure={price} label={t("insights.savings.pro")} tone="muted">
                        <View className="pt-2">
                            <SavingsBar kept={kept} price={proPrice} />
                        </View>
                        <Text className="text-footnote text-muted pt-2">
                            {t("insights.savings.proNote", { kept: money(kept), price })}
                        </Text>
                    </SavingsRow>
                )}
                {kept > 0 ? null : (
                    <Text className="text-footnote text-muted pt-2.5">{t("insights.savings.footnoteNone")}</Text>
                )}
            </SavingsSection>
        </View>
    );
}
