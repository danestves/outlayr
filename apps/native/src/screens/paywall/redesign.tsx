import { useAtomValue } from "@effect/atom-react/Hooks";
import Tick02Icon from "@hugeicons-pro/core-solid-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Button } from "panelui-native/components/button";
import { Pressable, ScrollView, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useLedgerStats } from "@/data/ledger-stats";
import type { LedgerStats } from "@/data/ledger-stats";
import { useNow } from "@/data/use-now";
import { formatChargeDate } from "@/domain/dates";
import type { ProStatus } from "@/domain/pro-status";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { proTermAtom, UNKNOWN_PRO_TERM } from "@/lib/pro-status";
import { openWebLink } from "@/lib/web-link";
import { useColors } from "@/theme/use-colors";

import { useAccountLimit } from "./account-top";
import type { AccountTrigger } from "./account-top";
import { FeatureRows } from "./feature-rows";
import { LegalRow } from "./legal-row";
import { MonthAhead } from "./month-ahead";
import { daysLeftInMonth } from "./month-grid";
import { PaywallCta } from "./paywall-cta";
import { PaywallHero } from "./paywall-hero";
import { ctaLabel, thenLabel } from "./plan-copy";
import { PlanPicker } from "./plan-picker";
import { PlanRows } from "./plan-rows";
import { ProBand } from "./pro-band";
import { PurchaseFailure, SaleBlockers, UnconfirmedNotice } from "./sale-notices";
import { StoreTerms } from "./store-terms";
import type { TopBlock } from "./top-block";
import { usePaywallFlow } from "./use-paywall-flow";

function statsLine(stats: LedgerStats, autologged: number, t: TranslateFn): string | null {
    if (stats.entries === 0) {
        return null;
    }
    return [
        t("pro.stats.entries", { count: stats.entries }),
        t("pro.stats.days", { count: stats.days }),
        autologged > 0 ? t("pro.stats.autolog", { count: autologged }) : null,
    ]
        .filter((part): part is string => part !== null)
        .join(" · ");
}

interface BandCopy {
    stats: string | null;
    title: string;
}

function AccountBand({ trigger, ...band }: BandCopy & { trigger: AccountTrigger }) {
    return <ProBand {...band} subtitle={useAccountLimit(trigger).title} />;
}

function PitchBand({
    autolog,
    block,
    daysLeft,
    stats,
}: {
    autolog: { cap: number; total: number; used: number };
    block: TopBlock;
    daysLeft: number;
    stats: LedgerStats;
}) {
    const t = useTranslation();
    const band: BandCopy = {
        stats: statsLine(stats, autolog.total, t),
        title: block === "autolog" && daysLeft > 0 ? t("pro.band.month", { count: daysLeft }) : t("pro.band.moment"),
    };
    switch (block) {
        case "accounts":
        case "currencies":
        case "installment_apps": {
            return <AccountBand trigger={block} {...band} />;
        }
        case "autolog": {
            return <ProBand {...band} subtitle={t("pro.band.monthUsed", { cap: autolog.cap, used: autolog.used })} />;
        }
        case "first_entry": {
            return <ProBand {...band} subtitle={t("pro.top.firstEntry")} />;
        }
        default: {
            return <ProBand {...band} subtitle={t("pro.subtitle")} />;
        }
    }
}

function statusLine(status: ProStatus | null, now: Date, t: TranslateFn, language: Language) {
    if (status === null) {
        return t("pro.alreadyActive");
    }
    if (status.kind === "lifetime") {
        return t("pro.status.lifetime");
    }
    return t(`pro.status.${status.kind}`, { date: formatChargeDate(status.on, now, language) });
}

function useProTerm() {
    const configured = useRevenueCat().kind !== "unconfigured";
    return AsyncResult.getOrElse(useAtomValue(proTermAtom(configured)), () => UNKNOWN_PRO_TERM);
}

function ProStatusBand({ confirmed, status }: { confirmed: boolean; status: ProStatus | null }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const nowMs = useNow();
    return (
        <ProBand
            eyebrow={false}
            lead={confirmed ? <HugeiconsIcon color={colors.proForeground} icon={Tick02Icon} size={16} /> : null}
            subtitle={statusLine(status, new Date(nowMs), t, language)}
            title={t("pro.entry.title")}
        />
    );
}

function KeepsLine() {
    const t = useTranslation();
    const colors = useColors();
    return (
        <View className="flex-row items-center justify-center gap-2 pb-3">
            <HugeiconsIcon color={colors.income} icon={Tick02Icon} size={16} />
            <Text className="text-foreground text-body shrink">{t("pro.band.keeps")}</Text>
        </View>
    );
}

