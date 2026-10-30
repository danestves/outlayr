import { landingDate } from "@outlayr/money/recurrence";
import type { RateTable } from "@outlayr/money/valuation";
import { View } from "react-native";

import type { ActionMenuItem } from "@/components/action-menu";
import { intervalPhrase } from "@/components/custom-schedule-sheet";
import { MonoLabel } from "@/components/mono-label";
import { TransactionRow } from "@/components/transaction-row";
import { cn } from "@/components/tw";
import type { TransactionWithCategory } from "@/data/transactions";
import { formatDueDay, monthLongTitle } from "@/domain/dates";
import { foldFees, valueRows } from "@/domain/day-sections";
import { cadenceLabel } from "@/domain/transaction-form-labels";
import { groupByMonth } from "@/domain/upcoming";
import { useLanguage, useTranslation } from "@/i18n/context";

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
