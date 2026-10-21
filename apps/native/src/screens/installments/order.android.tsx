import { Stack } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeroNumber } from "@/components/amount-text";
import { Eyebrow } from "@/components/category-list-chrome";
import { FilledButton } from "@/components/filled-button";
import { ListItemFrame, ListItemText } from "@/components/list/material-list-item";
import { MonoLabel } from "@/components/mono-label";
import { ScreenHeader } from "@/components/screen-header";
import { Text } from "@/components/text";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccounts } from "@/data/accounts";
import type { InstallmentRow, PlanWithStanding } from "@/data/installments-core";
import { formatSentenceDate } from "@/domain/dates";
import { orderPlanPhrase } from "@/domain/installment-plan-phrase";
import { orderName } from "@/domain/installments";
import type { InstallmentStanding } from "@/domain/installments";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";
import { useMaterialColors } from "@/theme/use-material-colors";

import { CuotaSheet } from "./cuota-sheet";
import { FeeSuggestion } from "./fee-suggestion";
import { installmentTitle, lateFeeSuggestion, scheduleRowWording } from "./labels";
import { useInstallmentEntry, useOrderActions } from "./use-order";

const PRESSED_ALPHA = 0.12;
const STATUS_TONE = {
    overdue: "text-m3-error",
    paid: "text-income",
    partial: "text-m3-on-surface-variant",
} as const;

export function InstallmentOrder({ planId }: { planId: string }) {
    const { entry, leave, nowMs } = useInstallmentEntry(planId);
    return entry == null ? null : <OrderLoaded entry={entry} leave={leave} nowMs={nowMs} />;
}

function OrderLoaded({ entry, leave, nowMs }: { entry: PlanWithStanding; leave: () => void; nowMs: number }) {
    const db = useDatabase();
    const t = useTranslation();
    const m3 = useMaterialColors();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const { plan, purchase, standing } = entry;
    const account = useAccounts(db).find((row) => row.id === plan.accountId);
    const money = (value: number) => formatAmount(value, plan.currency, showCents, language);
    const planLine = orderPlanPhrase(t, standing.rows);
    const { cuotaSheetRef, deletePending, editing, pay, setEditing } = useOrderActions(entry, leave);
    const feeSuggestion = lateFeeSuggestion(standing);

    return (
        <View className="bg-m3-surface flex-1">
            <ScreenHeader title={orderName(t, purchase)} />
            <Stack.Screen.BackButton displayMode="minimal" />
            {standing.finished ? null : (
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Menu accessibilityLabel={t("installments.order")}>
                        <Stack.Toolbar.Icon {...toolbarIcon("more")} />
                        <Stack.Toolbar.MenuAction destructive onPress={deletePending}>
                            {t("installments.deletePending")}
                        </Stack.Toolbar.MenuAction>
                    </Stack.Toolbar.Menu>
                </Stack.Toolbar>
            )}
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}>
                <View className="items-center gap-1 pt-6 pb-4">
                    <MonoLabel>{t("installments.leftToPay")}</MonoLabel>
                    <HeroNumber amount={standing.remaining} code={plan.currency} showCents={showCents} sign="" />
                    {planLine ? <Text className="text-body text-m3-on-surface text-center">{planLine}</Text> : null}
                    {purchase ? (
                        <Text className="text-caption text-m3-on-surface-variant text-center">
                            {[
                                account?.name,
                                t("installments.bought", {
                                    date: formatSentenceDate(purchase.date, language),
                                    price: money(purchase.amount),
                                }),
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </Text>
                    ) : null}
                    {standing.next ? (
                        <View className="w-full flex-row gap-3 pt-5">
                            <View className="flex-1">
                                <FilledButton
                                    label={t("installments.pay", { amount: money(standing.next.remaining) })}
                                    onPress={() => pay(false)}
                                />
                            </View>
                            <View className="flex-1">
                                <Pressable
                                    accessibilityRole="button"
                                    android_ripple={{ color: withAlpha(m3.onSecondaryContainer, PRESSED_ALPHA) }}
                                    className="bg-m3-secondary-container h-14 items-center justify-center overflow-hidden rounded-full px-6"
                                    onPress={() => pay(true)}
                                >
                                    <Text
                                        className="font-sans-medium text-body text-m3-on-secondary-container"
                                        numberOfLines={1}
                                    >
                                        {t("installments.payAll", { amount: money(standing.remaining) })}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : null}
                    {feeSuggestion ? (
                        <FeeSuggestion
                            accountId={plan.accountId}
                            currency={plan.currency}
                            key={feeSuggestion.row.id}
                            row={feeSuggestion.row}
                            visible={feeSuggestion.visible}
                        />
                    ) : null}
                </View>

                <View className="pt-2 pb-2">
                    <Eyebrow colors={colors}>{t("installments.schedule")}</Eyebrow>
                </View>
                {standing.rows.map((row) => (
                    <ScheduleRow
                        count={standing.installmentsTotal}
                        isNext={row === standing.next}
                        key={row.row.id}
                        money={money}
                        nowMs={nowMs}
                        onPress={row.row.sequence === 0 ? undefined : () => setEditing({ ...row.row })}
                        row={row}
                    />
                ))}
            </ScrollView>
            <CuotaSheet
                accountId={plan.accountId}
                count={standing.installmentsTotal}
                currency={plan.currency}
                earliest={purchase?.date}
                onDismiss={() => setEditing(null)}
                ref={cuotaSheetRef}
                row={editing}
            />
        </View>
    );
}

interface ScheduleRowProps {
    count: number;
    isNext: boolean;
    money: (value: number) => string;
    nowMs: number;
    onPress?: () => void;
    row: InstallmentStanding<InstallmentRow>;
}

function ScheduleRow({ count, isNext, money, nowMs, onPress, row }: ScheduleRowProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { breakdown, status, when } = scheduleRowWording(t, language, row, { isNext, money, nowMs });
    const title = installmentTitle(t, row.row, count);
    const amount = money(row.owed);
    return (
        <ListItemFrame
            accessibilityLabel={[title, when, amount, breakdown, status?.text].filter(Boolean).join(", ")}
            accessibilityRole={onPress ? "button" : undefined}
            onPress={onPress}
            twoLine
        >
            <View className="flex-1">
                <ListItemText attention={row.overdue} supporting={[when]} title={title} />
            </View>
            <View className="items-end">
                <Text className="font-sans-medium text-body text-m3-on-surface leading-6 tabular-nums">{amount}</Text>
                {breakdown ? (
                    <Text className="text-caption text-m3-on-surface-variant leading-5 tabular-nums">{breakdown}</Text>
                ) : null}
                {status ? (
                    <Text className={`text-caption leading-5 ${STATUS_TONE[status.tone]}`}>{status.text}</Text>
                ) : null}
            </View>
        </ListItemFrame>
    );
}
