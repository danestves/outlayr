import type { MenuAction } from "@expo/ui/community/menu";
import * as Cause from "effect/Cause";
import { useRouter } from "expo-router";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { HeroNumber } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { LedgerHead } from "@/components/ledger-head";
import type { LedgerCell } from "@/components/ledger-head";
import { MonoLabel } from "@/components/mono-label";
import { ScopeChip } from "@/components/scope-chip";
import { Text } from "@/components/text";
import { useDisplaySettings, useSettingBool, useSettingNumber } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useNetWorth } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import {
    bucketDateLabel,
    categoryBreakdownWithin,
    categoryBuckets,
    elapsedSlots,
    periodTotal,
    runningTotals,
    subcategoryBreakdown,
    subcategoryBreakdownWithin,
} from "@/data/insights";
import type {
    CategoryBreakdownEntry,
    CategoryMeta,
    InsightsBucket,
    InsightsCalendar,
    InsightsContribution,
    InsightsMeasure,
    InsightsPeriod,
} from "@/data/insights";
import { useWindowTransactions } from "@/data/insights-transactions";
import { useSpendingCalendar } from "@/data/spending-calendar";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useInsights } from "@/data/use-insights";
import type { UseInsightsResult } from "@/data/use-insights";
import { useNow } from "@/data/use-now";
import { debtsOverview } from "@/domain/debts";
import {
    insightsMeasureAlternatives,
    insightsMeasureFromStored,
    insightsMeasureIsIncome,
    insightsMeasureIsPositive,
    insightsMeasureMagnitude,
    netTotal,
    storedInsightsMeasure,
} from "@/domain/insights-measure";
import type { InsightsTotals } from "@/domain/insights-measure";
import { quietAlternative } from "@/domain/insights-quiet";
import { insightsVerdict } from "@/domain/insights-verdict";
import { formatAmount } from "@/domain/money";
import { recapRowVisible } from "@/domain/recap-month";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { SILENT } from "@/state/atom-command";
import { setNumberSettingCommand } from "@/state/settings-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { CategoryBreakdownRow } from "./components/category-breakdown-row";
import { CategoryProportionBar } from "./components/category-proportion-bar";
import { InsightsBarChart } from "./components/insights-bar-chart";
import { InsightsNetChart } from "./components/insights-net-chart";
import { InsightsPeriodMenu } from "./components/insights-period-menu";
import { InsightsQuiet } from "./components/insights-quiet";
import { InsightsSample } from "./components/insights-sample";
import { InsightsTransactionList } from "./components/insights-transaction-list";
import { NetWorthCard } from "./components/net-worth-card";
import { RecapRow } from "./components/recap-row";
import { SpendingCalendar } from "./components/spending-calendar";
import { WindowStepper } from "./components/window-stepper";
import { heroMagnitudeFor, heroPositiveFor } from "./hero";
import { MEASURE_KEY } from "./measure-label";
import { PERIODS } from "./periods";

function bucketAt(buckets: readonly InsightsBucket[], index: number | null): InsightsBucket | null {
    if (index == null) {
        return null;
    }
    return buckets[index] ?? null;
}

/** Epoch ms. */
interface BucketBounds {
    end: number;
    start: number;
}

function boundsOf(bucket: InsightsBucket): BucketBounds {
    return { end: bucket.end.getTime(), start: bucket.start.getTime() };
}

function breakdownFor(
    windowBreakdown: CategoryBreakdownEntry[],
    rows: readonly InsightsContribution[],
    categoriesById: ReadonlyMap<string, CategoryMeta>,
    lockedBucket: InsightsBucket | null,
    measure: InsightsMeasure,
    nowMs: number
): CategoryBreakdownEntry[] {
    if (!lockedBucket) {
        return windowBreakdown;
    }
    return categoryBreakdownWithin(rows, categoriesById, measure, boundsOf(lockedBucket), new Date(nowMs));
}

function subBreakdownFor(
    rows: readonly InsightsContribution[],
    categoriesById: ReadonlyMap<string, CategoryMeta>,
    filterId: string | null,
    lockedBucket: InsightsBucket | null,
    period: InsightsPeriod,
    measure: InsightsMeasure,
    nowMs: number,
    offset: number,
    calendar: InsightsCalendar
): CategoryBreakdownEntry[] {
    if (filterId == null) {
        return [];
    }
    if (lockedBucket) {
        return subcategoryBreakdownWithin(
            rows,
            categoriesById,
            filterId,
            measure,
            boundsOf(lockedBucket),
            new Date(nowMs)
        );
    }
    return subcategoryBreakdown(rows, categoriesById, filterId, period, measure, new Date(nowMs), offset, calendar);
}

