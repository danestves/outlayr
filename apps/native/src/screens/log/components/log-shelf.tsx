import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { AccountsOverview, OverviewRow } from "@outlayr/money/account-overview";
import { currencyTotals } from "@outlayr/money/currency-totals";
import { landingDate } from "@outlayr/money/recurrence";
import type { RateTable } from "@outlayr/money/valuation";
import { use } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { TapMenu } from "@/components/tap-menu";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { Widget, WIDGET_SIZE } from "@/components/widget-card";
import type { Account } from "@/data/accounts-core";
import { DUE_WINDOW_DAYS } from "@/data/debts-due";
import type { TransactionWithCategory } from "@/data/transactions";
import { formatSignedAmount } from "@/domain/account-display";
import { formatDueDay, formatDueMark } from "@/domain/dates";
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
const NEXT_SHOWN = 3;
const LOGOS_SHOWN = 4;
const LOGO_SIZE = 24;
const START_GLYPH = 12;

interface UpcomingWidgetProps {
    currency: string;
    nowMs: number;
    onOpen: () => void;
    rates: RateTable;
    rows: readonly TransactionWithCategory[];
    showCents: boolean;
    width: number;
}

function UpcomingWidget({ rows, currency, rates, nowMs, showCents, onOpen, width }: UpcomingWidgetProps) {
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
    const next = foldFees(rows).slice(0, NEXT_SHOWN);
    const title = t("log.upcoming.heading");
    const spoken = next.map(
        (row) => `${row.note || row.categoryName}, ${formatDueDay(landingDate(row, now), now, language)}`
    );

    return (
        <Widget
            accessibilityHint={t("log.upcoming.openHint")}
            accessibilityLabel={[title, `${hidden ? t("log.amounts.hidden") : figure} ${unit}`, ...spoken].join(", ")}
            figure={figure}
            figureClass="text-future"
            onPress={onOpen}
            title={title}
            unit={unit}
            width={width}
        >
            <View className={cn("flex-row", next.length === NEXT_SHOWN ? "justify-between" : "gap-3.5")}>
                {next.map((row) => {
                    const identity = resolveTransactionIdentity(row);
                    return (
                        <View className="items-center gap-1.25" key={row.id}>
                            <CategoryIconTile
                                color={row.transferId === row.id ? colors.transfer : identity.color}
                                emoji={identity.emoji}
                                future
                                icon={identity.icon}
                                imageUri={row.imageUri}
                                radius={8}
                                size={30}
                                type="solid"
                            />
                            <MonoLabel className="text-micro text-subtle" numberOfLines={1}>
                                {formatDueMark(landingDate(row, now), now, language)}
                            </MonoLabel>
                        </View>
                    );
                })}
            </View>
        </Widget>
    );
}

interface AccountsWidgetProps {
    accounts: readonly Account[];
    currency: string;
    onOpen: () => void;
    overview: AccountsOverview | null;
    showCents: boolean;
    width: number;
}

