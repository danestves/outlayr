import { useMemo, useState } from "react";
import { View } from "react-native";

import { DaySectionHeader } from "@/components/day-section-header";
import { EmptyState } from "@/components/empty-state";
import { Hairline } from "@/components/empty-state-parts";
import { Fade } from "@/components/mark-motion";
import { RowPressable } from "@/components/row-pressable";
import { ROW_TYPE } from "@/components/row-type";
import { Text } from "@/components/text";
import { TransactionRow } from "@/components/transaction-row";
import { TILE_SIZE } from "@/components/transfer-tile";
import { cn } from "@/components/tw";
import { useDatabase } from "@/contexts/local-data-context";
import { goesWithPendingDelete } from "@/data/card-fees-core";
import type { TransactionWithCategory } from "@/data/transactions";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import { capAtDayEnd, foldFees, groupByDay, valueRows } from "@/domain/day-sections";
import { useTranslation } from "@/i18n/context";
import { useTransactionRowActions } from "@/lib/use-transaction-row-actions";
import { MARK_CEILING } from "@/theme/empty-state-ink";
import { MARK_MOTION, recedeDelay } from "@/theme/mark-motion";

/** A grouped list runs on to the end of the last row's day. */
const LIST_CAP = 50;

interface InsightsTransactionListProps {
    currency: string;
    grouped?: boolean;
    onPress: (id: string) => void;
    onRequestDelete: (id: string) => void;
    /** The screen owns the delete: this list unmounts with its selection, which would flush the write early. */
    pendingDeleteId: string | null;
    transactions: TransactionWithCategory[];
}

export function InsightsTransactionList({
    transactions,
    currency,
    onPress,
    grouped = true,
    pendingDeleteId,
    onRequestDelete,
}: InsightsTransactionListProps) {
    const db = useDatabase();
    const { rates } = useValuation(db);
    const nowMs = useNow();
    const openRowActions = useTransactionRowActions(nowMs, onRequestDelete);
    const [showAll, setShowAll] = useState(false);
    const rows = useMemo(
        () => transactions.filter((transaction) => !goesWithPendingDelete(transaction, pendingDeleteId ?? null)),
        [transactions, pendingDeleteId]
    );
    const cut = showAll ? rows.length : capAtDayEnd(rows, LIST_CAP);
    const sections = useMemo(
        () => (grouped ? groupByDay(rows.slice(0, cut), currency, rates) : []),
        [grouped, rows, cut, currency, rates]
    );

    if (rows.length === 0) {
        return <InsightsNoResults />;
    }

    const row = (transaction: TransactionWithCategory) => (
        <TransactionRow
            currency={currency}
            key={transaction.id}
            menuItems={openRowActions(transaction, false)}
            onPress={onPress}
            rates={rates}
            transaction={transaction}
        />
    );

    if (!grouped) {
        const list = foldFees(valueRows(rows, currency, rates));
        const shown = showAll ? list : list.slice(0, LIST_CAP);
        return (
            <View>
                {shown.map(row)}
                <ShowAllRow hidden={list.length - shown.length} onPress={() => setShowAll(true)} />
            </View>
        );
    }

    return (
        <View>
            {sections.map((section, index) => (
                <View key={section.day.getTime()}>
                    <DaySectionHeader first={index === 0} section={section} />
                    {section.data.map(row)}
                </View>
            ))}
            <ShowAllRow hidden={foldFees(rows.slice(cut)).length} onPress={() => setShowAll(true)} />
        </View>
    );
}

function ShowAllRow({ hidden, onPress }: { hidden: number; onPress: () => void }) {
    const t = useTranslation();
    if (hidden === 0) {
        return null;
    }
    return (
        <RowPressable accessibilityRole="button" className="flex-row items-center gap-3 py-2" onPress={onPress}>
            <View style={{ height: TILE_SIZE, width: TILE_SIZE }} />
            <Text className={cn(ROW_TYPE.title, "text-tint flex-1")} numberOfLines={1}>
                {t("insights.list.showAll")}
            </Text>
            <Text className={cn(ROW_TYPE.subtitle, "text-muted tabular-nums")} numberOfLines={1}>
                {t("insights.list.more", { count: hidden })}
            </Text>
        </RowPressable>
    );
}

function InsightsNoResults() {
    const t = useTranslation();
    return <EmptyState body={t("insights.list.empty")} mark={<RulesEmptied />} tier="inFlow" />;
}

function RulesEmptied() {
    const RULES = [1, 0.62, 0.34, 0.15];
    return (
        <View style={{ gap: 13, width: MARK_CEILING.inFlow }}>
            {RULES.map((opacity, index) => (
                <Fade delay={recedeDelay(index)} duration={MARK_MOTION.recede.duration} key={opacity} to={opacity}>
                    <Hairline />
                </Fade>
            ))}
        </View>
    );
}
