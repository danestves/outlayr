import { SectionList } from "@legendapp/list/section-list";
import { addDays, addMonths, startOfDay } from "@outlayr/money/calendar";
import type { RateTable } from "@outlayr/money/valuation";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { DaySectionHeader } from "@/components/day-section-header";
import { FloatingAddButton } from "@/components/floating-add-button";
import { useDisplaySettings, useSettingBool, useSettingNumber } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import { goesWithPendingDelete } from "@/data/card-fees-core";
import { useCategoryMeta } from "@/data/categories";
import { useLogOverviewIn } from "@/data/debts";
import { useFavouriteCurrencies } from "@/data/favourite-currencies";
import { usePendingCuotas } from "@/data/installment-reads";
import { useFilteredTransactions, useUpcomingTransactions } from "@/data/log-filtered";
import { logPeriodFromStored, storedLogPeriod, useLogInsights, useSparklineRows } from "@/data/log-totals";
import type { LogPeriod } from "@/data/log-totals";
import { setNumberSetting } from "@/data/settings-core";
import { useLoggedTransactions } from "@/data/transactions";
import type { TransactionWithCategory } from "@/data/transactions";
import { LOG_PAGE_DAYS } from "@/data/transactions-core";
import { logTransferBounds, useLogTransfers } from "@/data/transfer-log";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useValuationIn } from "@/data/use-valuation";
import { useValuedCurrencies } from "@/data/valued-currencies";
import type { Database } from "@/db/client";
import { groupByDay, groupByDayAsItGrows, joinDaySections } from "@/domain/day-sections";
import { logCurrencyOptions } from "@/domain/log-currency-options";
import type { LogFilter } from "@/domain/log-filter";
import { filterDetail, filterPeriodUnit } from "@/domain/log-filter";
import { logMeasureFromStored, storedLogMeasure } from "@/domain/log-measure";
import type { LogMeasure } from "@/domain/log-measure";
import { cursorStart } from "@/domain/log-period-cursor";
import type { CursorUnit } from "@/domain/log-period-cursor";
import { scopeHasFigures, scopeTotals } from "@/domain/log-scope-figures";
import { sparklineIsPositive, sparklineRange, sparklineSeries } from "@/domain/log-sparkline";
import { mergeByRecency } from "@/domain/transfer-log-rows";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useDayCardShare } from "@/lib/use-day-card-share";
import { useTransactionRowActions } from "@/lib/use-transaction-row-actions";

import { AccountsBlock } from "./components/accounts-block";
import { AmountsEyeButton } from "./components/amounts-eye-button";
import { LogEmptyState } from "./components/log-empty-state";
import { LogFilterChip } from "./components/log-filter-chip";
import type { SparklineData } from "./components/log-insights";
import { LogInsights } from "./components/log-insights";
import { LogNoResults } from "./components/log-no-results";
import { LogToolbar } from "./components/log-toolbar";
import { LogUpcoming } from "./components/log-upcoming";
import { SwipeableTransactionRow } from "./components/swipeable-transaction-row";
import { logEntriesEqual } from "./entries-equal";
import { filterScopeLabel } from "./labels";

function useSparkline(
    db: Database,
    nowMs: number,
    enabled: boolean,
    measure: LogMeasure,
    period: LogPeriod,
    firstWeekday: number,
    displayCurrency: string,
    rates: RateTable
): SparklineData | null {
    const today = startOfDay(new Date(nowMs));
    const floor = period === "month" ? addMonths(today, -1) : addDays(today, -7);
    const rows = useSparklineRows(
        db,
        nowMs,
        enabled && period !== "all",
        measure === "net",
        // A year samples twelve months, which the daily floor would cut short.
        period === "year" ? null : floor,
        displayCurrency,
        rates
    );

    return useMemo(() => {
        if (!enabled || period === "all") {
            return null;
        }
        const now = new Date(nowMs);
        const points = sparklineSeries(rows, measure, period, now);
        return {
            byMonth: period === "year",
            points,
            positive: sparklineIsPositive(measure, points),
            range: sparklineRange(period, now, firstWeekday),
        };
    }, [rows, measure, period, firstWeekday, enabled, nowMs]);
}