function AccountsWidget({ accounts, overview, currency, showCents, onOpen, width }: AccountsWidgetProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const hidden = use(AmountsHiddenContext);
    const title = t("accounts.overview.heading");

    if (overview == null) {
        const prompt = t("accounts.add.prompt");
        return (
            <Widget
                accessibilityLabel={`${title}, ${prompt}`}
                figure=""
                onPress={onOpen}
                title={title}
                unit={prompt}
                width={width}
            />
        );
    }

    const byId = new Map(accounts.map((account) => [account.id, account]));
    const colorOf = (row: OverviewRow) => {
        const account = byId.get(row.id);
        return account?.imageColor ?? account?.customColor ?? colors.foreground;
    };
    const total = hidden ? maskedAmount(currency) : formatSignedAmount(overview.total, currency, showCents, language);
    const count = t("log.shelf.accounts", { count: overview.count });
    const unit = overview.exact ? count : `${count} · ${currency}?`;
    const held = overview.rows.filter((row) => row.kind !== "liability" && row.balance > 0);
    const lead = held.slice(0, 3);
    const rest = held.slice(3).reduce((sum, row) => sum + row.balance, 0);
    const shown = overview.rows.slice(0, LOGOS_SHOWN);

    return (
        <Widget
            accessibilityHint={t("accounts.overview.openHint")}
            accessibilityLabel={`${title}, ${hidden ? t("log.amounts.hidden") : total}, ${unit}`}
            figure={total}
            onPress={onOpen}
            title={title}
            unit={unit}
            width={width}
        >
            <View className="gap-2.5">
                {lead.length > 0 ? (
                    <View className="h-1.5 flex-row gap-0.5 overflow-hidden rounded-full">
                        {lead.map((row) => (
                            <View key={row.id} style={{ backgroundColor: colorOf(row), flex: row.balance }} />
                        ))}
                        {rest > 0 ? <View className="bg-border" style={{ flex: rest }} /> : null}
                    </View>
                ) : null}
                <View className="flex-row items-center gap-1.5">
                    <View className="flex-row">
                        {shown.map((row, index) => {
                            const account = byId.get(row.id);
                            return account ? (
                                <View
                                    className="bg-card rounded-[9px] p-0.5"
                                    key={row.id}
                                    style={index > 0 ? { marginLeft: -8 } : undefined}
                                >
                                    <CategoryIconTile
                                        color={colorOf(row)}
                                        emoji={account.emoji}
                                        icon={account.icon}
                                        imageUri={account.imageUri}
                                        radius={7}
                                        size={LOGO_SIZE}
                                        type="solid"
                                    />
                                </View>
                            ) : null;
                        })}
                    </View>
                    {overview.rows.length > LOGOS_SHOWN ? (
                        <Text className="font-sans-semibold text-footnote text-subtle">{`+${overview.rows.length - LOGOS_SHOWN}`}</Text>
                    ) : null}
                </View>
            </View>
        </Widget>
    );
}

function NoDebtsWidget({ currency, showCents, width }: { currency: string; showCents: boolean; width: number }) {
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
            <Widget
                accessibilityLabel={`${title}, ${figure}, ${unit}`}
                figure={figure}
                figureClass="text-subtle"
                title={title}
                unit={unit}
                width={width}
            >
                <View className="gap-1">
                    {[t("debts.verb.lent"), t("debts.verb.borrowed")].map((start) => (
                        <View className="flex-row items-center gap-1.5" key={start}>
                            <HugeiconsIcon color={colors.tint} icon={PlusSignIcon} size={START_GLYPH} />
                            <Text className="font-sans-medium text-footnote text-tint" numberOfLines={1}>
                                {start}
                            </Text>
                        </View>
                    ))}
                </View>
            </Widget>
        </TapMenu>
    );
}

function DebtsWidget({
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
        <Widget
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

    const widgets = (
        <>
            {upcoming.length > 0 ? (
                <UpcomingWidget
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
                <NoDebtsWidget currency={currency} showCents={showCents} width={width} />
            ) : (
                <DebtsWidget debts={debts} onOpen={onOpenDebts} showCents={showCents} width={width} />
            )}
            <AccountsWidget
                accounts={accounts}
                currency={currency}
                onOpen={onOpenAccounts}
                overview={overview}
                showCents={showCents}
                width={width}
            />
        </>
    );

    if (stacked) {
        return <View className="gap-2.5 pt-3 pb-1.5">{widgets}</View>;
    }
    return (
        <ScrollView
            contentContainerStyle={{ gap: GAP, paddingHorizontal: GUTTER, paddingVertical: 12 }}
            decelerationRate="fast"
            horizontal
            scrollEnabled={scrolls}
            showsHorizontalScrollIndicator={false}
            snapToInterval={scrolls ? WIDGET_SIZE + GAP : undefined}
            style={{ marginHorizontal: -GUTTER }}
        >
            {widgets}
        </ScrollView>
    );
}