function withoutLoneDirect(entries: CategoryBreakdownEntry[], filterId: string | null): CategoryBreakdownEntry[] {
    return entries.length === 1 && entries[0].id === filterId ? [] : entries;
}

/** A bare date would read as that day's own net, not the running position. */
function eyebrowLabel(
    scrubBucket: InsightsBucket | null,
    isNet: boolean,
    period: InsightsPeriod,
    measure: InsightsMeasure,
    t: TranslateFn
): string {
    if (!scrubBucket) {
        return t(MEASURE_KEY[measure]);
    }
    const prefix = isNet ? `${t("insights.balance")} · ` : "";
    return `${prefix}${bucketDateLabel(period, scrubBucket.start)}`;
}

/** Null keeps both directions, which is what the net measure reads. */
function listDirection(measure: InsightsMeasure): boolean | null {
    if (measure === "income") {
        return true;
    }
    if (measure === "spent") {
        return false;
    }
    return null;
}

function windowQuery(
    lockedBucket: InsightsBucket | null,
    filterId: string | null,
    measure: InsightsMeasure,
    nowMs: number,
    windowStart: Date,
    windowEnd: Date
) {
    if (!(lockedBucket || filterId)) {
        return null;
    }
    return {
        categoryId: filterId,
        end: lockedBucket ? lockedBucket.end : windowEnd,
        income: listDirection(measure),
        nowMs,
        start: lockedBucket ? lockedBucket.start : windowStart,
    };
}

function verdictFor(
    result: UseInsightsResult,
    measure: InsightsMeasure,
    totals: InsightsTotals,
    code: string,
    showCents: boolean,
    t: TranslateFn
) {
    return insightsVerdict({
        code,
        current: measure === "net" ? netTotal(totals) : insightsMeasureMagnitude(measure, totals),
        measure,
        prior: measure === "net" ? result.priorNet : result.priorMeasure,
        priorLabel: result.priorLabel,
        showCents,
        t,
        topMover: result.movers[0] ?? null,
    });
}

function balanceAt(running: readonly number[], index: number | null, isNet: boolean): number | null {
    if (!isNet || index == null) {
        return null;
    }
    return running[index] ?? null;
}

