import { and, eq, isNull } from "drizzle-orm";
import { View } from "react-native";

import { PickerRow, SettingsSection } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useBankAccounts } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import { META_KEYS } from "@/data/app-meta-core";
import { useLiveQuery, useLiveValue } from "@/data/live-query";
import { cardStatus, parseWalletCards, pickCardAccount } from "@/data/pending-writes-core";
import type { Database } from "@/db/client";
import { appMeta, transactions } from "@/db/schema";
import { formatChargeDate, formatSentenceDate, formatTime } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";

export function LastEntry({ db, txId }: { db: Database; txId: string }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents, use24Hour } = useDisplaySettings().state;
    const ledgerCurrency = useGlobalCurrency(db);
    const accounts = useBankAccounts(db);
    const rows = useLiveQuery(
        transactions,
        () =>
            db
                .select({
                    accountId: transactions.accountId,
                    amount: transactions.amount,
                    currency: transactions.currency,
                    date: transactions.date,
                    note: transactions.note,
                })
                .from(transactions)
                .where(and(eq(transactions.id, txId), isNull(transactions.deletedAt)))
                .limit(1),
        [txId]
    );
    const [row] = rows;
    if (!row) {
        // Deleted, or erased: the next purchase writes a fresh pointer.
        return null;
    }
    const account = accounts.find((candidate) => candidate.id === row.accountId);
    const when = `${formatChargeDate(row.date, undefined, language)} ${formatTime(row.date, use24Hour, language)}`;
    const parts = [row.note, account?.name ?? t("settings.wallet.unattached"), when];

    return (
        <ProofBlock
            detail={parts.join(" · ")}
            title={formatAmount(row.amount, row.currency ?? ledgerCurrency, showCents, language)}
        />
    );
}

export function ProofBlock({ title, detail, label }: { detail: string; label?: string; title: string }) {
    const t = useTranslation();
    return (
        <View className="gap-1.5 pt-6">
            <MonoLabel>{label ?? t("settings.wallet.lastSection")}</MonoLabel>
            <Text className="text-foreground text-title tabular-nums">{title}</Text>
            <Text className="text-muted text-subtitle" numberOfLines={2}>
                {detail}
            </Text>
        </View>
    );
}

const NO_ACCOUNT = "";
const UNPICKED = "unpicked";

export function CardsSection({ db }: { db: Database }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const accounts = useBankAccounts(db);
    const raw = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.walletCards)),
        (rows) => rows[0]?.value ?? null
    );
    const cards = parseWalletCards(raw).sort((a, b) => b.lastAt - a.lastAt);
    const options = [
        ...accounts.map((account) => ({ label: account.name, value: account.id })),
        { label: t("settings.wallet.unattached"), value: NO_ACCOUNT },
    ];

    return (
        <SettingsSection footer={t("settings.wallet.cardsFooter")} title={t("settings.wallet.cardsSection")}>
            {cards.length === 0 ? (
                <Text className="text-muted text-body py-3.5">{t("settings.wallet.noCards")}</Text>
            ) : (
                cards.map((card) => {
                    const { account, asks: unpicked } = cardStatus(card.text, cards, accounts);
                    const accountId = account?.id ?? (unpicked ? UNPICKED : NO_ACCOUNT);
                    return (
                        <PickerRow
                            attention={!account}
                            detail={t("settings.wallet.lastTap", {
                                when: formatSentenceDate(new Date(card.lastAt), language),
                            })}
                            icon="CreditCard"
                            key={card.text}
                            onChange={(next) => {
                                if (next === UNPICKED) {
                                    return;
                                }
                                pickCardAccount(db, card.text, next || null).catch((error) => {
                                    console.warn("[outlayr] card pick failed", error);
                                });
                            }}
                            options={
                                unpicked
                                    ? [{ label: t("settings.wallet.chooseAccount"), value: UNPICKED }, ...options]
                                    : options
                            }
                            title={card.text}
                            value={accountId}
                        />
                    );
                })
            )}
        </SettingsSection>
    );
}
