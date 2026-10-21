import { Pressable, View } from "react-native";

import { RowAmount } from "@/components/amount-text";
import { EmptyState } from "@/components/empty-state";
import { Bar, GhostAvatar, Slot } from "@/components/empty-state-parts";
import { SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useLiveQuery } from "@/data/live-query";
import { deletedTransactionsQuery, transactionsRepo } from "@/data/transactions-core";
import type { DeletedTransaction } from "@/data/transactions-core";
import { transactions } from "@/db/schema";
import { formatDayHeader } from "@/domain/dates";
import { useLanguage, useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";

export function RecentlyDeleted() {
    const db = useDatabase();
    const t = useTranslation();
    const currency = useGlobalCurrency(db);
    const rows = useLiveQuery(transactions, () => deletedTransactionsQuery(db));

    const restore = (id: string) => {
        transactionsRepo.restore(db, id).catch((cause: unknown) => {
            console.error("Restore failed", cause);
            notifyFailure({ body: t("settings.deleted.failedBody"), title: t("settings.deleted.failedTitle") });
        });
    };

    return (
        <SettingsScreen>
            <SettingsSection
                footer={rows.length > 0 ? t("settings.deleted.footer") : undefined}
                title={t("settings.deleted.section")}
            >
                {rows.length === 0 ? (
                    <EmptyState body={t("settings.deleted.empty")} mark={<HeldSlot />} tier="insetRow" />
                ) : (
                    rows.map((row) => (
                        <DeletedRow currency={currency} key={row.id} onRestore={() => restore(row.id)} row={row} />
                    ))
                )}
            </SettingsSection>
        </SettingsScreen>
    );
}

function HeldSlot() {
    return (
        <Slot height={27} radius={6} width={34}>
            <View className="flex-1 flex-row items-center gap-1.5 px-1.5">
                <GhostAvatar size={7} />
                <View className="gap-1">
                    <Bar height={2.5} width={12} />
                    <Bar height={2.5} width={7} />
                </View>
            </View>
        </Slot>
    );
}

function DeletedRow({
    row,
    currency,
    onRestore,
}: {
    row: DeletedTransaction;
    currency: string;
    onRestore: () => void;
}) {
    const { showCents } = useDisplaySettings().state;
    const t = useTranslation();
    const { language } = useLanguage();
    // Tombstones only: the fallback just satisfies nullability.
    const when = row.deletedAt ?? row.date;

    return (
        <View className="border-border flex-row items-center gap-3 border-b py-3.5">
            <View className="flex-1 gap-0.5">
                <Text className="text-body text-foreground" numberOfLines={1}>
                    {row.note}
                </Text>
                <Text className="text-muted text-subtitle">
                    {t("settings.deleted.deletedOn", { date: formatDayHeader(when, undefined, language) })}
                </Text>
            </View>
            <RowAmount
                amount={row.amount}
                code={row.currency ?? currency}
                income={row.income}
                isFuture={false}
                showCents={showCents}
            />
            <Pressable
                // Every button says "Restore", so the entry is named for screen readers.
                accessibilityLabel={t("settings.deleted.restoreEntry", {
                    note: row.note,
                })}
                accessibilityRole="button"
                className="active:opacity-60"
                onPress={onRestore}
            >
                <Text className="font-sans-semibold text-subtitle text-tint">{t("settings.deleted.restore")}</Text>
            </Pressable>
        </View>
    );
}
