import { Host } from "@expo/ui";
import {
    Button,
    HStack,
    Image,
    List,
    RNHostView,
    Section,
    Spacer,
    Text as SwiftText,
    SwipeActions,
    VStack,
} from "@expo/ui/swift-ui";
import {
    accessibilityAddTraits,
    accessibilityElement,
    accessibilityInputLabels,
    accessibilityLabel,
    accessibilityValue,
    font,
    foregroundStyle,
    lineLimit,
    monospacedDigit,
    onTapGesture,
    tint,
} from "@expo/ui/swift-ui/modifiers";
import { toAccountKind } from "@outlayr/money/account-kind";
import { isMultiCurrency } from "@outlayr/money/account-overview";
import { Stack, useRouter } from "expo-router";
import { memo, useCallback, useMemo } from "react";
import { View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { LABEL, PARENT_NAME } from "@/components/category-list-swift";
import { EmptyState } from "@/components/empty-state";
import { Tile } from "@/components/empty-state-parts";
import { groupedList, groupedRows } from "@/components/native/styles";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccountBalance, useBankAccounts } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import { useDebtsOverview } from "@/data/debts";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import type { Database } from "@/db/client";
import { formatSignedAmount } from "@/domain/account-display";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";
import { hitArea, outline } from "@/lib/swift-ui-geometry";
import { useColors } from "@/theme/use-colors";
import type { ThemeColors } from "@/theme/use-colors";

import { useAddMenu } from "./add-menu";
import { DebtSections, LedgerTotals } from "./debt-sections";

const SUBTITLE = font({
    design: "rounded",
    textStyle: "subheadline",
});
const AMOUNT = font({
    design: "rounded",
    textStyle: "subheadline",
    weight: "medium",
});
const APPROX = font({
    design: "rounded",
    textStyle: "caption",
    weight: "semibold",
});
const CHEVRON = font({
    design: "rounded",
    textStyle: "footnote",
    weight: "semibold",
});

export function Accounts() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const all = useBankAccounts(db);
    const { pendingId, requestDelete } = useDeferredDelete("account");
    const rows = useMemo(() => all.filter((account) => account.id !== pendingId), [all, pendingId]);
    const assets = useMemo(() => rows.filter((account) => toAccountKind(account.kind) === "asset"), [rows]);
    const currency = useGlobalCurrency(db);
    const debts = useDebtsOverview(db, useNow());
    const addMenu = useAddMenu();
    const empty = rows.length + debts.owedToYou.length + debts.youOwe.length + debts.settled.length === 0;
    const rowGround = groupedRows(colors);

    const openDetail = useCallback(
        (id: string) => {
            router.push({
                params: { accountId: id },
                pathname: "/accounts/[accountId]",
            });
        },
        [router]
    );

    const deleteAccount = useCallback(
        (account: Account) => {
            requestDelete(account.id, t("accounts.undo.body"));
        },
        [requestDelete, t]
    );

    return (
        <>
            <Stack.Header transparent />
            <Stack.Screen.Title>{t("accounts.title")}</Stack.Screen.Title>
            <Stack.Screen.BackButton displayMode="minimal" />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    accessibilityLabel={t("accounts.a11y.reorder")}
                    hidden={rows.length <= 1}
                    onPress={() => router.push("/accounts/reorder")}
                >
                    <Stack.Toolbar.Icon {...toolbarIcon("reorder")} />
                </Stack.Toolbar.Button>
                {addMenu}
            </Stack.Toolbar>
            {empty ? (
                <EmptyState body={t("accounts.empty")} mark={<AccountsMark />} tier="takeover" />
            ) : (
                <Host style={{ flex: 1 }} useViewportSizeMeasurement>
                    <List modifiers={groupedList(colors)}>
                        <LedgerTotals currency={currency} debts={debts} />
                        {assets.length > 0 ? (
                            <Section
                                header={
                                    <Eyebrow colors={colors}>{t("accounts.census", { count: assets.length })}</Eyebrow>
                                }
                                modifiers={[rowGround]}
                            >
                                {assets.map((account) => (
                                    <AccountRow
                                        account={account}
                                        colors={colors}
                                        db={db}
                                        key={account.id}
                                        onDelete={deleteAccount}
                                        onOpen={openDetail}
                                    />
                                ))}
                            </Section>
                        ) : null}
                        <DebtSections currency={currency} debts={debts} />
                        {rows.length >= 2 ? (
                            <Section modifiers={[rowGround]}>
                                <HStack
                                    modifiers={[
                                        hitArea(outline.rectangle()),
                                        onTapGesture(() => router.push("/transactions/transfers/create")),
                                        accessibilityElement("combine"),
                                        accessibilityAddTraits(["isButton"]),
                                        accessibilityLabel(t("transfers.a11y.new")),
                                        accessibilityInputLabels([t("transfers.title"), t("transfers.a11y.new")]),
                                    ]}
                                    spacing={12}
                                >
                                    <Image color={colors.tint} size={18} systemName="arrow.left.arrow.right" />
                                    <SwiftText modifiers={[foregroundStyle(colors.tint)]}>
                                        {t("transfers.title")}
                                    </SwiftText>
                                    <Spacer />
                                </HStack>
                            </Section>
                        ) : null}
                    </List>
                </Host>
            )}
        </>
    );
}

