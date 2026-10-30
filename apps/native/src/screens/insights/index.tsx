import * as Cause from "effect/Cause";
import { useRouter } from "expo-router";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { use, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AmountsHiddenContext, HeroNumber } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { ScopeChip } from "@/components/scope-chip";
import { Text } from "@/components/text";
import { WidgetCard } from "@/components/widget-card";
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
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useInsights } from "@/data/use-insights";
import type { UseInsightsResult } from "@/data/use-insights";
import { useNow } from "@/data/use-now";
import {
    INSIGHTS_MEASURE_ORDER,
    insightsMeasureAlternatives,
    insightsMeasureFromStored,
    insightsMeasureIsIncome,
    insightsMeasureMagnitude,
    netTotal,
    storedInsightsMeasure,
} from "@/domain/insights-measure";
import type { InsightsTotals } from "@/domain/insights-measure";
import { quietAlternative } from "@/domain/insights-quiet";
import { insightsVerdict } from "@/domain/insights-verdict";
import { formatAmount, maskedAmount } from "@/domain/money";
import { recapRowVisible } from "@/domain/recap-month";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { SILENT } from "@/state/atom-command";
import { setNumberSettingCommand } from "@/state/settings-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { CategoryBlocks } from "./components/category-blocks";
import { InsightsBarChart } from "./components/insights-bar-chart";
import { InsightsNetChart } from "./components/insights-net-chart";
import { InsightsPeriodMenu } from "./components/insights-period-menu";
import { InsightsQuiet } from "./components/insights-quiet";
import { InsightsSample } from "./components/insights-sample";
import { InsightsTransactionList } from "./components/insights-transaction-list";
import { MeasureWidget, NetWorthWidget } from "./components/insights-widgets";
import { InsightsWindow } from "./components/insights-window";
import { RecapRow } from "./components/recap-row";
import { heroMagnitudeFor, heroPositiveFor } from "./hero";
import { MEASURE_KEY } from "./measure-label";
import { periodOf } from "./periods";

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

