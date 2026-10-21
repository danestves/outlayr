import { Pressable, ScrollView, View } from "react-native";

import { HeroNumber } from "@/components/amount-text";
import { LedgerHead } from "@/components/ledger-head";
import type { LedgerCell } from "@/components/ledger-head";
import { MonoLabel } from "@/components/mono-label";
import { LinearGradient } from "@/components/styled";
import { Text } from "@/components/text";
import type { CategoryBreakdownEntry, CategoryMover, InsightsBucket } from "@/data/insights";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { CategoryBreakdownRow } from "./category-breakdown-row";
import { CategoryProportionBar } from "./category-proportion-bar";
import { InsightsBarChart } from "./insights-bar-chart";
import { InsightsMovers } from "./insights-movers";

const noop = () => undefined;

/** Frozen so the sample never changes and no bucket reads as pending. */
const FIXTURE_NOW = new Date(2026, 2, 31, 12, 0, 0, 0).getTime();

const DAILY_SPEND = [
    62.4, 0, 50.9, 121.75, 44.9, 0, 88.3, 27.6, 135.2, 51.4, 0, 73.85, 182.6, 34.1, 96.45, 0, 58.9, 112.35, 41.2, 0,
    67.75, 129.4, 23.85, 0, 84.6, 178.9, 36.25, 0, 92.15, 45.7, 0,
];

function marchBuckets(values: number[]): InsightsBucket[] {
    return values.map((value, index) => ({
        end: new Date(2026, 2, index + 2),
        label: String(index + 1),
        start: new Date(2026, 2, index + 1),
        value,
    }));
}

const DINING = { color: "#FF8A00", icon: "Restaurant01" } as const;
const GROCERIES = { color: "#34C759", icon: "ShoppingCart01" } as const;

const SAMPLE_BUCKETS: InsightsBucket[] = marchBuckets(DAILY_SPEND);

const sampleCells = (t: TranslateFn): LedgerCell[] => [
    {
        income: true,
        label: t("insights.measure.income"),
        magnitude: 3200,
        onPress: noop,
        positive: true,
    },
    {
        income: false,
        label: t("insights.measure.net"),
        magnitude: 1359.5,
        onPress: noop,
        positive: true,
    },
];

const sampleMovers = (t: TranslateFn): CategoryMover[] => [
    {
        color: DINING.color,
        delta: 180,
        emoji: null,
        fraction: 0.34,
        icon: DINING.icon,
        id: "dining",
        name: t("insights.sample.dining"),
    },
    {
        color: GROCERIES.color,
        delta: -95.4,
        emoji: null,
        fraction: -0.12,
        icon: GROCERIES.icon,
        id: "groceries",
        name: t("insights.sample.groceries"),
    },
];

const sampleBreakdown = (t: TranslateFn): CategoryBreakdownEntry[] => [
    {
        amount: 699.4,
        color: DINING.color,
        delta: null,
        emoji: null,
        fraction: 0.38,
        icon: DINING.icon,
        id: "dining",
        name: t("insights.sample.dining"),
    },
    {
        amount: 478.5,
        color: GROCERIES.color,
        delta: null,
        emoji: null,
        fraction: 0.26,
        icon: GROCERIES.icon,
        id: "groceries",
        name: t("insights.sample.groceries"),
    },
];

interface InsightsSampleProps {
    onAddTransaction: () => void;
}