export function Insights() {
    const db = useDatabase();
    const savePeriod = useAtomAction(
        setNumberSettingCommand,
        { onFailure: (cause) => console.error("Saving the insights period failed", Cause.squash(cause)) },
        SILENT
    );
    const saveMeasure = useAtomAction(
        setNumberSettingCommand,
        { onFailure: (cause) => console.error("Saving the insights measure failed", Cause.squash(cause)) },
        SILENT
    );
    const t = useTranslation();
    const router = useRouter();
    const currency = useGlobalCurrency(db);
    const { showCents } = useDisplaySettings().state;
    const nowMs = useNow();
    const { overview: ledger, series: netWorth } = useNetWorth(db, nowMs);
    const split = ledger === null ? null : debtsOverview(ledger.rows, currency);
    const debts =
        split !== null && split.youOwe.length + split.owedToYou.length + split.settled.length > 0
            ? { owedToYou: split.owedToYouTotal, youOwe: split.youOweTotal }
            : null;

    const incomeTracking = useSettingBool("incomeTracking");
    const storedPeriod = useSettingNumber("insightsTimeFrame");
    const period = PERIODS.find((option) => option.value === storedPeriod)?.period ?? "week";

    const stored = insightsMeasureFromStored(useSettingNumber("insightsMeasure"));
    const measure = incomeTracking ? stored : "spent";

    const firstWeekday = useSettingNumber("firstWeekday");
    const firstDayOfMonth = useSettingNumber("firstDayOfMonth");
    const calendar: InsightsCalendar = { firstDayOfMonth, firstWeekday };

    const [offset, setOffset] = useState(0);
    const [lockedIndex, setLockedIndex] = useState<number | null>(null);
    const [scrubIndex, setScrubIndex] = useState<number | null>(null);
    const [filterId, setFilterId] = useState<string | null>(null);

    const result = useInsights(db, nowMs, period, measure, offset, calendar);
    const spendingCalendar = useSpendingCalendar(db, nowMs);

    // Cleared on change, not in an effect, so no frame pairs the old selection with the new window.
    const windowKey = `${offset}|${period}|${measure}`;
    const [selectionWindow, setSelectionWindow] = useState(windowKey);
    if (windowKey !== selectionWindow) {
        setSelectionWindow(windowKey);
        setLockedIndex(null);
        setFilterId(null);
    }

    const step = (direction: 1 | -1) => {
        setOffset((current) => (direction === 1 ? Math.min(0, current + 1) : current - 1));
    };

    const selectPeriod = (value: number) => {
        setOffset(0);
        savePeriod({ db, key: "insightsTimeFrame", value });
    };

    const promote = (next: typeof measure) => {
        saveMeasure({ db, key: "insightsMeasure", value: storedInsightsMeasure(next) });
    };

    const lockedBucket = bucketAt(result.buckets, lockedIndex);
    const scrubBucket = bucketAt(result.buckets, scrubIndex);

    const breakdown = breakdownFor(result.breakdown, result.rows, result.categoriesById, lockedBucket, measure, nowMs);

    const filteredEntry = filterId ? (breakdown.find((entry) => entry.id === filterId) ?? null) : null;

    const subBreakdown = withoutLoneDirect(
        subBreakdownFor(
            result.rows,
            result.categoriesById,
            filterId,
            lockedBucket,
            period,
            measure,
            nowMs,
            offset,
            calendar
        ),
        filterId
    );

    const chartMeasure = filteredEntry && measure === "net" ? "spent" : measure;
    const chartBuckets = filteredEntry
        ? categoryBuckets(result.buckets, result.rows, filteredEntry.id, measure === "income", new Date(nowMs))
        : result.buckets;
    const chartAverage = filteredEntry
        ? periodTotal(chartBuckets) / elapsedSlots(period, new Date(nowMs), offset, calendar)
        : result.measureAverage;

    const readIndex = scrubIndex ?? lockedIndex;
    const readBucket = bucketAt(chartBuckets, readIndex);

    const totals = { income: result.income, spent: result.spent };
    const scoped = readBucket != null || filteredEntry != null;

    // All zero is not empty: the window may be busy in the other direction.
    const chartIsEmpty = chartBuckets.every((bucket) => bucket.value === 0);
    const quietAlt = chartIsEmpty ? quietAlternative(measure, totals) : null;

    const isNet = chartMeasure === "net";
    const running = isNet ? runningTotals(chartBuckets) : [];
    const readBalance = balanceAt(running, readIndex, isNet);

    const heroMagnitude = heroMagnitudeFor(filteredEntry, readBalance, readBucket, measure, totals);
    const heroPositive = heroPositiveFor(filteredEntry, readBalance, readBucket, isNet, measure, totals);

    const eyebrow = eyebrowLabel(scrubBucket, isNet, period, measure, t);

    const verdict = verdictFor(result, measure, totals, currency, showCents, t);

    const windowActions: MenuAction[] = [
        {
            attributes: { disabled: result.atEarliest },
            id: "earlier",
            image: "chevron.left",
            title: t("insights.window.earlier"),
        },
        {
            attributes: { disabled: result.atCurrent },
            id: "later",
            image: "chevron.right",
            title: t("insights.window.later"),
        },
        {
            displayInline: true,
            id: "now-section",
            subactions: [
                {
                    attributes: { disabled: result.atCurrent },
                    id: "now",
                    image: "arrow.uturn.backward",
                    title: t("insights.window.now"),
                },
            ],
            title: "",
        },
    ];

    const onWindowAction = (event: string) => {
        if (event === "earlier") {
            step(-1);
        } else if (event === "later") {
            step(1);
        } else if (event === "now") {
            setOffset(0);
        }
    };

    const listQuery = windowQuery(lockedBucket, filterId, measure, nowMs, result.start, result.end);

    const listTransactions = useWindowTransactions(db, listQuery);
    // Held here: the list unmounts with the selection and the hook flushes its pending write on unmount.
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const listGrouped = !(lockedBucket && period !== "year");
    const openTransaction = (id: string) => router.push(`/transactions/${id}`);

    if (!result.hasHistory) {
        return <InsightsSample onAddTransaction={() => router.push("/transactions/create")} />;
    }

    const chart = (
        <ChartSlot
            average={chartAverage}
            buckets={chartBuckets}
            code={currency}
            isEmpty={chartIsEmpty}
            measure={chartMeasure}
            nowMs={nowMs}
            onCommit={setLockedIndex}
            onScrub={setScrubIndex}
            period={period}
            quietAlt={quietAlt}
            selectedIndex={lockedIndex}
        />
    );

    return (
        <>
            <InsightsPeriodMenu onSelect={selectPeriod} period={period} />

            <ScrollView
                className="bg-background"
                contentContainerClassName="pb-4"
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
            >
                <View className="px-5">
                    {recapRowVisible(new Date(nowMs)) ? <RecapRow nowMs={nowMs} /> : null}
                    <View className="flex-row flex-wrap gap-2">
                        <WindowStepper
                            actions={windowActions}
                            canStepBack={!result.atEarliest}
                            canStepForward={!result.atCurrent}
                            onAction={onWindowAction}
                            onStep={step}
                            title={result.label}
                        />
                        {lockedBucket ? (
                            <ScopeChip
                                accessibilityLabel={t("insights.scope.selectedPeriod")}
                                clearAccessibilityLabel={t("insights.scope.clearBar")}
                                onClear={() => setLockedIndex(null)}
                                title={bucketDateLabel(period, lockedBucket.start)}
                            />
                        ) : null}
                        {filteredEntry ? (
                            <ScopeChip
                                accessibilityLabel={t("insights.scope.filteredCategory")}
                                clearAccessibilityLabel={t("insights.scope.clearCategory")}
                                onClear={() => setFilterId(null)}
                                title={filteredEntry.name}
                            />
                        ) : null}
                    </View>

                    <View className="flex-row items-center gap-2 pt-3.5">
                        <MonoLabel numberOfLines={1}>{eyebrow}</MonoLabel>
                        <VerdictBadge badge={scoped ? null : verdict.badge} favourable={verdict.favourable} />
                    </View>

                    <View className="pt-0.5">
                        <HeroNumber
                            amount={heroMagnitude}
                            brandFace
                            code={currency}
                            showCents={showCents}
                            sign={heroPositive ? "+" : "-"}
                            size={40}
                            toneClass={insightsMeasureIsIncome(measure) ? "text-income" : "text-foreground"}
                        />
                    </View>

                    {!scoped && verdict.sentence ? (
                        <Text className="text-footnote text-muted pt-0.5">{verdict.sentence}</Text>
                    ) : null}

                    {incomeTracking && !scoped ? (
                        <View className="pt-3">
                            <LedgerHead
                                cells={insightsMeasureAlternatives(measure).map((alternative): LedgerCell => ({
                                    income: insightsMeasureIsIncome(alternative),
                                    label: t(MEASURE_KEY[alternative]),
                                    magnitude: insightsMeasureMagnitude(alternative, totals),
                                    onPress: () => promote(alternative),
                                    positive: insightsMeasureIsPositive(alternative, totals),
                                }))}
                                code={currency}
                            />
                        </View>
                    ) : null}

                    <View className="pt-4">{chart}</View>
                </View>

                <BreakdownSection
                    code={currency}
                    entries={breakdown}
                    filterId={filterId}
                    lockedBucket={lockedBucket}
                    measure={measure}
                    onFilter={setFilterId}
                    period={period}
                    priorLabel={result.priorLabel}
                    showCents={showCents}
                    subEntries={subBreakdown}
                />

                {listQuery ? (
                    <View className="px-5 pt-6">
                        <InsightsTransactionList
                            currency={currency}
                            grouped={listGrouped}
                            key={`${listQuery.start.getTime()}:${listQuery.end.getTime()}:${listQuery.categoryId}:${listQuery.income}`}
                            onPress={openTransaction}
                            onRequestDelete={requestDelete}
                            pendingDeleteId={pendingId}
                            transactions={listTransactions}
                        />
                    </View>
                ) : null}

                <NetWorthCard
                    currency={currency}
                    debts={debts}
                    onOpenDebts={() => router.push("/accounts")}
                    series={netWorth}
                    showCents={showCents}
                />

                <View className="px-5 pt-6">
                    <SpendingCalendar
                        currency={currency}
                        entries={spendingCalendar}
                        firstWeekday={firstWeekday}
                        now={new Date(nowMs)}
                        showCents={showCents}
                    />
                </View>
            </ScrollView>
        </>
    );
}

