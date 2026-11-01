import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import type { useAutologUsage } from "@/data/autolog-cap";
import { APP_ICONS } from "@/domain/app-icons";
import {
    FREE_ACCOUNTS,
    FREE_AUTOLOG_PER_MONTH,
    FREE_BUDGETS,
    FREE_CURRENCIES,
    FREE_INSTALLMENT_APPS,
    FREE_PAYOFF_PLANS,
} from "@/domain/pro-limits";
import { LARGEST_STANDARD_FONT_SCALE, useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useTranslation } from "@/i18n/context";
import { alternateIconsSupported } from "@/lib/app-icon";

import { AccountTop } from "./account-top";
import { AlsoRows } from "./also-rows";
import { AutologTop } from "./autolog-top";
import { LegalRow } from "./legal-row";
import { PaywallCta } from "./paywall-cta";
import { ctaLabel, thenLabel } from "./plan-copy";
import { PlanList } from "./plan-list";
import { PlanPicker } from "./plan-picker";
import { PurchaseFailure, SaleBlockers, UnconfirmedNotice } from "./sale-notices";
import { StoreTerms } from "./store-terms";
import { alsoRowsFor } from "./top-block";
import type { TopBlock } from "./top-block";
import { usePaywallFlow } from "./use-paywall-flow";

const UNLIMITED = "\u221E";

function Row({ label, free, pro }: { free: string; label: string; pro: string }) {
    const t = useTranslation();
    const spoken = (value: string) => (value === UNLIMITED ? t("pro.value.unlimited") : value);
    return (
        <View
            accessibilityLabel={t("pro.a11y.row", { feature: label, free: spoken(free), pro: spoken(pro) })}
            accessible
            className="border-border flex-row items-center border-b py-2.5"
        >
            <Text className="text-foreground text-subtitle flex-1">{label}</Text>
            <Text className="text-muted text-footnote w-[74px] text-right font-mono tabular-nums">{free}</Text>
            <Text className="text-income text-footnote w-[74px] text-right font-mono tabular-nums">{pro}</Text>
        </View>
    );
}

function Comparison() {
    const t = useTranslation();
    return (
        <View className="pt-4">
            <View className="flex-row items-baseline pb-1.5">
                <View className="flex-1" />
                <MonoLabel
                    className="w-[74px] text-right"
                    maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                    numberOfLines={1}
                >
                    {t("pro.col.free")}
                </MonoLabel>
                <MonoLabel
                    className="text-foreground w-[74px] text-right"
                    maxFontSizeMultiplier={LARGEST_STANDARD_FONT_SCALE}
                    numberOfLines={1}
                >
                    {t("pro.col.pro")}
                </MonoLabel>
            </View>
            <View className="border-foreground border-t">
                <Row free={String(FREE_AUTOLOG_PER_MONTH)} label={t("pro.row.autolog")} pro={UNLIMITED} />
                <Row free="20" label={t("pro.row.captures")} pro="500" />
                <Row free={String(FREE_ACCOUNTS)} label={t("pro.row.accounts")} pro={UNLIMITED} />
                <Row free={String(FREE_INSTALLMENT_APPS)} label={t("pro.row.installmentApps")} pro={UNLIMITED} />
                <Row free={String(FREE_PAYOFF_PLANS)} label={t("pro.row.payoffPlans")} pro={UNLIMITED} />
                <Row free={String(FREE_BUDGETS)} label={t("pro.row.budgets")} pro={UNLIMITED} />
                <Row free={String(FREE_CURRENCIES)} label={t("pro.row.currencies")} pro={UNLIMITED} />
                <Row free={t("pro.value.off")} label={t("pro.row.devices")} pro={t("pro.value.on")} />
                <Row free={t("pro.value.off")} label={t("pro.row.photos")} pro={t("pro.value.on")} />
                <Row free={t("pro.value.off")} label={t("pro.row.import")} pro={t("pro.value.on")} />
                <Row free={t("pro.value.off")} label={t("pro.row.notion")} pro={t("pro.value.on")} />
                <Row free={t("pro.value.off")} label={t("pro.row.lookup")} pro={t("pro.value.web")} />
                {alternateIconsSupported ? (
                    <Row free="1" label={t("pro.row.icons")} pro={String(APP_ICONS.length)} />
                ) : null}
            </View>
        </View>
    );
}

