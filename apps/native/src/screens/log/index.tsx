import { SectionList } from "@legendapp/list/section-list";
import { addDays, addMonths, startOfDay } from "@outlayr/money/calendar";
import { valueDatedRowsIn } from "@outlayr/money/valuation";
import type { RateTable } from "@outlayr/money/valuation";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { DaySectionHeader } from "@/components/day-section-header";
import { FloatingAddButton } from "@/components/floating-add-button";
import { useDisplaySettings, useSetting } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import { useAutologUsage } from "@/data/autolog-cap";
import { useCurrentMainBudget } from "@/data/budgets";
import { goesWithPendingDelete } from "@/data/card-fees-core";
import { useCategoryMeta } from "@/data/categories";
import { useLogOverviewIn } from "@/data/debts";
import { useFavouriteCurrencies } from "@/data/favourite-currencies";
import { usePendingCuotas } from "@/data/installment-reads";
import { useFilteredTransactions, useUpcomingTransactions } from "@/data/log-filtered";
import { logPeriodFromStored, storedLogPeriod, useLogInsights, useSparklineRows } from "@/data/log-totals";
import type { LogPeriod } from "@/data/log-totals";
import { useLoggedTransactions } from "@/data/transactions";
import type { TransactionWithCategory } from "@/data/transactions";
import { LOG_PAGE_DAYS } from "@/data/transactions-core";
import { logTransferBounds, useLogTransfers } from "@/data/transfer-log";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useValuationIn } from "@/data/use-valuation";
import { useValuedCurrencies } from "@/data/valued-currencies";
import type { Database } from "@/db/client";
import { BALANCES_ACCOUNTS } from "@/domain/balances";
import { formatMonthHeader } from "@/domain/dates";
import { groupByDay, groupByDayAsItGrows, groupByMonth, joinDaySections } from "@/domain/day-sections";
import type { DayGroupable } from "@/domain/day-sections";
import { logCurrencyOptions } from "@/domain/log-currency-options";
import type { LogFilter, LogMenuFilter } from "@/domain/log-filter";
import { filterDetail, filterPeriodUnit } from "@/domain/log-filter";
import { logMeasureFromStored, storedLogMeasure } from "@/domain/log-measure";
import type { LogMeasure, NarrowedMeasure } from "@/domain/log-measure";
import { cursorStart } from "@/domain/log-period-cursor";
import type { CursorUnit } from "@/domain/log-period-cursor";
import { scopeHasFigures, scopeTotals } from "@/domain/log-scope-figures";
import { sparklineIsPositive, sparklineRange, sparklineSeries } from "@/domain/log-sparkline";
import { paywallHref } from "@/domain/paywall-trigger";
import { barWindow, periodBars } from "@/domain/period-bars";
import { mergeByRecency } from "@/domain/transfer-log-rows";
import type { TransferLogRow } from "@/domain/transfer-log-rows";
import { chargesBetween } from "@/domain/upcoming";
import { useReviewAsk } from "@/hooks/use-review-ask";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useDayCardShare } from "@/lib/use-day-card-share";
import { useTransactionRowActions } from "@/lib/use-transaction-row-actions";
import { markReviewedCommand } from "@/state/review-commands";
import { setNumberSettingCommand } from "@/state/settings-commands";
import { useAtomCommand } from "@/state/use-atom-command";

import { AccountsBlock } from "./components/accounts-block";
import { AmountsEyeButton } from "./components/amounts-eye-button";
import { LogAutologPaused } from "./components/log-autolog-paused";
import { LogEmptyState } from "./components/log-empty-state";
import { LogFilterChip } from "./components/log-filter-chip";
import type { SparklineData } from "./components/log-insights";
import { LogInsights } from "./components/log-insights";
import { LogNoResults } from "./components/log-no-results";
import { LogShelf } from "./components/log-shelf";
import { LogToolbar } from "./components/log-toolbar";
import { UpcomingList } from "./components/log-upcoming";
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
}

