import { useAtomValue } from "@effect/atom-react/Hooks";
import Tick02Icon from "@hugeicons-pro/core-solid-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { Button } from "panelui-native/components/button";
import type { ReactNode } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useNow } from "@/data/use-now";
import { formatChargeDate } from "@/domain/dates";
import type { ProStatus } from "@/domain/pro-status";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { expectHandoff } from "@/lib/app-handoff";
import { proTermAtom } from "@/lib/pro-status";
import { useColors } from "@/theme/use-colors";

import { useAccountLimit } from "./account-top";
import type { AccountTrigger } from "./account-top";
import { FeatureRows } from "./feature-rows";
import { LegalRow } from "./legal-row";
import { PaywallCta } from "./paywall-cta";
import { PaywallHero } from "./paywall-hero";
import { PlanCards } from "./plan-cards";
import { ctaLabel, thenLabel } from "./plan-copy";
import { PlanPicker } from "./plan-picker";
import { PurchaseFailure, SaleBlockers, UnconfirmedNotice } from "./sale-notices";
import { StoreTerms } from "./store-terms";
import type { TopBlock } from "./top-block";
import { TrialTimeline } from "./trial-timeline";
import { usePaywallFlow } from "./use-paywall-flow";

function Header({ subtitle, children }: { children?: ReactNode; subtitle: string }) {
    const t = useTranslation();
    return (
        <View className="pt-5">
            <Text
                accessibilityRole="header"
                className="text-foreground font-sans-bold text-[28px] leading-[34px] tracking-tight"
            >
                {t("pro.entry.title")}
            </Text>
            <View className="flex-row items-center gap-1.5 pt-1">
                {children}
                <Text className="text-muted text-subtitle flex-1">{subtitle}</Text>
            </View>
        </View>
    );
}

function AccountHeader({ trigger }: { trigger: AccountTrigger }) {
    return <Header subtitle={useAccountLimit(trigger).title} />;
}

/** The pitch stays the same for every trigger; only the line under the title says why the user is here. */
function PitchHeader({ autologUsed, block }: { autologUsed: number; block: TopBlock }) {
    const t = useTranslation();
    switch (block) {
        case "autolog": {
            return <Header subtitle={t("pro.top.autolog.title", { count: autologUsed })} />;
        }
        case "accounts":
        case "currencies":
        case "installment_apps": {
            return <AccountHeader trigger={block} />;
        }
        default: {
            return <Header subtitle={t("pro.subtitle")} />;
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
    return AsyncResult.getOrElse(useAtomValue(proTermAtom(configured)), () => ({ manageUrl: null, status: null }));
}

function ProHeader({ confirmed, status }: { confirmed: boolean; status: ProStatus | null }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const nowMs = useNow();
    return (
        <Header subtitle={statusLine(status, new Date(nowMs), t, language)}>
            {confirmed ? <HugeiconsIcon color={colors.income} icon={Tick02Icon} size={16} /> : null}
        </Header>
    );
}

export function PaywallRedesign() {
    const t = useTranslation();
    const largeText = useAccessibilityTextSize();
    const flow = usePaywallFlow("redesign");
    const { manageUrl, status } = useProTerm();
    const then = thenLabel(flow.plan, t);
    const trialDays = flow.canBuy ? (flow.plan?.trialDays ?? null) : null;

    const purchaseFooter = (
        <>
            <SaleBlockers needsAccount={flow.needsAccount} noCloud={flow.noCloud} />
            {flow.canBuy ? (
                <View className="px-5">
                    <PlanPicker
                        empty={flow.empty}
                        Choices={PlanCards}
                        onRetry={flow.retry}
                        onSelect={flow.select}
                        plans={flow.plans}
                        selected={flow.selected}
                    />
                    {trialDays === null ? null : <TrialTimeline trialDays={trialDays} />}
                </View>
            ) : null}
            {flow.canBuy ? <StoreTerms plan={flow.plan} /> : null}
            {flow.failure === null ? null : <PurchaseFailure message={t(flow.failure)} />}
            {flow.canBuy ? (
                <View className="px-5 pt-4">
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
                    {flow.block === "autolog" ? (
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
                        onPress={() => {
                            expectHandoff();
                            Linking.openURL(manageUrl);
                        }}
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
            <ScrollView
                className="flex-1"
                contentContainerClassName={largeText ? "pb-4" : "pb-2"}
                contentInsetAdjustmentBehavior="automatic"
            >
                <View className="px-5">
                    {flow.isPro ? (
                        <ProHeader confirmed={flow.isMirrored} status={status} />
                    ) : (
                        <>
                            <PaywallHero />
                            <PitchHeader autologUsed={flow.autolog.used} block={flow.block} />
                        </>
                    )}
                    <FeatureRows />
                </View>
                {largeText ? footer : null}
            </ScrollView>

            {largeText ? null : (
                <ScrollView bounces={false} className="shrink grow-0" contentContainerClassName="pb-safe-offset-4">
                    {footer}
                </ScrollView>
            )}
        </View>
    );
}
