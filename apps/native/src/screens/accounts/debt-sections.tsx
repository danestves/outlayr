import { HStack, Image, RNHostView, Section, Spacer, Text as SwiftText, VStack } from "@expo/ui/swift-ui";
import {
    accessibilityAddTraits,
    accessibilityElement,
    accessibilityLabel,
    accessibilityValue,
    font,
    foregroundStyle,
    frame,
    lineLimit,
    monospacedDigit,
    onTapGesture,
} from "@expo/ui/swift-ui/modifiers";
import { useRouter } from "expo-router";
import { memo, use, useCallback, useState } from "react";
import { View } from "react-native";

import { AccountTile } from "@/components/account-tile";
import { AmountsHiddenContext } from "@/components/amount-text";
import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { LABEL, PARENT_NAME } from "@/components/category-list-swift";
import { groupedRows } from "@/components/native/styles";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { DebtsScreenOverview, useDebtsOverview } from "@/data/debts";
import type { PayoffLine } from "@/data/payoff-plans";
import { formatSignedAmount } from "@/domain/account-display";
import { useLanguage, useTranslation } from "@/i18n/context";
import { hitArea, outline } from "@/lib/swift-ui-geometry";
import { debtSubtitle, dueStripWording, payoffRowWording } from "@/screens/debts/debts-wording";
import { PayoffBar } from "@/screens/debts/payoff-line";
import { useColors } from "@/theme/use-colors";
import type { ThemeColors } from "@/theme/use-colors";

type DebtListRow = DebtsScreenOverview["youOwe"][number];

interface SectionsProps {
    currency: string;
    debts: ReturnType<typeof useDebtsOverview>;
}

const TOTAL_LABEL = font({ design: "rounded", textStyle: "subheadline" });
const TOTAL = font({ design: "rounded", textStyle: "title2", weight: "semibold" });
const SUBTITLE = font({ design: "rounded", textStyle: "subheadline" });
const AMOUNT = font({ design: "rounded", textStyle: "subheadline", weight: "medium" });
const APPROX = font({ design: "rounded", textStyle: "caption", weight: "semibold" });
const CHEVRON = font({ design: "rounded", textStyle: "footnote", weight: "semibold" });
const PLAN_DATE = font({ design: "rounded", textStyle: "footnote" });