function SeeEverything() {
    const t = useTranslation();
    const [open, setOpen] = useState(false);
    return (
        <View className="pt-4">
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpen((shown) => !shown)}
                testID="paywall-see-all"
            >
                <MonoLabel className="text-foreground">{t("pro.see.all")}</MonoLabel>
            </Pressable>
            {open ? <Comparison /> : null}
        </View>
    );
}

function TopBlockView({ autolog, block }: { autolog: ReturnType<typeof useAutologUsage>; block: TopBlock }) {
    const t = useTranslation();
    switch (block) {
        case "autolog": {
            return <AutologTop usage={autolog} />;
        }
        case "accounts":
        case "currencies":
        case "installment_apps": {
            return <AccountTop trigger={block} />;
        }
        default: {
            return (
                <View className="pt-2">
                    <MonoLabel>{t("pro.eyebrow")}</MonoLabel>
                    <Text className="text-foreground text-title font-sans-semibold pt-2 tracking-tight">
                        {t("pro.top.generic")}
                    </Text>
                </View>
            );
        }
    }
}

export function Paywall() {
    const t = useTranslation();
    const largeText = useAccessibilityTextSize();
    const {
        autolog,
        block,
        busy,
        buy,
        canBuy,
        confirm,
        empty,
        failure,
        isMirrored,
        isPro,
        leave,
        logsWaiting,
        needsAccount,
        noCloud,
        pitches,
        plan,
        plans,
        restore,
        retry,
        select,
        selected,
    } = usePaywallFlow("control");
    const then = thenLabel(plan, t);

    const footer = (
        <>
            <SaleBlockers needsAccount={needsAccount} noCloud={noCloud} />
            {canBuy ? (
                <View className="px-5">
                    <PlanPicker
                        empty={empty}
                        Choices={PlanList}
                        onRetry={retry}
                        onSelect={select}
                        plans={plans}
                        selected={selected}
                    />
                </View>
            ) : null}
            {canBuy || isPro ? <StoreTerms plan={canBuy ? plan : null} /> : null}
            {isPro && failure === null ? (
                <View className="items-center gap-3 px-5 pt-5">
                    {isMirrored ? (
                        <Text className="text-income text-subtitle text-center">{t("pro.alreadyActive")}</Text>
                    ) : (
                        <UnconfirmedNotice checking={busy === "confirm"} disabled={busy !== null} onConfirm={confirm} />
                    )}
                </View>
            ) : null}

            {failure === null ? null : <PurchaseFailure message={t(failure)} />}

            {canBuy ? (
                <View className="px-5 pt-5">
                    <PaywallCta
                        busy={busy === "buy"}
                        busyLabel={t("pro.cta.unlocking")}
                        disabled={plan === null || busy !== null}
                        label={logsWaiting ? t("pro.cta.logAll", { count: autolog.waiting }) : ctaLabel(plan, t)}
                        onPress={buy}
                        testID="paywall-cta"
                    />
                    {then === null ? null : (
                        <Text className="text-muted text-micro pt-2 text-center font-mono">{then}</Text>
                    )}
                    {block === "autolog" ? (
                        <Pressable accessibilityRole="button" className="items-center pt-4" onPress={leave}>
                            <MonoLabel className="text-foreground">{t("pro.cta.notNow")}</MonoLabel>
                        </Pressable>
                    ) : null}
                </View>
            ) : null}

            <LegalRow
                canRestore={!needsAccount}
                disabled={busy !== null}
                onRestore={restore}
                restoring={busy === "restore"}
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
                {pitches ? (
                    <View className="px-5">
                        <TopBlockView autolog={autolog} block={block} />
                        <AlsoRows rows={alsoRowsFor(block)} />
                        <SeeEverything />
                    </View>
                ) : (
                    <View className="px-5">
                        <View className="pt-2">
                            <MonoLabel>{t("pro.eyebrow")}</MonoLabel>
                            <Text className="text-foreground text-title font-sans-semibold pt-2 tracking-tight">
                                {t("pro.title")}
                            </Text>
                        </View>
                        <Comparison />
                    </View>
                )}
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
