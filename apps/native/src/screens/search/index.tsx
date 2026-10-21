import { SectionList } from "@legendapp/list/section-list";
import { cellFigures, toCells } from "@outlayr/money/currency-totals";
import type { CurrencyFigures } from "@outlayr/money/currency-totals";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { MeasureCellAmount } from "@/components/amount-text";
import { DaySectionHeader } from "@/components/day-section-header";
import { MonoLabel } from "@/components/mono-label";
import { TransactionRow } from "@/components/transaction-row";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { goesWithPendingDelete } from "@/data/card-fees-core";
import { useSearchedTransactions } from "@/data/log-search";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import { groupByDay } from "@/domain/day-sections";
import { useTranslation } from "@/i18n/context";
import { useTransactionRowActions } from "@/lib/use-transaction-row-actions";

import { SearchBar } from "./components/search-bar";
import { SearchEmptyState } from "./components/search-empty-state";

const READ_DEBOUNCE_MS = 150;

function emptyState(query: string, rowCount: number) {
    if (query.trim() === "") {
        return <SearchEmptyState kind="idle" />;
    }
    if (rowCount === 0) {
        return <SearchEmptyState kind="noResults" query={query} />;
    }
    return null;
}

/** A modal: pinning a field open on the Log forces its title inline. */
export function Search() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { displayCurrency: currency, rates } = useValuation(db);
    const { showCents } = useDisplaySettings().state;
    const [query, setQuery] = useState("");
    const [readQuery, setReadQuery] = useState("");
    const nowMs = useNow();
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const openRowActions = useTransactionRowActions(nowMs, requestDelete);

    useEffect(() => {
        const timer = setTimeout(() => setReadQuery(query), READ_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);

    const found = useSearchedTransactions(db, readQuery, nowMs);
    const rows = useMemo(() => found.filter((row) => !goesWithPendingDelete(row, pendingId)), [found, pendingId]);
    const sections = useMemo(() => groupByDay(rows, currency, rates), [rows, currency, rates]);
    const figures = useMemo(() => cellFigures(toCells(rows), currency, rates), [rows, currency, rates]);

    const empty = emptyState(query.trim() === "" ? "" : readQuery, rows.length);

    return (
        <>
            <SearchBar onChangeText={setQuery} onClose={() => router.back()} placeholder={t("search.placeholder")} />
            {empty ? (
                // A scroller, so a drag can put away the keyboard the focused field arrives with.
                <ScrollView
                    className="bg-background flex-1"
                    contentContainerStyle={{ flexGrow: 1 }}
                    contentInsetAdjustmentBehavior="automatic"
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                >
                    {empty}
                </ScrollView>
            ) : (
                <SectionList
                    className="bg-background"
                    contentContainerStyle={{
                        paddingBottom: 40,
                        paddingHorizontal: 20,
                    }}
                    contentInsetAdjustmentBehavior="automatic"
                    keyboardDismissMode="on-drag"
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={
                        <SearchResultsTotal
                            count={sections.reduce((count, section) => count + section.data.length, 0)}
                            figures={figures}
                            showCents={showCents}
                        />
                    }
                    recycleItems
                    renderItem={({ item }) => (
                        <TransactionRow
                            currency={currency}
                            menuItems={openRowActions(item, false)}
                            onPress={(id) => router.push(`/transactions/${id}`)}
                            rates={rates}
                            transaction={item}
                        />
                    )}
                    renderSectionHeader={({ section }) => <DaySectionHeader section={section} />}
                    sections={sections}
                />
            )}
        </>
    );
}

interface SearchResultsTotalProps {
    count: number;
    figures: readonly CurrencyFigures[];
    showCents: boolean;
}

/** A block per currency: one figure across them would be invented. */
function SearchResultsTotal({ figures, count, showCents }: SearchResultsTotalProps) {
    const t = useTranslation();
    const named = figures.length > 1;

    return (
        <View className="gap-2.5 pt-3.5 pb-1.5">
            <MonoLabel>{t("search.results.count", { count })}</MonoLabel>
            {figures.map((entry) => {
                const net = entry.income - entry.expense;
                const cells = [
                    {
                        // Only money coming in earns the income colour.
                        income: true,
                        key: "in",
                        label: t("search.results.in"),
                        magnitude: entry.income,
                        positive: true,
                    },
                    {
                        income: false,
                        key: "out",
                        label: t("search.results.out"),
                        magnitude: entry.expense,
                        positive: false,
                    },
                    {
                        income: false,
                        key: "net",
                        label: t("search.results.net"),
                        magnitude: Math.abs(net),
                        positive: net >= 0,
                    },
                ];

                return (
                    <View className="gap-1.25" key={entry.currencyCode}>
                        {named ? <MonoLabel>{entry.currencyCode}</MonoLabel> : null}
                        <View className="bg-border h-px w-full" />
                        <View className="flex-row">
                            {cells.map((cell) => (
                                <View className="flex-1 gap-0.75 py-2.5" key={cell.key}>
                                    <MonoLabel>{cell.label}</MonoLabel>
                                    <MeasureCellAmount
                                        code={entry.currencyCode}
                                        income={cell.income}
                                        magnitude={cell.magnitude}
                                        positive={cell.positive}
                                        showCents={showCents}
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}
