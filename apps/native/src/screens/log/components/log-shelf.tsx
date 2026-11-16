import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { AccountsOverview } from "@outlayr/money/account-overview";
import { currencyTotals } from "@outlayr/money/currency-totals";
import { landingDate } from "@outlayr/money/recurrence";
import type { RateTable } from "@outlayr/money/valuation";
import { use } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { TapMenu } from "@/components/tap-menu";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { WIDGET_SIZE } from "@/components/widget-card";
import type { Account } from "@/data/accounts-core";
import { DUE_WINDOW_DAYS } from "@/data/debts-due";
import type { TransactionWithCategory } from "@/data/transactions";
import { formatSignedAmount } from "@/domain/account-display";
import { formatDueDay } from "@/domain/dates";
import { foldFees } from "@/domain/day-sections";
import { formatAmount, maskedAmount } from "@/domain/money";
import { resolveTransactionIdentity } from "@/domain/transaction-identity";
import { chargesInWeekAhead } from "@/domain/upcoming";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useNewDebtItems } from "@/screens/debts/use-new-debt-items";
import { useColors } from "@/theme/use-colors";

import type { DebtsSummary } from "./accounts-block";

const GAP = 10;
const GUTTER = 20;
const CHIPS_SHOWN = 3;
const CHIP_SIZE = 20;
const CHIP_OVERLAP = -8;
const START_GLYPH = 11;
const CARD_SHADOW = { boxShadow: "0 1px 4px rgba(23, 21, 15, 0.08)" } as const;

interface ShelfChip {
    color: string;
    emoji?: string | null;
    future?: boolean;
    icon: string | null | undefined;
    id: string;
    imageUri?: string | null;
}

const NO_CHIPS: readonly ShelfChip[] = [];

interface ShelfCardProps {
    accessibilityHint?: string;
    accessibilityLabel: string;
    cap?: ReactNode;
    chips?: readonly ShelfChip[];
    figure: string;
    figureClass?: string;
    more?: number;
    onPress?: () => void;
    title: string;
    unit: string;
    width: number;
}

function ShelfCard({
    accessibilityHint,
    accessibilityLabel,
    cap,
    chips = NO_CHIPS,
    figure,
    figureClass = "text-foreground",
    more = 0,
    onPress,
    title,
    unit,
    width,
}: ShelfCardProps) {
    const colors = useColors();
    return (
        <Pressable
            accessibilityHint={accessibilityHint}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            className="bg-card rounded-[20px] px-3 py-2.5 active:opacity-70"
            onPress={onPress}
            style={[CARD_SHADOW, { width }]}
        >
            <View className="flex-row items-center justify-between gap-1">
                <MonoLabel className="shrink" numberOfLines={1}>
                    {title}
                </MonoLabel>
                {onPress ? (
                    <HugeiconsIcon color={colors.muted} icon={ArrowRight01Icon} size={14} strokeWidth={2} />
                ) : null}
            </View>
            <Text
                adjustsFontSizeToFit
                className={cn("font-sans-semibold text-headline mt-0.5 leading-[22px] tabular-nums", figureClass)}
                minimumFontScale={0.6}
                numberOfLines={1}
            >
                {figure}
            </Text>
            <View className="min-h-5 flex-row items-center justify-between gap-1.5">
                {cap ?? (
                    <Text className="font-sans-medium text-label text-muted shrink" numberOfLines={1}>
                        {unit}
                    </Text>
                )}
                {chips.length > 0 ? (
                    <View className="flex-row items-center gap-1">
                        <View className="flex-row">
                            {chips.map((chip, index) => (
                                <View
                                    className="bg-card rounded-full p-[1.5px]"
                                    key={chip.id}
                                    style={index > 0 ? { marginLeft: CHIP_OVERLAP } : undefined}
                                >
                                    <CategoryIconTile
                                        color={chip.color}
                                        emoji={chip.emoji}
                                        future={chip.future}
                                        icon={chip.icon}
                                        imageUri={chip.imageUri}
                                        radius={CHIP_SIZE / 2}
                                        size={CHIP_SIZE}
                                        type="solid"
                                    />
                                </View>
                            ))}
                        </View>
                        {more > 0 ? <Text className="text-eyebrow text-muted font-mono">{`+${more}`}</Text> : null}
                    </View>
                ) : null}
            </View>
        </Pressable>
    );
}

