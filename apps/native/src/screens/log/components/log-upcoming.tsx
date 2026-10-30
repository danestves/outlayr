import { landingDate } from "@outlayr/money/recurrence";
import { monthlySubscriptionCost } from "@outlayr/money/subscription-cost";
import type { RateTable } from "@outlayr/money/valuation";
import { use } from "react";
import { Pressable, View } from "react-native";

import type { ActionMenuItem } from "@/components/action-menu";
import { AmountsHiddenContext, DayTotal } from "@/components/amount-text";
import { intervalPhrase } from "@/components/custom-schedule-sheet";
import { MonoLabel } from "@/components/mono-label";
import { TransactionRow } from "@/components/transaction-row";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { TransactionWithCategory } from "@/data/transactions";
import { formatSignedAmount } from "@/domain/account-display";
import { formatDueDay, monthLongTitle } from "@/domain/dates";
import { foldFees, valueRows } from "@/domain/day-sections";
import { cadenceLabel } from "@/domain/transaction-form-labels";
import { groupByMonth } from "@/domain/upcoming";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";

const MAX_ROWS = 4;

interface UpcomingRowsProps {
    currency: string;
    menuItems: (transaction: TransactionWithCategory) => readonly ActionMenuItem[];
    /** Frozen "now", so a row's landing date does not drift mid-session. */
    nowMs: number;
    onPress: (id: string) => void;
    rates: RateTable;
    transactions: TransactionWithCategory[];
}

function upcomingRows({ transactions, currency, rates, nowMs }: UpcomingRowsProps) {
    const now = new Date(nowMs);
    // Valued at the coming charge: a renewal's saved date can predate every held rate.
    const valued = valueRows(
        transactions.map((transaction) => ({ ...transaction, date: landingDate(transaction, now) })),
        currency,
        rates
    );
    // The rows keep their stored date, which the menu reads, and only borrow the value.
    return foldFees(
        transactions.map((transaction, index) => ({ ...transaction, valued: valued[index]?.valued ?? null }))
    );
}

interface UpcomingRowProps extends Omit<UpcomingRowsProps, "transactions"> {
    transaction: TransactionWithCategory;
}

function UpcomingRow({ transaction, currency, rates, nowMs, onPress, menuItems }: UpcomingRowProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const now = new Date(nowMs);
    const { recurringCoefficient: every, recurringType } = transaction;
    const day = formatDueDay(landingDate(transaction, now), now, language);
    const cadence =
        every > 1
            ? t("transaction.schedule.every", { interval: intervalPhrase(t, recurringType, every) })
            : cadenceLabel(t, recurringType);

    return (
        <TransactionRow
            currency={currency}
            future
            menuItems={menuItems(transaction)}
            onPress={onPress}
            rates={rates}
            transaction={transaction}
            upcomingLabel={recurringType > 0 ? `${day} · ${cadence}` : day}
        />
    );
}

interface LogUpcomingProps extends UpcomingRowsProps {
    expanded: boolean;
    onOpenAll: () => void;
    /** Every schedule: a monthly cost over the two-week clip jumps when a yearly renewal enters it. */
    schedules: TransactionWithCategory[];
}

export function LogUpcoming({ expanded, schedules, onOpenAll, ...props }: LogUpcomingProps) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const stacked = useAccessibilityTextSize();
    const rows = upcomingRows(props);
    const perMonth = monthlySubscriptionCost(schedules, props.currency, props.rates, new Date(props.nowMs));
    const showPerMonth = perMonth.some((bucket) => bucket.transactionCount > 0);

    if (expanded) {
        return <UpcomingList {...props} />;
    }
    if (rows.length === 0) {
        return null;
    }

    const overflow = rows.length > MAX_ROWS;
    const shown = overflow ? rows.slice(0, MAX_ROWS - 1) : rows;
    const heading = `${t("log.upcoming.heading")} · ${rows.length}`;
    const perMonthText = hidden
        ? t("log.amounts.hidden")
        : perMonth
              .map((bucket) => formatSignedAmount(bucket.amount, bucket.currencyCode, showCents, language))
              .join(" / ");

    return (
        <View className="gap-1.25 pt-2.5 pb-4.5">
            <Pressable
                accessibilityHint={t("log.upcoming.openHint")}
                accessibilityLabel={heading}
                accessibilityRole="button"
                accessibilityValue={
                    showPerMonth ? { text: `${t("log.upcoming.perMonth")} ${perMonthText}` } : undefined
                }
                className={cn(
                    "active:opacity-70",
                    stacked ? "gap-0.75" : "flex-row items-baseline justify-between gap-2"
                )}
                onPress={onOpenAll}
            >
                <MonoLabel>{`${heading}  ›`}</MonoLabel>
                {showPerMonth ? (
                    <View className={cn("flex-row items-baseline gap-1.5", stacked && "flex-wrap")}>
                        <MonoLabel>{t("log.upcoming.perMonth")}</MonoLabel>
                        <DayTotal showCents={showCents} sizeClass="text-body" totals={perMonth} />
                    </View>
                ) : null}
            </Pressable>
            {shown.map((transaction) => (
                <UpcomingRow key={transaction.id} transaction={transaction} {...props} />
            ))}
            {overflow ? (
                <Pressable accessibilityRole="button" className="py-2 active:opacity-70" onPress={onOpenAll}>
                    <MonoLabel className="text-tint">
                        {t("log.upcoming.more", { count: rows.length - shown.length })}
                    </MonoLabel>
                </Pressable>
            ) : null}
            <View className="bg-border" style={{ borderRadius: 0.65, height: 1.3 }} />
        </View>
    );
}

export function UpcomingList(props: UpcomingRowsProps) {
    const { language } = useLanguage();
    const now = new Date(props.nowMs);
    const months = groupByMonth(upcomingRows(props), (row) => landingDate(row, now));

    return (
        <View>
            {months.map(({ month, rows }, index) => (
                <View key={month.getTime()}>
                    <View className={cn("gap-1.25", index === 0 ? "pt-2.5" : "pt-7")}>
                        <MonoLabel accessibilityRole="header">
                            {month.getFullYear() === now.getFullYear()
                                ? monthLongTitle(month, language)
                                : `${monthLongTitle(month, language)} ${month.getFullYear()}`}
                        </MonoLabel>
                        <View className="bg-border" style={{ borderRadius: 0.65, height: 1.3 }} />
                    </View>
                    {rows.map((transaction) => (
                        <UpcomingRow key={transaction.id} transaction={transaction} {...props} />
                    ))}
                </View>
            ))}
        </View>
    );
}
