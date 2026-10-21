import ArrowDown01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowDown01Icon";
import ArrowUp01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowUp01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { memo, use, useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import { AccountTile } from "@/components/account-tile";
import { AmountsHiddenContext } from "@/components/amount-text";
import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { DebtsScreenOverview, useDebtsOverview } from "@/data/debts";
import type { PayoffLine } from "@/data/payoff-plans";
import { formatSignedAmount } from "@/domain/account-display";
import { useLanguage, useTranslation } from "@/i18n/context";
import { debtSubtitle, dueStripWording, payoffRowWording } from "@/screens/debts/debts-wording";
import type { DebtSubtitle } from "@/screens/debts/debts-wording";
import { PayoffBar } from "@/screens/debts/payoff-line";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";
import { useMaterialColors } from "@/theme/use-material-colors";

type DebtListRow = DebtsScreenOverview["youOwe"][number];

interface SectionsProps {
    currency: string;
    debts: ReturnType<typeof useDebtsOverview>;
}

const PRESSED_ALPHA = 0.1;

export function LedgerTotals({ currency, debts }: SectionsProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const format = (amount: number) => formatSignedAmount(amount, currency, showCents, language);

    return (
        <>
            <View className="flex-row gap-4 px-4 pt-2 pb-2">
                <Total amount={format(debts.haveTotal)} label={t("accounts.totals.have")} />
                <Total amount={format(debts.youOweTotal)} end label={t("accounts.totals.owe")} />
            </View>
            {debts.exact && debts.assetsExact ? null : (
                <Text className="font-sans-semibold text-label text-m3-on-surface-variant px-4">{`${currency}?`}</Text>
            )}
            {debts.due === null ? null : (
                <DueStrip
                    amount={format(debts.due.total)}
                    currency={currency}
                    exact={debts.due.exact}
                    wording={dueStripWording(debts.due, debts, { language, t })}
                />
            )}
        </>
    );
}

/** Every row opens its account, which for a person is the person detail. */
export function DebtSections({ currency, debts }: SectionsProps) {
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const hidden = use(AmountsHiddenContext);
    const [settledOpen, setSettledOpen] = useState(false);
    const format = useCallback(
        (amount: number) => formatSignedAmount(amount, currency, showCents, language),
        [currency, showCents, language]
    );

    const open = useCallback(
        (id: string) => router.push({ params: { accountId: id }, pathname: "/accounts/[accountId]" }),
        [router]
    );

    const wording = { currency, language, showCents, t };
    const row = (item: DebtListRow) => {
        const subtitle = debtSubtitle(item, debts, wording);
        const line = debts.payoff.get(item.id);
        const plan = payoffRowWording(item, line, currency, hidden, wording);
        const paidOff = subtitle.text === null && plan !== null && "paidOff" in plan ? plan.paidOff : null;
        return (
            <DebtRow
                currency={currency}
                format={format}
                key={item.id}
                onOpen={open}
                plan={line && plan && "date" in plan ? { ...plan, line } : null}
                row={item}
                subtitle={paidOff ?? subtitle.text}
                tone={paidOff === null ? subtitle.tone : "paidOff"}
            />
        );
    };

    const section = (title: string, rows: readonly DebtListRow[]) =>
        rows.length === 0 ? null : (
            <>
                <View className="px-4 pt-4 pb-2">
                    <Eyebrow colors={colors}>{title}</Eyebrow>
                </View>
                {rows.map(row)}
            </>
        );

    return (
        <>
            {section(
                t("accounts.section.liabilities"),
                debts.youOwe.filter((item) => item.kind === "liability")
            )}
            {section(t("accounts.section.people"), [
                ...debts.youOwe.filter((item) => item.kind === "person"),
                ...debts.owedToYou,
            ])}
            {debts.settled.length > 0 ? (
                <>
                    <SettledToggle
                        count={debts.settled.length}
                        onToggle={() => setSettledOpen((current) => !current)}
                        open={settledOpen}
                    />
                    {settledOpen ? debts.settled.map(row) : null}
                </>
            ) : null}
        </>
    );
}

function Total({ amount, end = false, label }: { amount: string; end?: boolean; label: string }) {
    return (
        <View
            accessibilityLabel={label}
            accessibilityValue={{ text: amount }}
            accessible
            className={end ? "flex-1 items-end" : "flex-1"}
        >
            <Text className="text-caption text-m3-on-surface-variant">{label}</Text>
            <Text className="font-sans-semibold text-title text-m3-on-surface tabular-nums" numberOfLines={1}>
                {amount}
            </Text>
        </View>
    );
}

function SettledToggle({ count, onToggle, open }: { count: number; onToggle: () => void; open: boolean }) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
            className="border-m3-outline-variant mt-4 min-h-14 flex-row items-center gap-4 border-b px-4"
            onPress={onToggle}
        >
            <Text className="text-body text-m3-on-surface-variant flex-1">{t("debts.settled", { count })}</Text>
            <HugeiconsIcon color={m3.onSurfaceVariant} icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={20} />
        </Pressable>
    );
}