interface UpcomingCardProps {
    currency: string;
    nowMs: number;
    onOpen: () => void;
    rates: RateTable;
    rows: readonly TransactionWithCategory[];
    showCents: boolean;
    width: number;
}

function UpcomingCard({ rows, currency, rates, nowMs, showCents, onOpen, width }: UpcomingCardProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const hidden = use(AmountsHiddenContext);
    const now = new Date(nowMs);
    const due = currencyTotals(chargesInWeekAhead(rows, now), currency, rates);
    let figure = formatAmount(0, currency, showCents, language);
    if (hidden) {
        figure = maskedAmount(currency);
    } else if (due.length > 0) {
        figure = due
            .map((bucket) => formatSignedAmount(bucket.amount, bucket.currencyCode, showCents, language))
            .join(" / ");
    }
    const unit = t("log.shelf.weekAhead");
    const next = foldFees(rows).slice(0, CHIPS_SHOWN);
    const title = t("log.upcoming.heading");
    const spoken = next.map(
        (row) => `${row.note || row.categoryName}, ${formatDueDay(landingDate(row, now), now, language)}`
    );

    return (
        <ShelfCard
            accessibilityHint={t("log.upcoming.openHint")}
            accessibilityLabel={[title, `${hidden ? t("log.amounts.hidden") : figure} ${unit}`, ...spoken].join(", ")}
            chips={next.map((row) => {
                const identity = resolveTransactionIdentity(row);
                return {
                    color: row.transferId === row.id ? colors.transfer : identity.color,
                    emoji: identity.emoji,
                    future: true,
                    icon: identity.icon,
                    id: row.id,
                    imageUri: row.imageUri,
                };
            })}
            figure={figure}
            figureClass="text-muted"
            onPress={onOpen}
            title={title}
            unit={unit}
            width={width}
        />
    );
}

interface AccountsCardProps {
    accounts: readonly Account[];
    currency: string;
    onOpen: () => void;
    overview: AccountsOverview | null;
    showCents: boolean;
    width: number;
}

function AccountsCard({ accounts, overview, currency, showCents, onOpen, width }: AccountsCardProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const hidden = use(AmountsHiddenContext);
    const title = t("accounts.overview.heading");

    if (overview == null) {
        const prompt = t("accounts.add.prompt");
        return (
            <ShelfCard
                accessibilityLabel={`${title}, ${prompt}`}
                figure={hidden ? maskedAmount(currency) : formatAmount(0, currency, showCents, language)}
                figureClass="text-muted"
                onPress={onOpen}
                title={title}
                unit={prompt}
                width={width}
            />
        );
    }

    const byId = new Map(accounts.map((account) => [account.id, account]));
    const total = hidden ? maskedAmount(currency) : formatSignedAmount(overview.total, currency, showCents, language);
    const count = t("log.shelf.accounts", { count: overview.count });
    const unit = overview.exact ? count : `${count} · ${currency}?`;
    const chips = overview.rows.slice(0, CHIPS_SHOWN).flatMap((row) => {
        const account = byId.get(row.id);
        return account
            ? [
                  {
                      color: account.imageColor ?? account.customColor ?? colors.foreground,
                      emoji: account.emoji,
                      icon: account.icon,
                      id: row.id,
                      imageUri: account.imageUri,
                  },
              ]
            : [];
    });

    return (
        <ShelfCard
            accessibilityHint={t("accounts.overview.openHint")}
            accessibilityLabel={`${title}, ${hidden ? t("log.amounts.hidden") : total}, ${unit}`}
            chips={chips}
            figure={total}
            more={overview.rows.length - CHIPS_SHOWN}
            onPress={onOpen}
            title={title}
            unit={unit}
            width={width}
        />
    );
}

