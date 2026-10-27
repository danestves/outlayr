import { and, eq, isNull } from "drizzle-orm";
import * as Cause from "effect/Cause";
import { Image } from "expo-image";
import { Carousel } from "panelui-native/components/carousel";
import { View } from "react-native";
import type { ImageRequireSource } from "react-native";

import { PickerRow, SettingsSection } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useBankAccounts } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import { META_KEYS } from "@/data/app-meta-core";
import { useLiveQuery, useLiveValue } from "@/data/live-query";
import { cardStatus, parseWalletCards } from "@/data/pending-writes-core";
import type { Database } from "@/db/client";
import { appMeta, transactions } from "@/db/schema";
import { formatChargeDate, formatSentenceDate, formatTime } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import { SILENT } from "@/state/atom-command";
import { pickCardAccountCommand } from "@/state/lifecycle-commands";
import { useAtomAction } from "@/state/use-atom-action";

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
    const pickCardAccount = useAtomAction(
        pickCardAccountCommand,
        { onFailure: (cause) => console.warn("[outlayr] card pick failed", Cause.squash(cause)) },
        SILENT
    );
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
                                pickCardAccount({ accountId: next || null, db, text: card.text });
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

export interface Step {
    detail?: TranslationKey;
    frame?: ImageRequireSource;
    title: TranslationKey;
}

const FRAME_WIDTH = 150;
const FRAME_HEIGHT = 325;
/** Three lines of caption: the longest step title wraps to three in Spanish. */
const CAPTION_HEIGHT = 62;
const FRAME_GAP = 12;
const FRAME_RADIUS = 12;

export function FrameStrip({ steps }: { steps: readonly Step[] }) {
    const t = useTranslation();
    const framed = steps.flatMap((step, index) =>
        step.frame ? [{ ...step, frame: step.frame, number: index + 1 }] : []
    );
    if (framed.length === 0) {
        return null;
    }
    return (
        <Carousel align="start" className="-mx-5 pt-3" itemSize={FRAME_WIDTH + FRAME_GAP}>
            <Carousel.Content style={{ height: FRAME_HEIGHT + CAPTION_HEIGHT }}>
                {framed.map((step) => (
                    <Carousel.Item className="gap-1.5 pl-5" key={step.title}>
                        <Image
                            contentFit="cover"
                            source={step.frame}
                            style={{ borderRadius: FRAME_RADIUS, height: FRAME_HEIGHT, width: FRAME_WIDTH }}
                        />
                        <Text className="text-muted text-subtitle" numberOfLines={3} style={{ width: FRAME_WIDTH }}>
                            <Text className="text-foreground font-mono tabular-nums">{String(step.number)}</Text>
                            {`  ${t(step.title)}`}
                        </Text>
                    </Carousel.Item>
                ))}
            </Carousel.Content>
        </Carousel>
    );
}

export function CheckRow({ title, detail }: { detail?: string; title: string }) {
    return (
        <View className="border-border flex-row items-center gap-3 border-b py-3">
            <View className="bg-income h-5.5 w-5.5 items-center justify-center rounded-full">
                <Text className="text-background text-eyebrow font-sans-semibold">✓</Text>
            </View>
            <Text className="text-body text-foreground flex-1" numberOfLines={1}>
                {title}
            </Text>
            {detail ? <Text className="text-body text-muted">{detail}</Text> : null}
        </View>
    );
}