function VerdictBadge({ badge, favourable }: { badge: string | null; favourable: boolean }) {
    const colors = useColors();
    if (!badge) {
        return null;
    }
    const tone = favourable ? colors.income : colors.danger;
    return (
        <View
            style={{
                backgroundColor: withAlpha(tone, 0.2),
                borderRadius: 6,
                paddingHorizontal: 5,
                paddingVertical: 2,
            }}
        >
            <Text
                className="font-sans-semibold text-footnote"
                style={{ color: favourable ? colors.incomeOnWash : colors.dangerOnWash }}
            >
                {badge}
            </Text>
        </View>
    );
}

interface ChartSlotProps {
    average: number;
    buckets: InsightsBucket[];
    code: string;
    isEmpty: boolean;
    measure: InsightsMeasure;
    nowMs: number;
    onCommit: Dispatch<SetStateAction<number | null>>;
    onScrub: Dispatch<SetStateAction<number | null>>;
    period: InsightsPeriod;
    quietAlt: InsightsMeasure | null;
    selectedIndex: number | null;
}

function ChartSlot({
    average,
    buckets,
    code,
    isEmpty,
    measure,
    nowMs,
    onCommit,
    onScrub,
    period,
    quietAlt,
    selectedIndex,
}: ChartSlotProps): ReactNode {
    if (isEmpty) {
        return <InsightsQuiet alternative={quietAlt} measure={measure} period={period} />;
    }
    if (measure === "net") {
        return (
            <InsightsNetChart
                buckets={buckets}
                code={code}
                nowMs={nowMs}
                onCommit={onCommit}
                onScrub={onScrub}
                period={period}
                selectedIndex={selectedIndex}
                totals={runningTotals(buckets)}
            />
        );
    }
    return (
        <InsightsBarChart
            average={average}
            buckets={buckets}
            code={code}
            measure={measure}
            nowMs={nowMs}
            onCommit={onCommit}
            onScrub={onScrub}
            period={period}
            selectedIndex={selectedIndex}
        />
    );
}

