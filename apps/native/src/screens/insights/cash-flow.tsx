import { useLocalSearchParams } from "expo-router";
import { SankeyChart } from "panelui-native/components/sankey-chart";
import { use, useState } from "react";
import { ScrollView, View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { LedgerHead } from "@/components/ledger-head";
import { MonoLabel } from "@/components/mono-label";
import { ROW_TYPE } from "@/components/row-type";
import { ScreenHeader } from "@/components/screen-header";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings, useSettingNumber } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { categoryBreakdownWithin } from "@/data/insights";
import { useInsights } from "@/data/use-insights";
import { useNow } from "@/data/use-now";
import { formatAmount, maskedAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { InsightsWindow } from "./components/insights-window";
import { cashFlow } from "./flow";
import { periodOf } from "./periods";

const SANKEY_HEIGHT = 280;
const KEPT_ICON = "PiggyBank";

function percent(part: number, whole: number) {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export function CashFlow() {
    const db = useDatabase();
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const hidden = use(AmountsHiddenContext);
    const currency = useGlobalCurrency(db);
    const { showCents } = useDisplaySettings().state;
    const nowMs = useNow();
    const params = useLocalSearchParams<{ offset?: string }>();
    const period = periodOf(useSettingNumber("insightsTimeFrame"));
    const calendar = {
        firstDayOfMonth: useSettingNumber("firstDayOfMonth"),
        firstWeekday: useSettingNumber("firstWeekday"),
    };
    const [offset, setOffset] = useState(() => Math.min(0, Number(params.offset) || 0));
    const result = useInsights(db, nowMs, period, "spent", offset, calendar);

    const money = (amount: number, cents = showCents) =>
        hidden ? maskedAmount(currency) : formatAmount(amount, currency, cents, language);
    const signed = (amount: number, positive: boolean) =>
        hidden ? maskedAmount(currency) : `${positive ? "+" : "-"}${money(amount)}`;
    const now = new Date(nowMs);
    const bounds = { end: result.end.getTime(), start: result.start.getTime() };
    const sources = categoryBreakdownWithin(result.rows, result.categoriesById, "income", bounds, now);
    const targets = categoryBreakdownWithin(result.rows, result.categoriesById, "spent", bounds, now);
    const { income, spent } = result;
    const net = income - spent;
    const over = net < 0;
    const basis = over ? spent : income;
    const empty = income === 0 && spent === 0;

    const flow = cashFlow({
        colors: { hub: colors.muted, kept: colors.income, other: colors.subtle, savings: colors.danger },
        income,
        names: {
            hubIn: t("insights.measure.income"),
            hubOut: t("insights.measure.spent"),
            kept: t("insights.cashFlow.kept"),
            other: t("insights.cashFlow.other"),
            savings: t("insights.cashFlow.savings"),
        },
        sources,
        spent,
        targets,
    });
    const labelOf = new Map(flow.nodes.map((node) => [node.id, node.label ?? node.id]));

    let sentence = t("insights.cashFlow.empty");
    if (over) {
        sentence = t("insights.cashFlow.overSentence", { amount: money(-net) });
    } else if (!empty) {
        sentence = t("insights.cashFlow.keptSentence", { percent: percent(net, income) });
        if (targets[0]) {
            sentence += ` ${t("insights.cashFlow.topSentence", { name: targets[0].name, percent: percent(targets[0].amount, income) })}`;
        }
    }

    const basisLabel = t(over ? "insights.cashFlow.ofOut" : "insights.cashFlow.ofIncome");

    return (
        <>
            <ScreenHeader title={t("insights.cashFlow.title")} />
            <ScrollView
                className="bg-background"
                contentContainerClassName="px-5 pb-8"
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-row pt-2">
                    <InsightsWindow
                        atCurrent={result.atCurrent}
                        atEarliest={result.atEarliest}
                        label={result.label}
                        onOffset={setOffset}
                    />
                </View>

                <View className="pt-3.5">
                    <LedgerHead
                        cells={[
                            { income: true, label: t("insights.cashFlow.in"), magnitude: income, positive: true },
                            { income: false, label: t("insights.cashFlow.out"), magnitude: spent, positive: false },
                            {
                                income: !over,
                                label: t(over ? "insights.cashFlow.savings" : "insights.cashFlow.kept"),
                                magnitude: Math.abs(net),
                                positive: !over,
                            },
                        ]}
                        code={currency}
                    />
                </View>

                <Text className="text-footnote text-foreground pt-1">{sentence}</Text>

                {empty ? null : (
                    <>
                        <View className="flex-row items-baseline justify-between gap-3 pt-6 pb-3">
                            <MonoLabel numberOfLines={1}>{t("insights.whereItWent")}</MonoLabel>
                            <MonoLabel numberOfLines={1}>
                                {t(over ? "insights.cashFlow.ofAmountOut" : "insights.cashFlow.ofAmountIn", {
                                    amount: money(basis, false),
                                })}
                            </MonoLabel>
                        </View>
                        <SankeyChart
                            accessibilityLabelForLink={(link) =>
                                t("insights.cashFlow.link", {
                                    amount: money(link.value),
                                    from: labelOf.get(link.source) ?? "",
                                    to: labelOf.get(link.target) ?? "",
                                })
                            }
                            height={SANKEY_HEIGHT}
                            links={flow.links}
                            nodes={flow.nodes}
                        >
                            <SankeyChart.Links />
                            <SankeyChart.Nodes />
                            <SankeyChart.Labels />
                            <SankeyChart.Tooltip formatValue={(value) => money(value, false)} />
                        </SankeyChart>

                        <FlowHeading basis={basisLabel} title={t("insights.cashFlow.wentTo")} />
                        {net > 0 ? (
                            <FlowRow
                                amount={signed(net, true)}
                                color={colors.income}
                                icon={KEPT_ICON}
                                income
                                name={t("insights.cashFlow.kept")}
                                share={net / basis}
                            />
                        ) : null}
                        {targets.map((entry) => (
                            <FlowRow
                                amount={signed(entry.amount, false)}
                                color={entry.color}
                                emoji={entry.emoji}
                                icon={entry.icon}
                                key={entry.id}
                                name={entry.name}
                                share={entry.amount / basis}
                            />
                        ))}

                        {sources.length > 0 ? (
                            <>
                                <FlowHeading
                                    basis={t("insights.cashFlow.ofIncome")}
                                    title={t("insights.cashFlow.cameFrom")}
                                />
                                {sources.map((entry) => (
                                    <FlowRow
                                        amount={signed(entry.amount, true)}
                                        color={entry.color}
                                        emoji={entry.emoji}
                                        icon={entry.icon}
                                        income
                                        key={entry.id}
                                        name={entry.name}
                                        share={entry.amount / income}
                                    />
                                ))}
                            </>
                        ) : null}
                    </>
                )}
            </ScrollView>
        </>
    );
}

function FlowHeading({ title, basis }: { basis: string; title: string }) {
    return (
        <View className="flex-row items-baseline justify-between gap-3 pt-7 pb-1.5">
            <MonoLabel numberOfLines={1}>{title}</MonoLabel>
            <MonoLabel numberOfLines={1}>{basis}</MonoLabel>
        </View>
    );
}

interface FlowRowProps {
    amount: string;
    color: string;
    emoji?: string | null;
    icon: string | null;
    income?: boolean;
    name: string;
    share: number;
}

function FlowRow({ amount, color, emoji = null, icon, income = false, name, share }: FlowRowProps) {
    const pct = Math.round(share * 100);
    return (
        <View accessibilityLabel={`${name}, ${amount}, ${pct}%`} accessible className="gap-1.5 py-1.5">
            <View className="flex-row items-center gap-2.5">
                <CategoryIconTile color={color} emoji={emoji} icon={icon} size={26} />
                <Text className={cn(ROW_TYPE.subtitle, "text-foreground flex-1")} numberOfLines={1}>
                    {name}
                </Text>
                <Text
                    className={cn(ROW_TYPE.subtitle, "tabular-nums", income ? "text-income" : "text-foreground")}
                    numberOfLines={1}
                >
                    {amount}
                </Text>
                <Text className="text-label text-muted min-w-[34px] text-right font-mono">{`${pct}%`}</Text>
            </View>
            <View className="bg-border ml-9 h-1 overflow-hidden rounded-full">
                <View
                    className="h-full rounded-full"
                    style={{ backgroundColor: color, width: `${Math.min(100, pct)}%` }}
                />
            </View>
        </View>
    );
}