export function LedgerTotals({ currency, debts }: SectionsProps) {
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const format = (amount: number) => formatSignedAmount(amount, currency, showCents, language);
    const total = (label: string, amount: number) => (
        <VStack
            alignment="leading"
            modifiers={[accessibilityElement("combine"), accessibilityLabel(label), accessibilityValue(format(amount))]}
            spacing={2}
        >
            <SwiftText modifiers={[TOTAL_LABEL, foregroundStyle(colors.muted)]}>{label}</SwiftText>
            <SwiftText modifiers={[TOTAL, monospacedDigit(), lineLimit(1), foregroundStyle(LABEL)]}>
                {format(amount)}
            </SwiftText>
        </VStack>
    );

    return (
        <Section modifiers={[groupedRows(colors)]}>
            <HStack alignment="top" spacing={16}>
                {total(t("accounts.totals.have"), debts.haveTotal)}
                <Spacer />
                {total(t("accounts.totals.owe"), debts.youOweTotal)}
            </HStack>
            {debts.exact && debts.assetsExact ? null : (
                <SwiftText modifiers={[APPROX, foregroundStyle(colors.subtle)]}>{`${currency}?`}</SwiftText>
            )}
            {debts.due === null ? null : (
                <DueRow
                    colors={colors}
                    currency={currency}
                    due={debts.due}
                    format={format}
                    wording={dueStripWording(debts.due, debts, { language, t })}
                />
            )}
        </Section>
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
    const rowGround = groupedRows(colors);
    const format = (amount: number) => formatSignedAmount(amount, currency, showCents, language);

    const open = useCallback(
        (id: string) => router.push({ params: { accountId: id }, pathname: "/accounts/[accountId]" }),
        [router]
    );

    const wording = { currency, language, showCents, t };
    const tones = { due: colors.tint, income: colors.income, muted: colors.muted, overdue: colors.expense };
    const row = (item: DebtListRow) => {
        const subtitle = debtSubtitle(item, debts, wording);
        const line = debts.payoff.get(item.id);
        const plan = payoffRowWording(item, line, currency, hidden, wording);
        const paidOff = subtitle.text === null && plan !== null && "paidOff" in plan ? plan.paidOff : null;
        return (
            <DebtRow
                colors={colors}
                currency={currency}
                format={format}
                key={item.id}
                onOpen={open}
                plan={line && plan && "date" in plan ? { ...plan, line } : null}
                row={item}
                subtitle={paidOff ?? subtitle.text}
                subtitleColor={paidOff === null ? tones[subtitle.tone] : colors.income}
            />
        );
    };
    const cards = debts.youOwe.filter((item) => item.kind === "liability");
    const people = [...debts.youOwe.filter((item) => item.kind === "person"), ...debts.owedToYou];

    return (
        <>
            {cards.length > 0 ? (
                <Section
                    header={<Eyebrow colors={colors}>{t("accounts.section.liabilities")}</Eyebrow>}
                    modifiers={[rowGround]}
                >
                    {cards.map(row)}
                </Section>
            ) : null}
            {people.length > 0 ? (
                <Section
                    header={<Eyebrow colors={colors}>{t("accounts.section.people")}</Eyebrow>}
                    modifiers={[rowGround]}
                >
                    {people.map(row)}
                </Section>
            ) : null}
            {debts.settled.length > 0 ? (
                <Section modifiers={[rowGround]}>
                    <HStack
                        modifiers={[
                            hitArea(outline.rectangle()),
                            onTapGesture(() => setSettledOpen((current) => !current)),
                            accessibilityElement("combine"),
                            accessibilityAddTraits(["isButton"]),
                        ]}
                        spacing={12}
                    >
                        <SwiftText modifiers={[foregroundStyle(colors.muted)]}>
                            {t("debts.settled", { count: debts.settled.length })}
                        </SwiftText>
                        <Spacer />
                        <Image
                            color={colors.muted}
                            modifiers={[CHEVRON]}
                            systemName={settledOpen ? "chevron.down" : "chevron.right"}
                        />
                    </HStack>
                    {settledOpen ? debts.settled.map(row) : null}
                </Section>
            ) : null}
        </>
    );
}

interface DueRowProps {
    colors: ThemeColors;
    currency: string;
    due: NonNullable<DebtsScreenOverview["due"]>;
    format: (amount: number) => string;
    wording: ReturnType<typeof dueStripWording>;
}

function DueRow({ colors, currency, due, format, wording: { overdue, summary, title } }: DueRowProps) {
    return (
        <HStack
            modifiers={[
                accessibilityElement("combine"),
                accessibilityLabel(`${title}, ${summary}`),
                accessibilityValue(format(due.total)),
            ]}
            spacing={12}
        >
            <VStack alignment="leading" spacing={2}>
                <SwiftText modifiers={[TOTAL_LABEL, foregroundStyle(colors.muted)]}>{title}</SwiftText>
                <SwiftText modifiers={[SUBTITLE, lineLimit(2), foregroundStyle(overdue ? colors.expense : LABEL)]}>
                    {summary}
                </SwiftText>
            </VStack>
            <Spacer />
            {due.exact ? null : (
                <SwiftText modifiers={[APPROX, foregroundStyle(colors.subtle)]}>{`${currency}?`}</SwiftText>
            )}
            <SwiftText modifiers={[AMOUNT, monospacedDigit(), lineLimit(1), foregroundStyle(LABEL)]}>
                {format(due.total)}
            </SwiftText>
        </HStack>
    );
}

interface DebtRowProps {
    colors: ThemeColors;
    currency: string;
    format: (amount: number) => string;
    onOpen: (id: string) => void;
    plan: { a11y: string; date: string; line: PayoffLine } | null;
    row: DebtListRow;
    subtitle: string | null;
    subtitleColor: string;
}

const DebtRow = memo(({ colors, currency, format, onOpen, plan, row, subtitle, subtitleColor }: DebtRowProps) => {
    const { account } = row;
    const label = [account.name, plan?.a11y, subtitle].filter(Boolean).join(", ");

    return (
        <HStack
            modifiers={[
                hitArea(outline.rectangle()),
                onTapGesture(() => onOpen(account.id)),
                accessibilityElement("combine"),
                accessibilityAddTraits(["isButton"]),
                accessibilityLabel(label),
                accessibilityValue(format(row.amount)),
            ]}
            spacing={12}
        >
            <RNHostView matchContents>
                <View style={{ height: PARENT_TILE, width: PARENT_TILE }}>
                    <AccountTile account={account} size={PARENT_TILE} />
                </View>
            </RNHostView>
            <VStack alignment="leading" spacing={1}>
                <SwiftText modifiers={[PARENT_NAME, lineLimit(1), foregroundStyle(LABEL)]}>{account.name}</SwiftText>
                {plan === null ? null : (
                    <HStack modifiers={[frame({ maxWidth: Number.POSITIVE_INFINITY })]} spacing={8}>
                        <RNHostView matchContents={{ vertical: true }}>
                            <View>
                                <PayoffBar line={plan.line} />
                            </View>
                        </RNHostView>
                        <SwiftText
                            modifiers={[PLAN_DATE, monospacedDigit(), lineLimit(1), foregroundStyle(colors.muted)]}
                        >
                            {plan.date}
                        </SwiftText>
                    </HStack>
                )}
                {subtitle === null ? null : (
                    <SwiftText modifiers={[SUBTITLE, lineLimit(2), foregroundStyle(subtitleColor)]}>
                        {subtitle}
                    </SwiftText>
                )}
            </VStack>
            <Spacer />
            {row.exact ? null : (
                <SwiftText modifiers={[APPROX, foregroundStyle(colors.subtle)]}>{`${currency}?`}</SwiftText>
            )}
            <SwiftText modifiers={[AMOUNT, monospacedDigit(), lineLimit(1), foregroundStyle(LABEL)]}>
                {format(row.amount)}
            </SwiftText>
            <Image color={colors.muted} modifiers={[CHEVRON]} systemName="chevron.right" />
        </HStack>
    );
});
DebtRow.displayName = "DebtRow";