function DueStrip({
    amount,
    currency,
    exact,
    wording: { overdue, summary, title },
}: {
    amount: string;
    currency: string;
    exact: boolean;
    wording: ReturnType<typeof dueStripWording>;
}) {
    return (
        <View
            accessibilityLabel={`${title}, ${summary}`}
            accessibilityValue={{ text: amount }}
            accessible
            className="flex-row items-center gap-4 px-4 pt-3 pb-1"
        >
            <View className="flex-1">
                <Text className="text-caption text-m3-on-surface-variant">{title}</Text>
                <Text
                    className={overdue ? "text-body text-m3-error" : "text-body text-m3-on-surface"}
                    numberOfLines={2}
                >
                    {summary}
                </Text>
            </View>
            {exact ? null : (
                <Text className="font-sans-semibold text-label text-m3-on-surface-variant">{`${currency}?`}</Text>
            )}
            <Text className="font-sans-medium text-body text-m3-on-surface tabular-nums" numberOfLines={1}>
                {amount}
            </Text>
        </View>
    );
}

interface DebtRowProps {
    currency: string;
    format: (amount: number) => string;
    onOpen: (id: string) => void;
    plan: { a11y: string; date: string; line: PayoffLine } | null;
    row: DebtListRow;
    subtitle: string | null;
    tone: DebtSubtitle["tone"] | "paidOff";
}

const SUBTITLE_TONE = {
    due: "text-m3-primary",
    income: "text-income",
    muted: "text-m3-on-surface-variant",
    overdue: "text-m3-error",
    paidOff: "text-income",
} as const;

const DebtRow = memo(({ currency, format, onOpen, plan, row, subtitle, tone }: DebtRowProps) => {
    const m3 = useMaterialColors();
    const { account } = row;
    const amount = format(row.amount);

    return (
        <Pressable
            accessibilityLabel={[account.name, plan?.a11y, subtitle].filter(Boolean).join(", ")}
            accessibilityRole="button"
            accessibilityValue={{ text: amount }}
            android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
            className="border-m3-outline-variant bg-m3-surface min-h-18 flex-row items-center gap-4 border-b px-4 py-2"
            onPress={() => onOpen(account.id)}
        >
            <AccountTile account={account} size={PARENT_TILE} />
            <View className="flex-1">
                <Text className="text-body text-m3-on-surface" numberOfLines={1}>
                    {account.name}
                </Text>
                {plan === null ? null : (
                    <View className="flex-row items-center gap-2">
                        <View className="flex-1">
                            <PayoffBar line={plan.line} />
                        </View>
                        <Text className="text-caption text-m3-on-surface-variant tabular-nums" numberOfLines={1}>
                            {plan.date}
                        </Text>
                    </View>
                )}
                {subtitle === null ? null : (
                    <Text className={`text-caption ${SUBTITLE_TONE[tone]}`} numberOfLines={2}>
                        {subtitle}
                    </Text>
                )}
            </View>
            {row.exact ? null : (
                <Text className="font-sans-semibold text-label text-m3-on-surface-variant">{`${currency}?`}</Text>
            )}
            <Text className="font-sans-medium text-body text-m3-on-surface tabular-nums" numberOfLines={1}>
                {amount}
            </Text>
        </Pressable>
    );
});
DebtRow.displayName = "DebtRow";