function usePeriodBars(
    db: Database,
    nowMs: number,
    enabled: boolean,
    measure: LogMeasure,
    period: LogPeriod,
    firstWeekday: number,
    displayCurrency: string,
    rates: RateTable,
    schedules: readonly TransactionWithCategory[]
) {
    const now = new Date(nowMs);
    const barPeriod = period === "week" || period === "month" ? period : null;
    const window = barPeriod ? barWindow(barPeriod, now, firstWeekday) : null;
    const rows = useSparklineRows(
        db,
        nowMs,
        enabled && window !== null,
        false,
        window?.start ?? null,
        displayCurrency,
        rates
    );

    if (!enabled || !barPeriod || !window) {
        return null;
    }
    const income = measure === "in";
    const charges = income ? [] : chargesBetween(schedules, now, addDays(startOfDay(now), 1), window.end);
    const due = valueDatedRowsIn(charges, displayCurrency, rates).map((amount, index) => ({
        amount,
        date: charges[index].date,
    }));
    const logged = rows.filter((row) => row.income === income);
    return { period: barPeriod, rows: periodBars(barPeriod, now, firstWeekday, logged, due) };
}

function headListRows(
    filter: LogFilter,
    head: readonly TransactionWithCategory[],
    filteredRows: readonly TransactionWithCategory[],
    transferRows: readonly TransferLogRow[],
    splitMs: number
) {
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
}

function useTailGrouping<T extends DayGroupable>(currency: string, rates: RateTable) {
    const [grouping, setGrouping] = useState(() => ({
        currency,
        group: groupByDayAsItGrows<T>(currency, rates),
        rates,
    }));
    if (grouping.currency === currency && grouping.rates === rates) {
        return grouping.group;
    }
    const next = { currency, group: groupByDayAsItGrows<T>(currency, rates), rates };
    setGrouping(next);
    return next.group;
}

function nothingToList(sectionCount: number, filter: LogMenuFilter, upcomingCount: number) {
    return sectionCount === 0 && (filter !== "upcoming" || upcomingCount === 0);
}

function listScope(filter: LogMenuFilter, narrowed: NarrowedMeasure | null) {
    const listFilter: LogFilter = narrowed ? "type" : filter;
    const headMeasure: LogMeasure = narrowed ?? "net";
    return { headMeasure, income: narrowed === "in", listFilter, monthly: narrowed !== null };
}

