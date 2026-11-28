import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useIsFocused, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountsHiddenContext } from "@/components/amount-text";
import { EditorCta } from "@/components/editor-cta";
import { MonoLabel } from "@/components/mono-label";
import { useDisplaySettings, useSetting } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccounts } from "@/data/accounts";
import { goesWithPendingDelete } from "@/data/card-fees-core";
import { useReviewQueue } from "@/data/review-queue";
import type { ReviewRow } from "@/data/review-queue";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import { useValuation } from "@/data/use-valuation";
import { groupByAccount, lastSyncInto, syncedWhen } from "@/domain/review-queue";
import { useBankOverview } from "@/hooks/use-bank-overview";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useWhen } from "@/lib/lifecycle";
import { STRIPE_READY } from "@/lib/stripe-link";
import { useTransactionRowActions } from "@/lib/use-transaction-row-actions";
import { SwipeableTransactionRow } from "@/screens/log/components/swipeable-transaction-row";
import { useEntryAuthors } from "@/screens/log/use-entry-authors";
import { markReviewedCommand } from "@/state/review-commands";
import { useAtomCommand } from "@/state/use-atom-command";

export function Review() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const insets = useSafeAreaInsets();
    const { displayCurrency: currency, rates } = useValuation(db);
    const nowMs = useNow();
    const markReviewed = useAtomCommand(markReviewedCommand);
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const openRowActions = useTransactionRowActions(nowMs, requestDelete);
    const rows = useReviewQueue(db).filter((row) => !goesWithPendingDelete(row, pendingId));
    const { authorOf } = useEntryAuthors(rows);
    const amountsHidden = useSetting("hideAmounts");
    const accountNames = new Map(useAccounts(db).map((account) => [account.id, account.name]));

    const [closing, setClosing] = useState(false);

    // Closing on the emptied queue, not per call, covers swipes that overlap before the list re-renders.
    // Waiting for focus keeps back from popping an editor opened over the sheet instead.
    const [confirmed, setConfirmed] = useState(false);
    const focused = useIsFocused();
    useWhen(confirmed && focused && rows.length === 0, () => {
        router.back();
    });

    const confirm = async (ids: readonly string[]) => {
        const result = await markReviewed({ db, ids });
        setClosing(false);
        if (AsyncResult.isSuccess(result)) {
            setConfirmed(true);
            return;
        }
        // A toast would sit under this modal sheet.
        Alert.alert(t("log.review.confirmFailed"));
    };

    const confirmAll = () => {
        if (closing) {
            return;
        }
        setClosing(true);
        void confirm(rows.map((row) => row.id));
    };

    return (
        <AmountsHiddenContext value={amountsHidden}>
            <View className="bg-background flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 20 }}
                    contentInsetAdjustmentBehavior="automatic"
                >
                    {groupByAccount(rows).map((group) => (
                        <View className="pt-5" key={group.accountId ?? "none"}>
                            <GroupHeader
                                accountId={group.accountId}
                                name={(group.accountId && accountNames.get(group.accountId)) || t("log.review.unfiled")}
                                nowMs={nowMs}
                            />
                            {group.rows.map((row, index) => (
                                <View key={row.id}>
                                    {index > 0 ? <View className="bg-border ml-11 h-px" /> : null}
                                    <SwipeableTransactionRow
                                        author={authorOf(row.createdBy, row.unsent)}
                                        currency={currency}
                                        dated
                                        menuItems={openRowActions(row, false)}
                                        onConfirm={(id) => {
                                            void confirm([id]);
                                        }}
                                        onDelete={requestDelete}
                                        onPress={(id) => router.push(`/transactions/${id}`)}
                                        rates={rates}
                                        transaction={row}
                                    />
                                </View>
                            ))}
                        </View>
                    ))}
                </ScrollView>
                {rows.length > 0 ? (
                    <View className="px-5 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
                        <EditorCta
                            busy={closing}
                            canSave
                            label={t("log.review.confirmAll", { count: rows.length })}
                            onPress={confirmAll}
                        />
                    </View>
                ) : null}
            </View>
        </AmountsHiddenContext>
    );
}

interface GroupHeaderProps {
    accountId: ReviewRow["accountId"];
    name: string;
    nowMs: number;
}

function GroupHeader({ accountId, name, nowMs }: GroupHeaderProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const overview = useBankOverview();
    const pulledAt =
        STRIPE_READY && overview.kind === "ready" ? lastSyncInto(overview.overview.accounts, accountId) : null;

    return (
        <View className="gap-1.5 pb-1">
            <MonoLabel accessibilityRole="header" numberOfLines={1}>
                {pulledAt === null
                    ? name
                    : t("log.review.synced", { account: name, when: syncedWhen(pulledAt, nowMs, use24Hour, language) })}
            </MonoLabel>
            {/* A 1.3 stroke with round caps, like the Log's own section rules. */}
            <View className="bg-border" style={{ borderRadius: 0.65, height: 1.3 }} />
        </View>
    );
}