export function Log() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    // Screen state: an `appMeta` setting would change the currency new transactions record in.
    const [displayOverride, setDisplayOverride] = useState<string | null>(null);
    const globalCurrency = useGlobalCurrency(db);
    const favouriteCurrencies = useFavouriteCurrencies(db);
    const valuation = useValuationIn(db, displayOverride ?? globalCurrency);
    const { displayCurrency: currency, rates } = valuation;
    // An account in its undo window must not linger here.
    const { pendingId: pendingAccountId } = useDeferredDelete("account");
    const nowMs = useNow();
    const { banks: accountsOverview, debts: debtsOverview } = useLogOverviewIn(db, valuation, nowMs, pendingAccountId);
    const accountRows = useBankAccounts(db);
    const debts =
        debtsOverview.youOwe.length + debtsOverview.owedToYou.length + debtsOverview.settled.length > 0
            ? {
                  currency,
                  due: debtsOverview.due,
                  owedToYou: debtsOverview.owedToYouTotal,
                  youOwe: debtsOverview.youOweTotal,
              }
            : null;
    const valued = useValuedCurrencies(db);
    const { showCents, swapTimeLabel, use24Hour } = useDisplaySettings().state;
    const showUpcoming = useSettingBool("showUpcoming");
    const showUpcomingSoon = useSettingBool("showUpcomingSoon");
    const logViewLineGraph = useSettingBool("logViewLineGraph");
    const amountsHidden = useSettingBool("hideAmounts");
    const firstWeekday = useSettingNumber("firstWeekday");
    const period = logPeriodFromStored(useSettingNumber("logInsightsTimeFrame"));
    const measure = logMeasureFromStored(useSettingNumber("logInsightsType"));

    const [filter, setFilter] = useState<LogFilter>("all");
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [income, setIncome] = useState(false);
    // Seeded once: re-seeding as the clock ticks would step the calendar filters out from under the user.
    const [cursors, setCursors] = useState<Record<CursorUnit, Date>>(() => ({
        day: new Date(nowMs),
        month: new Date(nowMs),
        week: new Date(nowMs),
    }));

    const [days, setDays] = useState(LOG_PAGE_DAYS);

    const categoryMeta = useCategoryMeta(db);
    const filterableCategories = useMemo(
        () => [...categoryMeta].filter(([, meta]) => meta.parentId == null).map(([id, meta]) => ({ id, meta })),
        [categoryMeta]
    );
    const activeCategoryId = categoryId ?? filterableCategories[0]?.id ?? null;

    const cursorUnit: CursorUnit = filter === "week" || filter === "month" ? filter : "day";
    const cursor = cursors[cursorUnit];

    const { head, reachedEnd, splitMs, tail } = useLoggedTransactions(db, nowMs, days);
    const transferBounds = useMemo(
        () =>
            logTransferBounds({
                cursor,
                filter,
                firstWeekday,
                page: { floor: (tail.at(-1) ?? head.at(-1))?.day ?? null, reachedEnd },
            }),
        [cursor, filter, firstWeekday, head, tail, reachedEnd]
    );
    const transferRows = useLogTransfers(db, nowMs, transferBounds);
    const filteredRows = useFilteredTransactions(db, nowMs, {
        categoryId: activeCategoryId,
        cursor,
        filter,
        firstWeekday,
        income,
    });
    const upcoming = useUpcomingTransactions(db, nowMs, showUpcomingSoon);
    const insights = useLogInsights(db, nowMs, period, firstWeekday, currency, rates);
    const currencyOptions = useMemo(
        () =>
            logCurrencyOptions({
                // `rates` holds only the on-screen currency (#237); USD passes via the frozen `amountUsd`.
                convertible: (code) => code === "USD" || valued.has(code),
                favourites: favouriteCurrencies,
                global: globalCurrency,
                produced: insights.perCurrency.map((figures) => figures.currencyCode),
            }),
        [globalCurrency, favouriteCurrencies, insights, valued]
    );
    const sparkline = useSparkline(db, nowMs, logViewLineGraph, measure, period, firstWeekday, currency, rates);
    const transferIds = useMemo(() => new Set(transferRows.map((transfer) => transfer.id)), [transferRows]);
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const pendingCuotas = usePendingCuotas(db, pendingId);

    const tailTransfers = useMemo(
        () => transferRows.filter((transfer) => transfer.day.getTime() < splitMs),
        [transferRows, splitMs]
    );
    const listRows = useMemo(() => {
        if (filter === "transfers") {
            return transferRows;
        }
        if (filter === "all") {
            return mergeByRecency(
                head,
                transferRows.filter((transfer) => transfer.day.getTime() >= splitMs)
            );
        }
        return mergeByRecency(filteredRows, transferRows);
    }, [filter, head, splitMs, filteredRows, transferRows]);
    const tailRows = useMemo(
        () => (filter === "all" ? mergeByRecency(tail, tailTransfers) : []),
        [filter, tail, tailTransfers]
    );
    const visibleRows = useMemo(
        () => listRows.filter((row) => !goesWithPendingDelete(row, pendingId, pendingCuotas)),
        [listRows, pendingId, pendingCuotas]
    );
    const visibleTail = useMemo(() => {
        const kept = tailRows.filter((row) => !goesWithPendingDelete(row, pendingId, pendingCuotas));
        return kept.length === tailRows.length ? tailRows : kept;
    }, [tailRows, pendingId, pendingCuotas]);
    const headSections = useMemo(() => groupByDay(visibleRows, currency, rates), [visibleRows, currency, rates]);
    const groupTail = useMemo(
        () => groupByDayAsItGrows<(typeof visibleTail)[number]>(currency, rates),
        [currency, rates]
    );
    const tailSections = useMemo(() => groupTail(visibleTail), [groupTail, visibleTail]);
    const sections = useMemo(
        () =>
            joinDaySections(headSections, tailSections, () =>
                groupByDay([...visibleRows, ...visibleTail], currency, rates)
            ),
        [headSections, tailSections, visibleRows, visibleTail, currency, rates]
    );
    // Over the unwindowed filtered read and the sections' own rows, so the day subtotals agree to the cent.
    const scopeFigures = useMemo(
        () => (filter === "all" || !scopeHasFigures(visibleRows) ? null : scopeTotals(visibleRows, currency, rates)),
        [filter, visibleRows, currency, rates]
    );

    const openRowActions = useTransactionRowActions(nowMs, requestDelete);
    const openAccount = (accountId: string) =>
        router.push({ params: { accountId }, pathname: "/accounts/[accountId]" });
    // Transfer ids route to their own screen; `transactions/[id]` would open empty.
    const openRow = (rowId: string) =>
        router.push(transferIds.has(rowId) ? `/transactions/transfers/${rowId}` : `/transactions/${rowId}`);
    const rowMenu = (transaction: TransactionWithCategory, scheduled: boolean) =>
        transferIds.has(transaction.id) ? [] : openRowActions(transaction, scheduled);
    const cardOptions = useMemo(
        () => ({ currency, showCents, swapTimeLabel, use24Hour }),
        [currency, showCents, swapTimeLabel, use24Hour]
    );
    const shareDay = useDayCardShare(cardOptions);

    const detail = filterPeriodUnit(filter)
        ? filterDetail(filter, { cursor, firstWeekday, income })
        : filterScopeLabel(t, filter, activeCategoryId ? categoryMeta.get(activeCategoryId)?.name : null, income);

    const showUpcomingSection = filter === "upcoming" || (filter === "all" && showUpcoming);
    // Filtered like the day sections, or a deleted future row lingers under the undo toast.
    const upcomingRows = useMemo(
        () => (showUpcomingSection ? upcoming.rows.filter((row) => !goesWithPendingDelete(row, pendingId)) : []),
        [showUpcomingSection, upcoming.rows, pendingId]
    );
    const upcomingSchedules = useMemo(
        () => upcoming.schedules.filter((row) => row.id !== pendingId),
        [upcoming.schedules, pendingId]
    );
    const emptyResult = sections.length === 0 && (filter !== "upcoming" || upcomingRows.length === 0);
    // LegendList's SectionList keeps `extraData` to itself, so what rows read rides on each section.
    const today = startOfDay(new Date(nowMs)).getTime();
    const listSections = useMemo(() => {
        const view = { ...cardOptions, language };
        return sections.map((section, index) => ({
            ...section,
            first: index === 0 && upcomingRows.length === 0,
            today,
            view,
        }));
    }, [sections, upcomingRows.length, cardOptions, language, today]);

    // One setting behind both headers, so a filter never changes the promoted figure.
    const onMeasure = (next: LogMeasure) => {
        setNumberSetting(db, "logInsightsType", storedLogMeasure(next));
    };

    const accountsProps = {
        accounts: accountRows,
        currency,
        debts,
        onOpen: openAccount,
        onOpenAll: () => router.push("/accounts"),
        onOpenDebts: () => router.push("/accounts"),
        overview: accountsOverview,
        showCents,
    };

    const toolbar = (
        <LogToolbar
            period={period}
            onPeriod={(next) => {
                setNumberSetting(db, "logInsightsTimeFrame", storedLogPeriod(next));
            }}
            filter={filter}
            onFilter={setFilter}
            onSearch={() => router.push("/search")}
        />
    );

    if (listRows.length === 0 && tailRows.length === 0 && filter === "all") {
        return (
            <AmountsHiddenContext value={amountsHidden}>
                {accountsOverview || debts ? (
                    // A scroll view for the automatic inset: flat content starts under the transparent large title.
                    <ScrollView
                        className="bg-background"
                        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20 }}
                        contentInsetAdjustmentBehavior="automatic"
                    >
                        <AccountsBlock {...accountsProps} trailing={<AmountsEyeButton />} />
                        <LogEmptyState />
                    </ScrollView>
                ) : (
                    <LogEmptyState />
                )}
                <FloatingAddButton />
            </AmountsHiddenContext>
        );
    }

    return (
        <AmountsHiddenContext value={amountsHidden}>
            {toolbar}
            <SectionList
                className="bg-background"
                contentInsetAdjustmentBehavior="automatic"
                sections={filter === "upcoming" ? [] : listSections}
                keyExtractor={(item) => item.id}
                itemsAreEqual={logEntriesEqual}
                stickySectionHeadersEnabled={false}
                recycleItems
                onEndReachedThreshold={0.5}
                onEndReached={() => {
                    if (filter === "all" && !reachedEnd) {
                        setDays((current) => current + LOG_PAGE_DAYS);
                    }
                }}
                contentContainerStyle={{
                    flexGrow: 1,
                    // Clears the floating add button.
                    paddingBottom: 100,
                    paddingHorizontal: 20,
                }}
                ListHeaderComponent={
                    <>
                        {filter === "all" ? (
                            <LogInsights
                                insights={insights}
                                measure={measure}
                                onMeasure={onMeasure}
                                period={period}
                                displayCurrency={currency}
                                currencyOptions={currencyOptions}
                                onDisplayCurrency={setDisplayOverride}
                                onManageCurrencies={() => router.push("/settings/currency")}
                                sparkline={sparkline}
                            />
                        ) : (
                            <LogFilterChip
                                filter={filter}
                                detail={detail}
                                categories={filterableCategories}
                                categoryId={activeCategoryId}
                                onCategory={setCategoryId}
                                cursor={cursor}
                                onCursor={(next) =>
                                    setCursors((current) => ({
                                        ...current,
                                        // Period filters fetch on a unit's first instant; a raw cursor finds nothing.
                                        [cursorUnit]: cursorStart(cursorUnit, next, firstWeekday),
                                    }))
                                }
                                income={income}
                                onIncome={setIncome}
                                firstWeekday={firstWeekday}
                                nowMs={nowMs}
                                onClear={() => setFilter("all")}
                                totals={scopeFigures}
                                measure={measure}
                                onMeasure={onMeasure}
                                displayCurrency={currency}
                            />
                        )}
                        {filter === "all" ? <AccountsBlock {...accountsProps} /> : null}
                        {showUpcomingSection ? (
                            <LogUpcoming
                                transactions={upcomingRows}
                                schedules={upcomingSchedules}
                                currency={currency}
                                rates={rates}
                                onPress={openRow}
                                menuItems={(transaction) => rowMenu(transaction, true)}
                                nowMs={nowMs}
                            />
                        ) : null}
                        {emptyResult ? <LogNoResults /> : null}
                    </>
                }
                renderSectionHeader={({ section }) => (
                    <DaySectionHeader section={section} first={section.first} onShare={() => shareDay(section)} />
                )}
                renderItem={({ item }) => (
                    <SwipeableTransactionRow
                        transaction={item}
                        currency={currency}
                        rates={rates}
                        onPress={openRow}
                        menuItems={rowMenu(item, false)}
                        onDelete={requestDelete}
                    />
                )}
            />

            <FloatingAddButton />
        </AmountsHiddenContext>
    );
}
