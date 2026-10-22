import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { Account } from "@/data/accounts-core";
import { useInstallmentPlans } from "@/data/installments";
import { upcomingInstallments } from "@/data/installments-core";
import type { PlanWithStanding, UpcomingInstallment } from "@/data/installments-core";
import type { Database } from "@/db/client";
import { formatSentenceDate } from "@/domain/dates";
import { orderName } from "@/domain/installments";
import { isInstallmentAppAccount } from "@/domain/institution-map";
import { addLocalDays } from "@/domain/local-day";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { dueIn } from "@/screens/installments/labels";
import { useScreenshotImport } from "@/screens/installments/use-screenshot-import";

/** How far ahead "Coming up" looks: a monthly plan's next cuota is always inside it. */
const COMING_UP_DAYS = 31;

export function InstallmentSections({ account, db, nowMs }: { account: Account; db: Database; nowMs: number }) {
    const router = useRouter();
    const t = useTranslation();
    const plans = useInstallmentPlans(db, nowMs, account.id);
    const upcoming = useMemo(
        () => upcomingInstallments(plans, new Date(addLocalDays(nowMs, COMING_UP_DAYS))),
        [plans, nowMs]
    );
    const [showFinished, setShowFinished] = useState(false);
    const importScreenshot = useScreenshotImport(account.id);
    if (plans.length === 0 && !isInstallmentAppAccount(account)) {
        return null;
    }
    const open = plans.filter(({ standing }) => !standing.finished);
    const finished = plans.filter(({ standing }) => standing.finished);

    return (
        <Animated.View className="self-stretch pt-4" layout={LinearTransition}>
            <MonoLabel accessibilityRole="header" className="pb-1.5">
                {t("installments.orders")}
            </MonoLabel>
            <View className="border-border border-t">
                {open.map((entry) => (
                    <OrderRow entry={entry} key={entry.plan.id} />
                ))}
                {finished.length > 0 ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: showFinished }}
                        className="border-border border-b py-3 active:opacity-60"
                        onPress={() => setShowFinished((shown) => !shown)}
                    >
                        <Text className="text-muted text-subtitle">
                            {t("installments.finished", { count: finished.length })}
                        </Text>
                    </Pressable>
                ) : null}
                {showFinished ? finished.map((entry) => <OrderRow entry={entry} key={entry.plan.id} />) : null}
                <Pressable
                    accessibilityRole="button"
                    className="border-border border-b py-3 active:opacity-60"
                    onPress={() =>
                        router.push({
                            params: { accountId: account.id, installments: "1" },
                            pathname: "/transactions/create",
                        })
                    }
                >
                    <Text className="text-tint text-body">{t("installments.newPurchase")}</Text>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    className="border-border border-b py-3 active:opacity-60"
                    onPress={importScreenshot}
                >
                    <Text className="text-tint text-body">{t("installments.scan.import")}</Text>
                </Pressable>
            </View>

            {upcoming.length > 0 ? (
                <>
                    <MonoLabel accessibilityRole="header" className="pt-6 pb-1.5">
                        {t("installments.comingUp")}
                    </MonoLabel>
                    <View className="border-border border-t">
                        {upcoming.map((item) => (
                            <ComingUpRow item={item} key={item.standing.row.id} nowMs={nowMs} plans={plans} />
                        ))}
                    </View>
                </>
            ) : null}
        </Animated.View>
    );
}

function OrderRow({ entry }: { entry: PlanWithStanding }) {
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const { plan, purchase, standing } = entry;
    const { next } = standing;
    let detail = t("installments.paid");
    if (next?.overdue) {
        detail = t("installments.overdue");
    } else if (next) {
        detail = t("installments.next", { date: formatSentenceDate(next.row.dueDate, language) });
    }
    return (
        <Pressable
            accessibilityRole="button"
            className="border-border flex-row items-center gap-3 border-b py-3 active:opacity-60"
            onPress={() => router.push({ params: { planId: plan.id }, pathname: "/installments/[planId]" })}
        >
            <View className="flex-1 gap-0.5">
                <Text className="text-body text-foreground" numberOfLines={1}>
                    {orderName(t, purchase)}
                </Text>
                <Text className={next?.overdue ? "text-expense text-subtitle" : "text-muted text-subtitle"}>
                    {detail}
                </Text>
            </View>
            <Text className="text-body text-foreground tabular-nums">
                {formatAmount(standing.remaining, plan.currency, showCents, language)}
            </Text>
        </Pressable>
    );
}

function ComingUpRow({
    item,
    nowMs,
    plans,
}: {
    item: UpcomingInstallment;
    nowMs: number;
    plans: readonly PlanWithStanding[];
}) {
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const { row, overdue, remaining } = item.standing;
    const count = plans.find(({ plan }) => plan.id === item.planId)?.standing.installmentsTotal ?? row.sequence;
    const title =
        row.sequence === 0
            ? `${orderName(t, item.purchase)} · ${t("installments.upfront")}`
            : t("installments.forOrder", { count, index: row.sequence, order: orderName(t, item.purchase) });
    const when = overdue
        ? `${formatSentenceDate(row.dueDate, language)} · ${t("installments.overdue")}`
        : [formatSentenceDate(row.dueDate, language), dueIn(t, row.dueDate, nowMs)].filter(Boolean).join(" · ");
    return (
        <View className="border-border flex-row items-center gap-3 border-b py-3">
            <View className="flex-1 gap-0.5">
                <Text className="text-body text-foreground" numberOfLines={1}>
                    {title}
                </Text>
                <Text className={overdue ? "text-expense text-subtitle" : "text-muted text-subtitle"}>{when}</Text>
            </View>
            <Text className="text-body text-foreground tabular-nums">
                {formatAmount(remaining, item.currency, showCents, language)}
            </Text>
            <Pressable
                accessibilityLabel={`${t("installments.paidAction")}, ${title}`}
                accessibilityRole="button"
                className="py-1.5 pl-2 active:opacity-60"
                hitSlop={10}
                onPress={() =>
                    router.push({ params: { all: "0", planId: item.planId }, pathname: "/installments/pay" })
                }
            >
                <Text className="font-sans-semibold text-tint text-body">{t("installments.paidAction")}</Text>
            </Pressable>
        </View>
    );
}
