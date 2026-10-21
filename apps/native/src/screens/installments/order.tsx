import { Stack } from "expo-router";
import { Button } from "panelui-native/components/button";
import { Pressable, ScrollView, View } from "react-native";

import { HeroNumber } from "@/components/amount-text";
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

import { CuotaSheet } from "./cuota-sheet";
import { FeeSuggestion } from "./fee-suggestion";
import { installmentTitle, lateFeeSuggestion, scheduleRowWording } from "./labels";
import { useInstallmentEntry, useOrderActions } from "./use-order";

export function InstallmentOrder({ planId }: { planId: string }) {
    const { entry, leave, nowMs } = useInstallmentEntry(planId);
    return entry == null ? null : <OrderLoaded entry={entry} leave={leave} nowMs={nowMs} />;
}

function OrderLoaded({ entry, leave, nowMs }: { entry: PlanWithStanding; leave: () => void; nowMs: number }) {
    const db = useDatabase();
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const { plan, purchase, standing } = entry;
    const account = useAccounts(db).find((row) => row.id === plan.accountId);
    const money = (value: number) => formatAmount(value, plan.currency, showCents, language);
    const name = orderName(t, purchase);
    const planLine = orderPlanPhrase(t, standing.rows);
    const { cuotaSheetRef, deletePending, editing, pay, setEditing } = useOrderActions(entry, leave);
    const feeSuggestion = lateFeeSuggestion(standing);

    return (
        <>
            <ScreenHeader title={name} />
            <Stack.Screen.BackButton displayMode="minimal" />
            {standing.finished ? null : (
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Menu accessibilityLabel={t("installments.order")}>
                        <Stack.Toolbar.Icon {...toolbarIcon("more")} />
                        <Stack.Toolbar.MenuAction destructive icon="trash" onPress={deletePending}>
                            {t("installments.deletePending")}
                        </Stack.Toolbar.MenuAction>
                    </Stack.Toolbar.Menu>
                </Stack.Toolbar>
            )}
            <ScrollView
                className="bg-background"
                contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
                contentInsetAdjustmentBehavior="automatic"
            >
                <View className="gap-1 pt-6">
                    <MonoLabel>{t("installments.leftToPay")}</MonoLabel>
                    <HeroNumber amount={standing.remaining} code={plan.currency} showCents={showCents} sign="" />
                    {planLine ? <Text className="text-foreground text-subtitle">{planLine}</Text> : null}
                    {purchase ? (
                        <Text className="text-muted text-subtitle">
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
                </View>

                {standing.next ? (
                    <View className="flex-row gap-2.5 pt-5">
                        <Button className="flex-1 rounded-full" onPress={() => pay(false)} size="md" variant="primary">
                            {t("installments.pay", { amount: money(standing.next.remaining) })}
                        </Button>
                        <Button className="flex-1 rounded-full" onPress={() => pay(true)} size="md" variant="secondary">
                            {t("installments.payAll", { amount: money(standing.remaining) })}
                        </Button>
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

                <MonoLabel accessibilityRole="header" className="pt-7 pb-1.5">
                    {t("installments.schedule")}
                </MonoLabel>
                <View className="border-border border-t">
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
                </View>
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
        </>
    );
}

const STATUS_TONE = { overdue: "text-expense", paid: "text-income", partial: "text-muted" } as const;

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
    return (
        <Pressable
            accessibilityRole={onPress ? "button" : undefined}
            className="border-border flex-row items-center gap-3 border-b py-3 active:opacity-60"
            disabled={!onPress}
            onPress={onPress}
        >
            <View className="flex-1 gap-0.5">
                <Text className="text-body text-foreground">{installmentTitle(t, row.row, count)}</Text>
                <Text className={row.overdue ? "text-expense text-subtitle" : "text-muted text-subtitle"}>{when}</Text>
            </View>
            <View className="items-end gap-0.5">
                <Text className="text-body text-foreground tabular-nums">{money(row.owed)}</Text>
                {breakdown ? <Text className="text-muted text-subtitle tabular-nums">{breakdown}</Text> : null}
                {status ? <Text className={`${STATUS_TONE[status.tone]} text-subtitle`}>{status.text}</Text> : null}
            </View>
        </Pressable>
    );
}