/** Invented money: keeps its `Sample` marker in content, takes no touches, and is hidden from assistive tech. */
export function InsightsSample({ onAddTransaction }: InsightsSampleProps) {
    const colors = useColors();
    const t = useTranslation();
    const { language } = useLanguage();
    const breakdown = sampleBreakdown(t);

    return (
        // A fragment: UIKit hooks the large title to the first descendant scroll view.
        <>
            {/* A ScrollView that does not scroll: it exists for the large-title inset. */}
            <ScrollView
                accessibilityElementsHidden
                className="bg-background"
                contentInsetAdjustmentBehavior="automatic"
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                scrollEnabled={false}
            >
                <View className="px-5 pt-2">
                    <View className="bg-surface-secondary self-start rounded-full px-2 py-1">
                        <MonoLabel>{t("insights.sample.badge")}</MonoLabel>
                    </View>

                    <View className="flex-row items-center justify-between pt-3.5">
                        <MonoLabel>{`${t("insights.measure.spent")} · ${t("insights.sample.month")}`}</MonoLabel>
                        {/* Spending less is favourable, so income green. */}
                        <View
                            style={{
                                backgroundColor: withAlpha(colors.income, 0.2),
                                borderRadius: 6,
                                paddingHorizontal: 5,
                                paddingVertical: 2,
                            }}
                        >
                            <Text className="font-sans-semibold text-footnote" style={{ color: colors.income }}>
                                -12%
                            </Text>
                        </View>
                    </View>

                    <View className="pt-0.5">
                        <HeroNumber
                            amount={1840.5}
                            code="USD"
                            showCents
                            sign="-"
                            size={40}
                            toneClass="text-foreground"
                        />
                    </View>

                    <Text className="text-footnote text-muted pt-0.5">
                        {t("insights.sample.verdict", {
                            category: t("insights.sample.groceries"),
                            delta: formatAmount(251, "USD", true, language),
                            moved: formatAmount(95.4, "USD", true, language),
                        })}
                    </Text>

                    <View className="pt-3">
                        <LedgerHead cells={sampleCells(t)} code="USD" />
                    </View>

                    <View className="pt-4">
                        <InsightsBarChart
                            average={59}
                            buckets={SAMPLE_BUCKETS}
                            code="USD"
                            measure="spent"
                            nowMs={FIXTURE_NOW}
                            onCommit={noop}
                            onScrub={noop}
                            period="month"
                            selectedIndex={null}
                        />
                    </View>

                    <View className="pt-6">
                        <InsightsMovers
                            code="USD"
                            measure="spent"
                            movers={sampleMovers(t)}
                            priorLabel={t("insights.sample.priorLabel")}
                        />
                    </View>

                    <View className="pt-6">
                        <View className="pb-3">
                            <MonoLabel>{t("insights.categories")}</MonoLabel>
                        </View>
                        <View className="pb-1">
                            <CategoryProportionBar entries={breakdown} onSelect={noop} selectedId={null} />
                        </View>
                        <View className="pt-2">
                            {breakdown.map((entry) => (
                                <CategoryBreakdownRow
                                    code="USD"
                                    entry={entry}
                                    key={entry.id}
                                    measure="spent"
                                    showCents
                                />
                            ))}
                        </View>
                    </View>
                </View>
            </ScrollView>

            <LinearGradient
                className="absolute inset-0"
                colors={[
                    withAlpha(colors.background, 0),
                    withAlpha(colors.background, 0.03),
                    withAlpha(colors.background, 0.2),
                    withAlpha(colors.background, 0.55),
                    withAlpha(colors.background, 0.88),
                    colors.background,
                ]}
                locations={[0, 0.4, 0.56, 0.68, 0.78, 0.86]}
                pointerEvents="none"
            />

            {/* Clears the floating tab bar, as `FloatingAddButton` does. */}
            <View className="bottom-safe-offset-20 absolute right-0 left-0 items-center px-8">
                <Text className="font-sans-semibold text-body text-foreground pb-1 text-center">
                    {t("insights.sample.headline")}
                </Text>
                <Text className="text-footnote text-muted pb-5 text-center">{t("insights.sample.body")}</Text>
                <Pressable
                    accessibilityRole="button"
                    className="bg-accent rounded-full px-7 py-3.5 active:opacity-80"
                    onPress={onAddTransaction}
                >
                    <Text className="font-sans-semibold text-accent-foreground text-body">
                        {t("insights.sample.cta")}
                    </Text>
                </Pressable>
            </View>
        </>
    );
}