function entryCount(rows: readonly InsightsContribution[], income: boolean, bounds: BucketBounds, nowMs: number) {
    return rows.filter((row) => {
        const time = row.date.getTime();
        return row.income === income && time >= bounds.start && time < bounds.end && time <= nowMs;
    }).length;
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
    const { series: netWorth } = useNetWorth(db, nowMs);

    const incomeTracking = useSettingBool("incomeTracking");
    const period = periodOf(useSettingNumber("insightsTimeFrame"));

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

    // Cleared on change, not in an effect, so no frame pairs the old selection with the new window.
    const windowKey = `${offset}|${period}|${measure}`;
    const [selectionWindow, setSelectionWindow] = useState(windowKey);
    if (windowKey !== selectionWindow) {
        setSelectionWindow(windowKey);
        setLockedIndex(null);
        setFilterId(null);
    }

    const selectPeriod = (value: number) => {
        setOffset(0);
        savePeriod({ db, key: "insightsTimeFrame", value });
    };

    const selectMeasure = (next: typeof measure) => {
        saveMeasure({ db, key: "insightsMeasure", value: storedInsightsMeasure(next) });
    };

    const lockedBucket = bucketAt(result.buckets, lockedIndex);
    const scrubBucket = bucketAt(result.buckets, scrubIndex);

    const breakdown = breakdownFor(result.breakdown, result.rows, result.categoriesById, lockedBucket, measure, nowMs);

    const filteredEntry = filterId ? (breakdown.find((entry) => entry.id === filterId) ?? null) : null;
    const activeFilterId = filteredEntry?.id ?? null;

    const subBreakdown = withoutLoneDirect(
        subBreakdownFor(
            result.rows,
            result.categoriesById,
            activeFilterId,
            lockedBucket,
            period,
            measure,
            nowMs,
            offset,
            calendar
        ),
        activeFilterId
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

    const listQuery = windowQuery(lockedBucket, activeFilterId, measure, nowMs, result.start, result.end);

    const listTransactions = useWindowTransactions(db, listQuery);
    // Held here: the list unmounts with the selection and the hook flushes its pending write on unmount.
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const listGrouped = !(lockedBucket && period !== "year");
    const openTransaction = (id: string) => router.push(`/transactions/${id}`);
    const openCashFlow = () => router.push(`/insights/cash-flow?offset=${offset}`);

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

    const list = listQuery ? (
        <View className="py-2">
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
    ) : null;

    return (
        <>
            <InsightsPeriodMenu
                measure={measure}
                measures={incomeTracking ? INSIGHTS_MEASURE_ORDER : []}
                onMeasure={selectMeasure}
                onSelect={selectPeriod}
                period={period}
            />

            <ScrollView
                className="bg-background"
                contentContainerClassName="pb-6"
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
            >
                <View className="px-5">
                    {recapRowVisible(new Date(nowMs)) ? <RecapRow nowMs={nowMs} /> : null}
                    <View className="flex-row flex-wrap gap-2">
                        <InsightsWindow
                            atCurrent={result.atCurrent}
                            atEarliest={result.atEarliest}
                            label={result.label}
                            onOffset={setOffset}
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
                </View>

                <View className="gap-2.5 px-5 pt-5">
                    <BreakdownSection
                        code={currency}
                        entries={breakdown}
                        filterId={activeFilterId}
                        lockedBucket={lockedBucket}
                        measure={measure}
                        onFilter={setFilterId}
                        onOpen={incomeTracking ? openCashFlow : undefined}
                        period={period}
                        priorLabel={result.priorLabel}
                        showCents={showCents}
                        subEntries={subBreakdown}
                    />

                    {lockedBucket ? null : list}

                    {incomeTracking ? (
                        <MeasureWidgets
                            code={currency}
                            measure={measure}
                            nowMs={nowMs}
                            onOpen={openCashFlow}
                            result={result}
                            showCents={showCents}
                        />
                    ) : null}

                    <ByDayCard
                        average={chartMeasure === "net" || chartIsEmpty ? null : chartAverage}
                        code={currency}
                        note={filteredEntry?.name ?? null}
                        period={period}
                        priorAverage={result.priorMeasure / elapsedSlots(period, new Date(nowMs), offset - 1, calendar)}
                        priorLabel={result.priorLabel}
                    >
                        {chart}
                    </ByDayCard>

                    {lockedBucket ? list : null}

                    <NetWorthWidget
                        currency={currency}
                        onOpen={() => router.push("/accounts")}
                        series={netWorth}
                        showCents={showCents}
                    />
                </View>
            </ScrollView>
        </>
    );
}

interface MeasureWidgetsProps {
    code: string;
    measure: InsightsMeasure;
    nowMs: number;
    onOpen: () => void;
    result: UseInsightsResult;
    showCents: boolean;
}

function MeasureWidgets({ code, measure, nowMs, onOpen, result, showCents }: MeasureWidgetsProps) {
    const stacked = useAccessibilityTextSize();
    const bounds = { end: result.end.getTime(), start: result.start.getTime() };
    return (
        <View className={stacked ? "gap-2.5" : "flex-row gap-2.5"}>
            {insightsMeasureAlternatives(measure).map((alternative) => (
                <MeasureWidget
                    className={stacked ? undefined : "flex-1"}
                    code={code}
                    count={entryCount(result.rows, alternative === "income", bounds, nowMs)}
                    entries={
                        alternative === "net"
                            ? []
                            : categoryBreakdownWithin(
                                  result.rows,
                                  result.categoriesById,
                                  alternative,
                                  bounds,
                                  new Date(nowMs)
                              )
                    }
                    key={alternative}
                    measure={alternative}
                    onOpen={onOpen}
                    showCents={showCents}
                    totals={{ income: result.income, spent: result.spent }}
                />
            ))}
        </View>
    );
}

interface ByDayCardProps {
    average: number | null;
    children: ReactNode;
    code: string;
    note: string | null;
    period: InsightsPeriod;
    priorAverage: number;
    priorLabel: string;
}

function ByDayCard({ average, children, code, note, period, priorAverage, priorLabel }: ByDayCardProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const money = (amount: number) => (hidden ? maskedAmount(code) : formatAmount(amount, code, false, language));
    let caption = note;
    if (caption == null && priorAverage > 0) {
        caption = t("insights.widget.priorAverage", { amount: money(priorAverage), label: priorLabel });
    }
    return (
        <WidgetCard>
            <MonoLabel numberOfLines={1}>
                {t(period === "year" ? "insights.chart.byMonth" : "insights.chart.byDay")}
            </MonoLabel>
            {average == null ? null : (
                <View className="pt-1.75">
                    <Text className="font-sans-semibold text-title text-foreground tabular-nums" numberOfLines={1}>
                        {t(period === "year" ? "insights.widget.perMonth" : "insights.widget.perDay", {
                            amount: money(average),
                        })}
                    </Text>
                    {caption ? (
                        <Text className="font-sans-medium text-footnote text-subtle" numberOfLines={1}>
                            {caption}
                        </Text>
                    ) : null}
                </View>
            )}
            <View className="pt-3">{children}</View>
        </WidgetCard>
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
    onFilter: (id: string | null) => void;
    onOpen?: () => void;
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
    onOpen,
    period,
    priorLabel,
    showCents,
    subEntries,
}: BreakdownSectionProps) {
    const t = useTranslation();
    if (entries.length === 0) {
        return null;
    }
    const title = t(measure === "income" ? "insights.whereItCameFrom" : "insights.whereItWent");
    const heading = lockedBucket ? `${title} · ${bucketDateLabel(period, lockedBucket.start)}` : title;
    const compared = entries.some((entry) => entry.delta != null);

    return (
        <WidgetCard>
            <View className="flex-row items-baseline justify-between gap-3 pb-3">
                {onOpen ? (
                    <Pressable
                        accessibilityHint={t("insights.cashFlow.openHint")}
                        accessibilityLabel={heading}
                        accessibilityRole="button"
                        className="shrink active:opacity-70"
                        hitSlop={10}
                        onPress={onOpen}
                    >
                        <MonoLabel numberOfLines={1}>{`${heading}  ›`}</MonoLabel>
                    </Pressable>
                ) : (
                    <MonoLabel numberOfLines={1}>{heading}</MonoLabel>
                )}
                {compared ? (
                    <MonoLabel numberOfLines={1}>{t("insights.movers.versus", { label: priorLabel })}</MonoLabel>
                ) : null}
            </View>
            <CategoryBlocks
                code={code}
                entries={entries}
                measure={measure}
                onSelect={onFilter}
                selectedId={filterId}
                showCents={showCents}
            />
            <SubBreakdown code={code} entries={subEntries} showCents={showCents} />
        </WidgetCard>
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
        <View className="gap-2 pt-3">
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