function NoDebtsCard({ currency, showCents, width }: { currency: string; showCents: boolean; width: number }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const hidden = use(AmountsHiddenContext);
    const items = useNewDebtItems();
    const title = t("debts.title");
    const figure = hidden ? maskedAmount(currency) : formatAmount(0, currency, showCents, language);
    const unit = t("debts.empty.owedToYou");

    return (
        <TapMenu accessibilityLabel={title} items={items}>
            <ShelfCard
                accessibilityLabel={`${title}, ${figure}, ${unit}`}
                cap={
                    <View className="shrink flex-row items-center gap-2.5">
                        {[t("debts.verb.lent"), t("debts.verb.borrowed")].map((start) => (
                            <View className="shrink flex-row items-center gap-0.5" key={start}>
                                <HugeiconsIcon color={colors.tint} icon={PlusSignIcon} size={START_GLYPH} />
                                <Text className="font-sans-medium text-label text-tint shrink" numberOfLines={1}>
                                    {start}
                                </Text>
                            </View>
                        ))}
                    </View>
                }
                figure={figure}
                figureClass="text-muted"
                title={title}
                unit={unit}
                width={width}
            />
        </TapMenu>
    );
}

function DebtsCard({
    debts,
    showCents,
    onOpen,
    width,
}: {
    debts: DebtsSummary;
    onOpen: () => void;
    showCents: boolean;
    width: number;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const format = (amount: number) =>
        hidden ? maskedAmount(debts.currency) : formatSignedAmount(amount, debts.currency, showCents, language);
    const title = t("debts.title");
    let unit = t("log.shelf.youOwe");
    if (debts.due !== null) {
        unit = t("debts.overview.due", { amount: format(debts.due.total), days: DUE_WINDOW_DAYS });
    } else if (debts.owedToYou > 0) {
        unit = t("debts.overview.owedToYou", { amount: format(debts.owedToYou) });
    }
    const figure = format(debts.youOwe);

    return (
        <ShelfCard
            accessibilityLabel={`${title}, ${figure}, ${unit}`}
            figure={figure}
            onPress={onOpen}
            title={title}
            unit={unit}
            width={width}
        />
    );
}

interface LogShelfProps {
    accounts: readonly Account[];
    currency: string;
    debts: DebtsSummary | null;
    nowMs: number;
    onOpenAccounts: () => void;
    onOpenDebts: () => void;
    onOpenUpcoming: () => void;
    overview: AccountsOverview | null;
    rates: RateTable;
    showCents: boolean;
    upcoming: readonly TransactionWithCategory[];
}

export function LogShelf({
    upcoming,
    accounts,
    overview,
    debts,
    currency,
    rates,
    showCents,
    nowMs,
    onOpenUpcoming,
    onOpenAccounts,
    onOpenDebts,
}: LogShelfProps) {
    const stacked = useAccessibilityTextSize();
    const { width: screen } = useWindowDimensions();
    const scrolls = !stacked && upcoming.length > 0;
    let width = (screen - 2 * GUTTER - GAP) / 2;
    if (stacked) {
        width = screen - 2 * GUTTER;
    } else if (scrolls) {
        width = WIDGET_SIZE;
    }

    const cards = (
        <>
            <AccountsCard
                accounts={accounts}
                currency={currency}
                onOpen={onOpenAccounts}
                overview={overview}
                showCents={showCents}
                width={width}
            />
            {upcoming.length > 0 ? (
                <UpcomingCard
                    currency={currency}
                    nowMs={nowMs}
                    onOpen={onOpenUpcoming}
                    rates={rates}
                    rows={upcoming}
                    showCents={showCents}
                    width={width}
                />
            ) : null}
            {debts === null ? (
                <NoDebtsCard currency={currency} showCents={showCents} width={width} />
            ) : (
                <DebtsCard debts={debts} onOpen={onOpenDebts} showCents={showCents} width={width} />
            )}
        </>
    );

    if (stacked) {
        return <View className="gap-2.5 pt-1 pb-2.5">{cards}</View>;
    }
    return (
        <ScrollView
            // Vertical padding keeps the cards' shadow inside the scroll view's clip.
            contentContainerStyle={{ gap: GAP, paddingBottom: 10, paddingHorizontal: GUTTER, paddingTop: 4 }}
            decelerationRate="fast"
            horizontal
            scrollEnabled={scrolls}
            showsHorizontalScrollIndicator={false}
            snapToInterval={scrolls ? WIDGET_SIZE + GAP : undefined}
            style={{ marginHorizontal: -GUTTER }}
        >
            {cards}
        </ScrollView>
    );
}
