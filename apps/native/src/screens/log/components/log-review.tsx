import type { RateTable } from "@outlayr/money/valuation";
import { Pressable, View } from "react-native";

import type { ActionMenuItem } from "@/components/action-menu";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { ReviewRow } from "@/data/review-queue";
import type { TransactionWithCategory } from "@/data/transactions";
import { latestSync, SHELF_ROWS, syncedWhen } from "@/domain/review-queue";
import { useBankOverview } from "@/hooks/use-bank-overview";
import { useLanguage, useTranslation } from "@/i18n/context";
import { STRIPE_READY } from "@/lib/stripe-link";

import { SwipeableTransactionRow } from "./swipeable-transaction-row";

interface LogReviewProps {
    authorOf: (createdBy: string | null | undefined, unsent: boolean) => string | null;
    currency: string;
    menuItems: (transaction: TransactionWithCategory) => readonly ActionMenuItem[];
    nowMs: number;
    onConfirm: (ids: readonly string[]) => void;
    onDelete: (id: string) => void;
    onOpenAll: () => void;
    onPress: (id: string) => void;
    rates: RateTable;
    rows: readonly ReviewRow[];
}

export function LogReview(props: LogReviewProps) {
    return props.rows.length === 0 ? <ReviewedLine nowMs={props.nowMs} /> : <ReviewShelf {...props} />;
}

function ReviewShelf({
    authorOf,
    currency,
    menuItems,
    onConfirm,
    onDelete,
    onOpenAll,
    onPress,
    rates,
    rows,
}: LogReviewProps) {
    const t = useTranslation();
    const shown = rows.slice(0, SHELF_ROWS);

    return (
        <View className="pt-6">
            <View className="gap-1.5">
                <View className="flex-row items-baseline justify-between gap-2">
                    <MonoLabel accessibilityRole="header" className="text-tint">
                        {t("log.review.title", { count: rows.length })}
                    </MonoLabel>
                    <Pressable
                        accessibilityRole="button"
                        className="active:opacity-60"
                        onPress={() => onConfirm(rows.map((row) => row.id))}
                    >
                        <Text className="text-tint text-subtitle font-sans-semibold">
                            {t("log.autolog.confirmAll")}
                        </Text>
                    </Pressable>
                </View>
                {/* A 1.3 stroke with round caps, like the Log's own section rules. */}
                <View className="bg-border" style={{ borderRadius: 0.65, height: 1.3 }} />
            </View>
            {shown.map((row, index) => (
                <View key={row.id}>
                    {index > 0 ? <View className="bg-border ml-11 h-px" /> : null}
                    <SwipeableTransactionRow
                        author={authorOf(row.createdBy, row.unsent)}
                        currency={currency}
                        dated
                        menuItems={menuItems(row)}
                        onConfirm={(id) => onConfirm([id])}
                        onDelete={onDelete}
                        onPress={onPress}
                        rates={rates}
                        transaction={row}
                    />
                </View>
            ))}
            {rows.length > SHELF_ROWS ? (
                <Pressable accessibilityRole="button" className="self-start py-2 active:opacity-60" onPress={onOpenAll}>
                    <Text className="text-tint text-subtitle font-sans-semibold">
                        {t("log.review.seeAll", { count: rows.length })}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
}

function ReviewedLine({ nowMs }: { nowMs: number }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const overview = useBankOverview();
    const synced = STRIPE_READY && overview.kind === "ready" ? latestSync(overview.overview.accounts) : null;
    if (synced === null) {
        return null;
    }
    return (
        <Text className="text-muted text-footnote pt-4 font-sans" numberOfLines={1}>
            {t("log.review.allReviewed", {
                bank: synced.institution,
                when: syncedWhen(synced.pulledAt, nowMs, use24Hour, language),
            })}
        </Text>
    );
}