const MARK_TILE = 34;
const MARK_GAP = 11;

function AccountsMark() {
    return (
        <View className="flex-row items-center" style={{ gap: MARK_GAP }}>
            <Tile opacity={1} size={MARK_TILE} />
            <Tile opacity={0.6} size={MARK_TILE} />
            <Tile opacity={0.28} size={MARK_TILE} />
        </View>
    );
}

interface AccountRowProps {
    account: Account;
    colors: ThemeColors;
    db: Database;
    onDelete: (account: Account) => void;
    onOpen: (id: string) => void;
}

const AccountRow = memo(({ account, colors, db, onDelete, onOpen }: AccountRowProps) => {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const nowMs = useNow();
    const balance = useAccountBalance(db, account, nowMs);
    const stacked = useAccessibilityTextSize();
    const subtitle = isMultiCurrency(balance.composition, account.currency)
        ? t("accounts.multiCurrency")
        : account.currency;
    const tileColor = account.imageColor ?? account.customColor ?? colors.foreground;
    const subtitleText = (
        <SwiftText modifiers={[SUBTITLE, lineLimit(1), foregroundStyle(colors.muted)]}>{subtitle}</SwiftText>
    );
    const balanceTexts = (
        <>
            {balance.exact ? null : (
                <SwiftText modifiers={[APPROX, foregroundStyle(colors.subtle)]}>{`${account.currency}?`}</SwiftText>
            )}
            <SwiftText modifiers={[AMOUNT, monospacedDigit(), lineLimit(1), foregroundStyle(LABEL)]}>
                {formatSignedAmount(balance.total, account.currency, showCents, language)}
            </SwiftText>
        </>
    );

    return (
        <SwipeActions>
            <HStack
                modifiers={[
                    hitArea(outline.rectangle()),
                    onTapGesture(() => onOpen(account.id)),
                    // An `onTapGesture` is invisible to VoiceOver: without these the row cannot be opened.
                    accessibilityElement("combine"),
                    accessibilityAddTraits(["isButton"]),
                    accessibilityLabel(account.name),
                    accessibilityValue(
                        `${subtitle}, ${formatSignedAmount(balance.total, account.currency, showCents, language)}`
                    ),
                ]}
                spacing={12}
            >
                <RNHostView matchContents>
                    <View style={{ height: PARENT_TILE, width: PARENT_TILE }}>
                        <CategoryIconTile
                            color={tileColor}
                            emoji={account.emoji}
                            icon={account.icon}
                            imageUri={account.imageUri}
                            size={PARENT_TILE}
                            type="solid"
                        />
                    </View>
                </RNHostView>
                {stacked ? (
                    <VStack alignment="leading" spacing={1}>
                        <SwiftText modifiers={[PARENT_NAME, foregroundStyle(LABEL)]}>
                            {`${account.name} `}
                            <SwiftText modifiers={[SUBTITLE, foregroundStyle(colors.muted)]}>{subtitle}</SwiftText>
                        </SwiftText>
                        <HStack spacing={6}>{balanceTexts}</HStack>
                    </VStack>
                ) : (
                    <>
                        <VStack alignment="leading" spacing={1}>
                            <SwiftText modifiers={[PARENT_NAME, lineLimit(1), foregroundStyle(LABEL)]}>
                                {account.name}
                            </SwiftText>
                            {subtitleText}
                        </VStack>
                        <Spacer />
                        {balanceTexts}
                    </>
                )}
                {stacked ? <Spacer /> : null}
                <Image color={colors.muted} modifiers={[CHEVRON]} systemName="chevron.right" />
            </HStack>
            <SwipeActions.Actions edge="trailing">
                {/* A `destructive` role animates the row out before the confirmation is answered, and
                    cancelling never puts it back. The tint buys the same red without that. */}
                <Button
                    label={t("common.delete")}
                    modifiers={[tint(colors.danger)]}
                    onPress={() => onDelete(account)}
                    systemImage="trash"
                />
            </SwipeActions.Actions>
        </SwipeActions>
    );
});
AccountRow.displayName = "AccountRow";