export function Log() {
    const db = useDatabase();
    useReviewAsk(db);
    const setNumberSetting = useAtomCommand(setNumberSettingCommand);
    const markReviewed = useAtomCommand(markReviewedCommand);
    const { waiting } = useAutologUsage(db);
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
    const showUpcoming = useSetting("showUpcoming");
    const showUpcomingSoon = useSetting("showUpcomingSoon");
    const logViewLineGraph = useSetting("logViewLineGraph");
    const amountsHidden = useSetting("hideAmounts");
    const firstWeekday = useSetting("firstWeekday");
    const period = logPeriodFromStored(useSetting("logInsightsTimeFrame"));
    const measure = logMeasureFromStored(useSetting("logInsightsType"));

    const [filter, setFilter] = useState<LogMenuFilter>("all");
    const [categoryId, setCategoryId] = useState<string | null>(null);
    // Screen state, not a setting: a Log that reopens narrowed looks like it lost the other half of the money.
    const [narrowed, setNarrowed] = useState<NarrowedMeasure | null>(null);
    const { headMeasure, income, listFilter, monthly } = listScope(filter, narrowed);
    // Seeded once: re-seeding as the clock ticks would step the calendar filters out from under the user.
    const [cursors, setCursors] = useState<Record<CursorUnit, Date>>(() => ({
        day: new Date(nowMs),
        month: new Date(nowMs),
        week: new Date(nowMs),
    }));

    const [days, setDays] = useState(LOG_PAGE_DAYS);
    // One flag behind every `not all` branch: the head/tail reads are Log's money, and filters read none of them.
    const readingHead = listFilter === "all";

    const categoryMeta = useCategoryMeta(db);
    const filterableCategories = [...categoryMeta]
        .filter(([, meta]) => meta.parentId == null)
        .map(([id, meta]) => ({ id, meta }));
    const activeCategoryId = categoryId ?? filterableCategories[0]?.id ?? null;

    const cursorUnit: CursorUnit = filter === "week" || filter === "month" ? filter : "day";
    const cursor = cursors[cursorUnit];
    const detail = filterPeriodUnit(filter)
        ? filterDetail(filter, { cursor, firstWeekday })
        : filterScopeLabel(t, filter, activeCategoryId ? categoryMeta.get(activeCategoryId)?.name : null);

    const { head, reachedEnd, splitMs, tail } = useLoggedTransactions(db, nowMs, days, readingHead);
    const transferBounds = logTransferBounds({
        cursor,
        filter: listFilter,
        firstWeekday,
        page: { floor: (tail.at(-1) ?? head.at(-1))?.day ?? null, reachedEnd },
    });
    const transferRows = useLogTransfers(db, nowMs, transferBounds);
    const filteredRows = useFilteredTransactions(db, nowMs, {
        categoryId: activeCategoryId,
        cursor,
        filter: listFilter,
        firstWeekday,
        income,
    });
    // The section renders only under its own filter or the all view's setting, so the scan waits for either.
    const showUpcomingSection = filter === "upcoming" || (listFilter === "all" && showUpcoming);
    const upcoming = useUpcomingTransactions(db, nowMs, showUpcomingSoon, showUpcomingSection);
    const insights = useLogInsights(db, nowMs, period, firstWeekday, currency, rates);
    const mainBudget = useCurrentMainBudget(db, nowMs, period === "month");
    const currencyOptions = logCurrencyOptions({
        // `rates` holds only the on-screen currency (#237); USD passes via the frozen `amountUsd`.
        convertible: (code) => code === "USD" || valued.has(code),
        favourites: favouriteCurrencies,
        global: globalCurrency,
        produced: insights.perCurrency.map((figures) => figures.currencyCode),
    });
    const sparkline = useSparkline(db, nowMs, logViewLineGraph, headMeasure, period, firstWeekday, currency, rates);
    const bars = usePeriodBars(
        db,
        nowMs,
        filter === "all",
        headMeasure,
        period,
        firstWeekday,
        currency,
        rates,
        upcoming.schedules
    );
    const transferIds = new Set(transferRows.map((transfer) => transfer.id));
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const pendingCuotas = usePendingCuotas(db, pendingId);
    const openRowActions = useTransactionRowActions(nowMs, requestDelete);
    const cardOptions = { currency, showCents, swapTimeLabel, use24Hour };
    const shareDay = useDayCardShare(cardOptions);
    const groupTail = useTailGrouping<TransactionWithCategory | TransferLogRow>(currency, rates);
    // Filtered like the day sections, or a deleted future row lingers under the undo toast.
    const upcomingRows = showUpcomingSection
        ? upcoming.rows.filter((row) => !goesWithPendingDelete(row, pendingId))
        : [];
    const today = startOfDay(new Date(nowMs)).getTime();
    const view = { ...cardOptions, language, monthly };

    const tailTransfers = transferRows.filter((transfer) => transfer.day.getTime() < splitMs);
    const listRows = headListRows(listFilter, head, filteredRows, transferRows, splitMs);
    const tailRows = listFilter === "all" ? mergeByRecency(tail, tailTransfers) : [];
    const visibleRows = listRows.filter((row) => !goesWithPendingDelete(row, pendingId, pendingCuotas));
    const keptTail = tailRows.filter((row) => !goesWithPendingDelete(row, pendingId, pendingCuotas));
    const visibleTail = keptTail.length === tailRows.length ? tailRows : keptTail;
    const headSections = groupByDay(visibleRows, currency, rates);
    const tailSections = groupTail(visibleTail);
    const sections = monthly
        ? groupByMonth(visibleRows, currency, rates)
        : joinDaySections(headSections, tailSections, () =>
              groupByDay([...visibleRows, ...visibleTail], currency, rates)
          );
    // LegendList's SectionList keeps `extraData` to itself, so what rows read rides on each section.
    const listSections = sections.map((section, index) => ({
        ...section,
        first: index === 0,
        today,
        view,
    }));
    const emptyResult = nothingToList(sections.length, filter, upcomingRows.length);
    // Over the unwindowed filtered read and the sections' own rows, so the day subtotals agree to the cent.
    const scopeFigures =
        filter === "all" || !scopeHasFigures(visibleRows) ? null : scopeTotals(visibleRows, currency, rates);

    const openAccount = (accountId: string) =>
        router.push({ params: { accountId }, pathname: "/accounts/[accountId]" });
    // Transfer ids route to their own screen; `transactions/[id]` would open empty.
    const openRow = (rowId: string) =>
        router.push(transferIds.has(rowId) ? `/transactions/transfers/${rowId}` : `/transactions/${rowId}`);
    const rowMenu = (transaction: TransactionWithCategory, scheduled: boolean) =>
        transferIds.has(transaction.id) ? [] : openRowActions(transaction, scheduled);

    // The promoted figure under a filter chip; the Log's own head shows all three.
    const onMeasure = (next: LogMeasure) => {
        setNumberSetting({ db, key: "logInsightsType", value: storedLogMeasure(next) });
    };

    const accountsProps = {
        accounts: accountRows,
        currency,
        debts,
        onOpen: openAccount,
        onOpenAll: () => router.navigate(BALANCES_ACCOUNTS),
        onOpenDebts: () => router.navigate(BALANCES_ACCOUNTS),
        overview: accountsOverview,
        showCents,
    };

    const toolbar = (
        <LogToolbar
            period={period}
            onPeriod={(next) => {
                setNumberSetting({ db, key: "logInsightsTimeFrame", value: storedLogPeriod(next) });
            }}
            filter={filter}
            onFilter={(next) => {
                setNarrowed(null);
                setFilter(next);
            }}
            onSearch={() => router.push("/search")}
        />
    );

    if (listRows.length === 0 && tailRows.length === 0 && listFilter === "all") {
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
                    if (listFilter === "all" && !reachedEnd) {
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
                                bars={bars}
                                nowMs={nowMs}
                                insights={insights}
                                limit={{
                                    budget: mainBudget,
                                    currency: globalCurrency,
                                    nowMs,
                                    onPress: () => router.push("/balances/overall"),
                                }}
                                narrowed={narrowed}
                                onNarrow={setNarrowed}
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
                                firstWeekday={firstWeekday}
                                nowMs={nowMs}
                                onClear={() => setFilter("all")}
                                totals={scopeFigures}
                                measure={measure}
                                onMeasure={onMeasure}
                                displayCurrency={currency}
                            />
                        )}
                        {listFilter === "all" ? (
                            <LogShelf
                                upcoming={upcomingRows}
                                accounts={accountRows}
                                overview={accountsOverview}
                                debts={debts}
                                currency={currency}
                                rates={rates}
                                showCents={showCents}
                                nowMs={nowMs}
                                onOpenUpcoming={() => router.push("/settings/upcoming")}
                                onOpenAccounts={() => router.navigate(BALANCES_ACCOUNTS)}
                                onOpenDebts={() => router.navigate(BALANCES_ACCOUNTS)}
                            />
                        ) : null}
                        {listFilter === "all" && waiting > 0 ? (
                            <LogAutologPaused onPress={() => router.push(paywallHref("autolog"))} waiting={waiting} />
                        ) : null}
                        {filter === "upcoming" ? (
                            <UpcomingList
                                transactions={upcomingRows}
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
                renderSectionHeader={({ section }) => {
                    const newIds = section.data.flatMap((row) => (row.unreviewed ? [row.id] : []));
                    return (
                        <DaySectionHeader
                            section={section}
                            first={section.first}
                            label={monthly ? formatMonthHeader(section.day, language) : undefined}
                            newCount={newIds.length}
                            onConfirmNew={() => markReviewed({ db, ids: newIds })}
                            onShare={monthly ? undefined : () => shareDay(section)}
                        />
                    );
                }}
                renderItem={({ item }) => (
                    <SwipeableTransactionRow
                        transaction={item}
                        currency={currency}
                        dated={monthly}
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
