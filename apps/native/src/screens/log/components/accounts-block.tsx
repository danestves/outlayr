import type { AccountsOverview, OverviewRow } from "@outlayr/money/account-overview";
import { use } from "react";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AmountsHiddenContext } from "@/components/amount-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { RowPressable } from "@/components/row-pressable";
import { ROW_TYPE } from "@/components/row-type";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import type { Account } from "@/data/accounts-core";
import { DUE_WINDOW_DAYS } from "@/data/debts-due";
import type { DueWindow } from "@/data/debts-due";
import { formatSignedAmount } from "@/domain/account-display";
import { maskedAmount } from "@/domain/money";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { useColors } from "@/theme/use-colors";

const TILE_SIZE = 36;
const TILE_RADIUS = 9;
const MAX_ROWS = 4;

interface AccountsBlockProps {
    accounts: readonly Account[];
    /** The display currency every figure is valued in. */
    currency: string;
    debts?: DebtsSummary | null;
    onOpen: (accountId: string) => void;
    onOpenAll: () => void;
    onOpenDebts?: () => void;
    overview: AccountsOverview | null;
    showCents: boolean;
    trailing?: ReactNode;
}

export function AccountsBlock({
    accounts,
    overview,
    currency,
    showCents,
    debts = null,
    onOpen,
    onOpenAll,
    onOpenDebts,
    trailing,
}: AccountsBlockProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const hidden = use(AmountsHiddenContext);
    const stacked = useAccessibilityTextSize();
    const debtsRow =
        debts !== null && onOpenDebts ? <DebtsRow debts={debts} onPress={onOpenDebts} showCents={showCents} /> : null;
    if (overview == null) {
        return (
            <View className="gap-1.25 pt-2.5 pb-4.5">
                {debtsRow ?? (
                    <Pressable accessibilityRole="button" className="py-2 active:opacity-70" onPress={onOpenAll}>
                        <MonoLabel className="text-tint">{t("accounts.add.prompt")}</MonoLabel>
                    </Pressable>
                )}
                <View className="bg-border" style={{ borderRadius: 0.65, height: 1.3 }} />
            </View>
        );
    }

    const total = hidden ? maskedAmount(currency) : formatSignedAmount(overview.total, currency, showCents, language);

    const byId = new Map(accounts.map((account) => [account.id, account]));
    const overflow = overview.rows.length > MAX_ROWS;
    const shown = overflow ? overview.rows.slice(0, MAX_ROWS - 1) : overview.rows;

    return (
        <View className="gap-1.25 pt-2.5 pb-4.5">
            <View className="flex-row items-center gap-2">
                <Pressable
                    accessibilityHint={t("accounts.overview.openHint")}
                    accessibilityLabel={`${t("accounts.overview.heading")} · ${overview.count}`}
                    accessibilityRole="button"
                    accessibilityValue={{ text: hidden ? t("log.amounts.hidden") : total }}
                    className={cn(
                        "flex-1 active:opacity-70",
                        stacked ? "gap-0.75" : "flex-row items-baseline justify-between gap-2"
                    )}
                    onPress={onOpenAll}
                    testID="accounts-overview-card"
                >
                    <MonoLabel>{`${t("accounts.overview.heading")} · ${overview.count}  ›`}</MonoLabel>
                    <View className="flex-row items-baseline gap-1.5">
                        {overview.exact ? null : <MonoLabel className="text-subtle">{`${currency}?`}</MonoLabel>}
                        <Text className="font-sans-semibold text-body text-muted tabular-nums" numberOfLines={1}>
                            {total}
                        </Text>
                    </View>
                </Pressable>
                {trailing}
            </View>
            {shown.map((row) => {
                const account = byId.get(row.id);
                return account ? (
                    <AccountRow
                        account={account}
                        currency={currency}
                        key={row.id}
                        language={language}
                        onPress={() => onOpen(row.id)}
                        row={row}
                        showCents={showCents}
                    />
                ) : null;
            })}
            {overflow ? (
                <Pressable accessibilityRole="button" className="py-2 active:opacity-70" onPress={onOpenAll}>
                    <MonoLabel className="text-tint">
                        {t("accounts.overview.more", { count: overview.rows.length - shown.length })}
                    </MonoLabel>
                </Pressable>
            ) : null}
            {debtsRow}
            <View className="bg-border" style={{ borderRadius: 0.65, height: 1.3 }} />
        </View>
    );
}

function rowSubtitle(
    row: OverviewRow,
    accountCurrency: string,
    displayCurrency: string,
    t: ReturnType<typeof useTranslation>
): string | null {
    if (row.kind === "liability") {
        return t("accounts.overview.owed");
    }
    if (row.multiCurrency) {
        return t("accounts.multiCurrency");
    }
    return accountCurrency === displayCurrency ? null : accountCurrency;
}

