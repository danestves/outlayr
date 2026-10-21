import { currencyTotals } from "@outlayr/money/currency-totals";
import { landingDate } from "@outlayr/money/recurrence";
import { monthlySubscriptionCost } from "@outlayr/money/subscription-cost";
import type { RateTable } from "@outlayr/money/valuation";
import { useMemo } from "react";
import { View } from "react-native";

import type { ActionMenuItem } from "@/components/action-menu";
import { DayTotal } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { TransactionRow } from "@/components/transaction-row";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { TransactionWithCategory } from "@/data/transactions";
import { foldFees, valueRows } from "@/domain/day-sections";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useTranslation } from "@/i18n/context";

interface LogUpcomingProps {
    currency: string;
    /** Frozen "now", so a row's landing date does not drift mid-session. */
    nowMs: number;
    menuItems: (transaction: TransactionWithCategory) => readonly ActionMenuItem[];
    onPress: (id: string) => void;
    /** Supplied so totals convert against the caller's display currency. */
    rates: RateTable;
    /** Every schedule: a monthly cost over the two-week clip jumps when a yearly renewal enters it. */
    schedules: TransactionWithCategory[];
    transactions: TransactionWithCategory[];
}

export function LogUpcoming({ transactions, schedules, currency, rates, onPress, menuItems, nowMs }: LogUpcomingProps) {
    const { showCents } = useDisplaySettings().state;
    const now = new Date(nowMs);
    const t = useTranslation();
    const largeText = useAccessibilityTextSize();
    const headerRow = cn("flex-row items-baseline justify-between gap-2", largeText && "flex-wrap");
    // Valued at the coming charge: a renewal's saved date can predate every held rate.
    const charges = useMemo(
        () => transactions.map((transaction) => ({ ...transaction, date: landingDate(transaction, new Date(nowMs)) })),
        [transactions, nowMs]
    );
    const totals = useMemo(() => currencyTotals(charges, currency, rates), [charges, currency, rates]);
    // The rows keep their stored date, which the menu reads, and only borrow the value.
    const rows = useMemo(() => {
        const valued = valueRows(charges, currency, rates);
        return foldFees(
            transactions.map((transaction, index) => ({ ...transaction, valued: valued[index]?.valued ?? null }))
        );
    }, [transactions, charges, currency, rates]);
    const perMonth = useMemo(
        () => monthlySubscriptionCost(schedules, currency, rates, new Date(nowMs)),
        [schedules, currency, rates, nowMs]
    );
    const showPerMonth = perMonth.some((bucket) => bucket.transactionCount > 0);

    if (transactions.length === 0) {
        return null;
    }

    return (
        <View className="pb-4.5">
            <View className="gap-1.25 pt-2.5">
                <View className={headerRow}>
                    <MonoLabel>{t("log.upcoming.heading")}</MonoLabel>
                    <DayTotal showCents={showCents} sizeClass="text-body" totals={totals} />
                </View>
                <View className="bg-border" style={{ borderRadius: 0.65, height: 1.3 }} />
                {showPerMonth ? (
                    <View className={headerRow}>
                        <MonoLabel>{t("log.upcoming.perMonth")}</MonoLabel>
                        <DayTotal showCents={showCents} totals={perMonth} />
                    </View>
                ) : null}
            </View>
            {rows.map((transaction) => (
                <TransactionRow
                    currency={currency}
                    future
                    key={transaction.id}
                    landsOn={landingDate(transaction, now)}
                    menuItems={menuItems(transaction)}
                    onPress={onPress}
                    rates={rates}
                    transaction={transaction}
                />
            ))}
        </View>
    );
}