export function PaywallRedesign() {
    const t = useTranslation();
    const largeText = useAccessibilityTextSize();
    const flow = usePaywallFlow("redesign");
    const now = useNow();
    const stats = useLedgerStats(useDatabase(), now);
    const { manageUrl, status } = useProTerm();
    const then = thenLabel(flow.plan, t);
    const daysLeft = daysLeftInMonth(new Date(now));
    const showMonth = flow.block === "autolog" && daysLeft > 0;
    const monthLabel =
        flow.autolog.used >= flow.autolog.cap
            ? t("pro.band.ranOut")
            : t("pro.band.freeLeft", { count: flow.autolog.cap - flow.autolog.used });

    const purchaseFooter = (
        <>
            <SaleBlockers empty={flow.empty} needsAccount={flow.needsAccount} noCloud={flow.noCloud} />
            {flow.canBuy ? (
                <View className="px-5">
                    <PlanPicker
                        empty={flow.empty}
                        Choices={PlanRows}
                        onRetry={flow.retry}
                        onSelect={flow.select}
                        plans={flow.plans}
                        selected={flow.selected}
                    />
                </View>
            ) : null}
            {flow.canBuy ? <StoreTerms plan={flow.plan} /> : null}
            {flow.failure === null ? null : <PurchaseFailure message={t(flow.failure)} />}
            {flow.canBuy ? (
                <View className="px-5 pt-3">
                    <KeepsLine />
                    <PaywallCta
                        busy={flow.busy === "buy"}
                        busyLabel={t("pro.cta.unlocking")}
                        disabled={flow.plan === null || flow.busy !== null}
                        label={
                            flow.logsWaiting
                                ? t("pro.cta.logAll", { count: flow.autolog.waiting })
                                : ctaLabel(flow.plan, t)
                        }
                        onPress={flow.buy}
                        testID="paywall-cta"
                    />
                    {then === null ? null : (
                        <MonoLabel className="pt-2 text-center">{`${then} · ${t("pro.cta.cancelAnytime")}`}</MonoLabel>
                    )}
                    {flow.block === "autolog" || flow.block === "first_entry" ? (
                        <Pressable accessibilityRole="button" className="items-center pt-4" onPress={flow.leave}>
                            <MonoLabel className="text-foreground">{t("pro.cta.notNow")}</MonoLabel>
                        </Pressable>
                    ) : null}
                </View>
            ) : null}
        </>
    );

    const proFooter = (
        <>
            {manageUrl === null ? null : (
                <View className="px-5 pt-5">
                    <Button
                        className="rounded-full"
                        fullWidth
                        onPress={() => openWebLink(manageUrl)}
                        size="md"
                        testID="paywall-manage"
                        variant="secondary"
                    >
                        {t("pro.play.manage")}
                    </Button>
                </View>
            )}
            {flow.isMirrored || flow.failure !== null ? null : (
                <View className="items-center gap-3 px-5 pt-5">
                    <UnconfirmedNotice
                        checking={flow.busy === "confirm"}
                        disabled={flow.busy !== null}
                        onConfirm={flow.confirm}
                    />
                </View>
            )}
            {flow.failure === null ? null : <PurchaseFailure message={t(flow.failure)} />}
        </>
    );

    const footer = (
        <>
            {flow.isPro ? proFooter : purchaseFooter}
            <LegalRow
                canRestore={!flow.needsAccount}
                disabled={flow.busy !== null}
                onRestore={flow.restore}
                restoring={flow.busy === "restore"}
            />
        </>
    );

    return (
        <View className="bg-background flex-1">
            <View className="bg-pro absolute inset-x-0 top-0 h-1/2" />
            <ScrollView
                className="flex-1"
                contentContainerClassName={largeText ? "grow pb-4" : "grow"}
                contentInsetAdjustmentBehavior="automatic"
            >
                {flow.isPro ? (
                    <ProStatusBand confirmed={flow.isMirrored} status={status} />
                ) : (
                    <PitchBand autolog={flow.autolog} block={flow.block} daysLeft={daysLeft} stats={stats} />
                )}
                <View className="bg-background grow px-5 pb-4">
                    {flow.isPro ? <FeatureRows /> : null}
                    {!flow.isPro && showMonth ? <MonthAhead label={monthLabel} now={now} /> : null}
                    {!flow.isPro && !showMonth ? <PaywallHero /> : null}
                </View>
                {largeText ? <View className="bg-background">{footer}</View> : null}
            </ScrollView>

            {largeText ? null : (
                <ScrollView
                    bounces={false}
                    className="bg-background shrink grow-0"
                    contentContainerClassName="pb-safe-offset-4"
                >
                    {footer}
                </ScrollView>
            )}
        </View>
    );
}