interface AccountRowProps {
    account: Account;
    currency: string;
    language: Language;
    onPress: () => void;
    row: OverviewRow;
    showCents: boolean;
}

function AccountRow({ account, row, currency, showCents, language, onPress }: AccountRowProps) {
    const t = useTranslation();
    const colors = useColors();
    const owed = row.kind === "liability";
    const subtitle = rowSubtitle(row, account.currency, currency, t);
    // Stated as owed, not a negative holding: the entries below are negative expenses.
    const hidden = use(AmountsHiddenContext);
    const figure = hidden
        ? maskedAmount(currency)
        : formatSignedAmount(owed ? -row.balance : row.balance, currency, showCents, language);
    const tileColor = account.imageColor ?? account.customColor ?? colors.foreground;
    const stacked = useAccessibilityTextSize();
    const balance = (
        <>
            {row.exact ? null : <MonoLabel className="text-subtle">{`${currency}?`}</MonoLabel>}
            <Text
                className={cn(ROW_TYPE.balance, "tabular-nums", owed ? "text-muted" : "text-foreground")}
                numberOfLines={1}
            >
                {figure}
            </Text>
        </>
    );

    return (
        <RowPressable
            accessibilityLabel={[account.name, subtitle, hidden ? t("log.amounts.hidden") : figure]
                .filter((part) => part !== null)
                .join(", ")}
            accessibilityRole="button"
            className={cn("flex-row gap-3 py-2", stacked ? "items-start" : "items-center")}
            onPress={onPress}
        >
            <CategoryIconTile
                color={tileColor}
                emoji={account.emoji}
                icon={account.icon}
                imageUri={account.imageUri}
                radius={TILE_RADIUS}
                size={TILE_SIZE}
                type="solid"
            />
            <View className="flex-1 gap-0.5">
                <Text className={cn(ROW_TYPE.title, "text-foreground")} numberOfLines={stacked ? 2 : 1}>
                    {account.name}
                </Text>
                {stacked ? <View className="flex-row items-baseline gap-1.5">{balance}</View> : null}
                {subtitle === null ? null : (
                    <Text className={cn(ROW_TYPE.subtitle, "text-muted")} numberOfLines={1}>
                        {subtitle}
                    </Text>
                )}
            </View>
            {stacked ? null : balance}
        </RowPressable>
    );
}

export interface DebtsSummary {
    /** The ledger's own currency, not necessarily the one shown. */
    currency: string;
    /** Due in the next 14 days plus overdue, in `currency`; null with none. */
    due: Pick<DueWindow, "exact" | "total"> | null;
    /** Both positive, in `currency`. */
    owedToYou: number;
    youOwe: number;
}

function DebtsRow({ debts, onPress, showCents }: { debts: DebtsSummary; onPress: () => void; showCents: boolean }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const hidden = use(AmountsHiddenContext);
    const stacked = useAccessibilityTextSize();
    const { currency } = debts;
    const format = (amount: number) =>
        hidden ? maskedAmount(currency) : formatSignedAmount(amount, currency, showCents, language);
    let subtitle: string | null = null;
    if (debts.due !== null) {
        subtitle = t("debts.overview.due", { amount: format(debts.due.total), days: DUE_WINDOW_DAYS });
    } else if (debts.owedToYou > 0) {
        subtitle = t("debts.overview.owedToYou", { amount: format(debts.owedToYou) });
    }
    const figure = (
        <Text className={cn(ROW_TYPE.balance, "text-muted tabular-nums")} numberOfLines={1}>
            {format(debts.youOwe)}
        </Text>
    );

    return (
        <RowPressable
            accessibilityLabel={[t("debts.title"), subtitle, format(debts.youOwe)]
                .filter((part) => part !== null)
                .join(", ")}
            accessibilityRole="button"
            className={cn("flex-row gap-3 py-2", stacked ? "items-start" : "items-center")}
            onPress={onPress}
        >
            <CategoryIconTile
                color={colors.foreground}
                icon="Agreement01"
                radius={TILE_RADIUS}
                size={TILE_SIZE}
                type="solid"
            />
            <View className="flex-1 gap-0.5">
                <Text className={cn(ROW_TYPE.title, "text-foreground")} numberOfLines={1}>
                    {t("debts.title")}
                </Text>
                {stacked ? figure : null}
                {subtitle === null ? null : (
                    <View className="flex-row items-baseline gap-1.5">
                        {debts.due === null || debts.due.exact ? null : (
                            <MonoLabel className="text-subtle">{`${currency}?`}</MonoLabel>
                        )}
                        <Text className={cn(ROW_TYPE.subtitle, "text-muted flex-1")} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    </View>
                )}
            </View>
            {stacked ? null : figure}
        </RowPressable>
    );
}