interface BreakdownSectionProps {
    code: string;
    entries: CategoryBreakdownEntry[];
    filterId: string | null;
    lockedBucket: InsightsBucket | null;
    measure: InsightsMeasure;
    onFilter: Dispatch<SetStateAction<string | null>>;
    period: InsightsPeriod;
    priorLabel: string;
    showCents: boolean;
    subEntries: CategoryBreakdownEntry[];
}

function BreakdownSection({
    code,
    entries,
    filterId,
    lockedBucket,
    measure,
    onFilter,
    period,
    priorLabel,
    showCents,
    subEntries,
}: BreakdownSectionProps) {
    const t = useTranslation();
    if (entries.length === 0) {
        return null;
    }
    const heading = lockedBucket
        ? `${t("insights.categories")} · ${bucketDateLabel(period, lockedBucket.start)}`
        : t("insights.categories");
    const compared = entries.some((entry) => entry.delta != null);

    return (
        <View className="px-5 pt-6">
            <View className="flex-row items-baseline justify-between gap-3 pb-3">
                <MonoLabel numberOfLines={1}>{heading}</MonoLabel>
                {compared ? (
                    <MonoLabel numberOfLines={1}>{t("insights.movers.versus", { label: priorLabel })}</MonoLabel>
                ) : null}
            </View>
            <View className="pb-1">
                <CategoryProportionBar entries={entries} onSelect={onFilter} selectedId={filterId} />
            </View>
            <View className="pt-1.5">
                {entries.map((entry) => (
                    <View key={entry.id}>
                        <CategoryBreakdownRow
                            code={code}
                            dimmed={filterId != null && filterId !== entry.id}
                            entry={entry}
                            measure={measure}
                            onClear={() => onFilter(null)}
                            onPress={() => onFilter((current) => (current === entry.id ? null : entry.id))}
                            selected={filterId === entry.id}
                            showCents={showCents}
                        />
                        <SubBreakdown
                            code={code}
                            entries={filterId === entry.id ? subEntries : []}
                            showCents={showCents}
                        />
                    </View>
                ))}
            </View>
        </View>
    );
}

function SubBreakdown({
    code,
    entries,
    showCents,
}: {
    code: string;
    entries: CategoryBreakdownEntry[];
    showCents: boolean;
}) {
    if (entries.length === 0) {
        return null;
    }
    return (
        <View className="gap-2 pt-2 pb-3 pl-4">
            {entries.map((child) => (
                <ChildRow code={code} entry={child} key={child.id} showCents={showCents} />
            ))}
        </View>
    );
}

function ChildRow({ entry, code, showCents }: { code: string; entry: CategoryBreakdownEntry; showCents: boolean }) {
    const { language } = useLanguage();
    return (
        <View className="flex-row items-center gap-2.5">
            <CategoryIconTile color={entry.color} emoji={entry.emoji} icon={entry.icon} size={26} />
            <Text className="font-sans-medium text-caption text-foreground flex-1" numberOfLines={1}>
                {entry.name}
            </Text>
            <Text className="font-sans-medium text-caption text-muted tabular-nums" numberOfLines={1}>
                {formatAmount(entry.amount, code, showCents, language)}
            </Text>
            <Text className="text-label text-muted font-mono" style={{ minWidth: 34, textAlign: "right" }}>
                {Math.round(entry.fraction * 100)}%
            </Text>
        </View>
    );
}
