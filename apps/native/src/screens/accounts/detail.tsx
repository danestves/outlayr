import { SectionList } from "@legendapp/list/section-list";
import { isPerson, toAccountKind } from "@outlayr/money/account-kind";
import { Stack, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo } from "react";
import { Alert, View } from "react-native";

import { HeroNumber } from "@/components/amount-text";
import { DaySectionHeader } from "@/components/day-section-header";
import { EmptyState } from "@/components/empty-state";
import { Tile } from "@/components/empty-state-parts";
import { MonoLabel } from "@/components/mono-label";
import { ScreenHeader } from "@/components/screen-header";
import { Text } from "@/components/text";
import { toolbarIcon } from "@/components/toolbar-icons";
import { TransactionRow } from "@/components/transaction-row";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccountTransfers } from "@/data/account-transfers";
import { useAccountBalanceDetails, useAccounts, useAccountTransactions } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { useAccountPayoff, useOutsideMoveRows } from "@/data/debts";
import { useOutsidePaymentRows } from "@/data/installment-reads";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import { useNow } from "@/data/use-now";
import type { Database } from "@/db/client";
import { formatSignedAmount } from "@/domain/account-display";
import { monthAbbrevTitle } from "@/domain/dates";
import { groupByDay } from "@/domain/day-sections";
import { formatAmount } from "@/domain/money";
import { mergeByRecency } from "@/domain/transfer-log-rows";
import { useLanguage, useTranslation } from "@/i18n/context";
import { GoalTargetSheet } from "@/screens/budgets/components/goal-target-sheet";
import { PayoffSummary } from "@/screens/debts/payoff-line";
import { PersonHero, PersonToolbar } from "@/screens/debts/person-header";
import { usePayoffPlan } from "@/screens/debts/use-payoff-plan";

import { AccountBalanceChart } from "./components/account-balance-chart";
import { InstallmentSections } from "./components/installment-sections";
import { LiabilityToolbar } from "./components/liability-toolbar";

export function AccountDetail({ id }: { id: string }) {
    const db = useDatabase();
    const router = useRouter();
    const accounts = useAccounts(db);
    // Pending counts as gone, or this screen sits on a doomed account and pops on its own after the undo window.
    const { pendingId } = useDeferredDelete("account");
    const account = accounts.find((row) => row.id === id && row.id !== pendingId) ?? null;

    useEffect(() => {
        if (account == null) {
            router.back();
        }
    }, [account, router]);

    if (account == null) {
        return null;
    }
    return <AccountDetailLoaded account={account} db={db} />;
}

interface DetailProps {
    account: Account;
    db: Database;
    details: ReturnType<typeof useAccountBalanceDetails>;
    nowMs: number;
}

function AccountDetailLoaded({ account, db }: { account: Account; db: Database }) {
    const router = useRouter();
    const t = useTranslation();
    const nowMs = useNow();
    const details = useAccountBalanceDetails(db, account, nowMs);
    if (isPerson(account) || toAccountKind(account.kind) === "liability") {
        return <DebtDetail account={account} db={db} details={details} nowMs={nowMs} />;
    }
    return (
        <DetailBody
            account={account}
            db={db}
            details={details}
            nowMs={nowMs}
            summary={null}
            toolbar={
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Button
                        accessibilityLabel={t("accounts.a11y.edit")}
                        onPress={() =>
                            router.push({
                                params: { accountId: account.id },
                                pathname: "/accounts/[accountId]/edit",
                            })
                        }
                    >
                        <Stack.Toolbar.Icon {...toolbarIcon("more")} />
                    </Stack.Toolbar.Button>
                </Stack.Toolbar>
            }
        />
    );
}

function DebtDetail({ account, db, details, nowMs }: DetailProps) {
    const { balance, cells, rates } = details;
    const payoff = useAccountPayoff(db, account, balance, cells, rates, nowMs);
    const plan = usePayoffPlan(db, account, balance, payoff);
    return (
        <>
            <DetailBody
                account={account}
                db={db}
                details={details}
                nowMs={nowMs}
                summary={
                    plan.live && payoff ? (
                        <PayoffSummary currency={account.currency} line={payoff} onPress={plan.open} />
                    ) : null
                }
                toolbar={
                    isPerson(account) ? (
                        <PersonToolbar account={account} db={db} plan={plan} />
                    ) : (
                        <LiabilityToolbar account={account} plan={plan} />
                    )
                }
            />
            <GoalTargetSheet {...plan.sheet} />
        </>
    );
}

function DetailBody({
    account,
    db,
    details: { balance, cells, rates },
    nowMs,
    summary,
    toolbar,
}: DetailProps & { summary: ReactNode; toolbar: ReactNode }) {
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const transactionRows = useAccountTransactions(db, account.id);
    const transferRows = useAccountTransfers(db, account.id);
    const outsideRows = useOutsidePaymentRows(
        db,
        toAccountKind(account.kind) === "liability" ? account : null,
        t("installments.paidOutside")
    );
    const person = isPerson(account);
    const { pendingId, requestDelete } = useDeferredDelete("row");
    const moveRows = useOutsideMoveRows(db, person ? account : null, t("debts.field.outside"));
    const liveMoves = useMemo(() => moveRows.filter((row) => row.id !== pendingId), [moveRows, pendingId]);
    const rows = useMemo(
        () => mergeByRecency(mergeByRecency(mergeByRecency(transactionRows, transferRows), outsideRows), liveMoves),
        [transactionRows, transferRows, outsideRows, liveMoves]
    );
    const sections = useMemo(() => groupByDay(rows, account.currency, rates), [rows, account.currency, rates]);
    const transferIds = useMemo(() => new Set(transferRows.map((transfer) => transfer.id)), [transferRows]);
    // A transfer id is not a transaction id: `/transactions/[id]` finds nothing behind it.
    const outsidePlans = useMemo(() => new Map(outsideRows.map((row) => [row.id, row.planId])), [outsideRows]);
    const moveById = useMemo(() => new Map(liveMoves.map((row) => [row.id, row])), [liveMoves]);
    const openRow = useCallback(
        (rowId: string) => {
            const move = moveById.get(rowId);
            if (move !== undefined) {
                const amount = `${move.sign ?? ""}${formatAmount(move.amount, move.currency, showCents, language)}`;
                Alert.alert(move.note, amount, [
                    { style: "cancel", text: t("common.cancel") },
                    { onPress: () => requestDelete(rowId), style: "destructive", text: t("common.delete") },
                ]);
                return;
            }
            const planId = outsidePlans.get(rowId);
            if (planId === undefined) {
                router.push(transferIds.has(rowId) ? `/transactions/transfers/${rowId}` : `/transactions/${rowId}`);
            } else {
                router.push({ params: { planId }, pathname: "/installments/[planId]" });
            }
        },
        [router, transferIds, outsidePlans, moveById, requestDelete, t, showCents, language]
    );

    const startedAt = t("accounts.detail.startedAt", {
        amount: formatSignedAmount(account.initialBalance, account.currency, showCents, language),
        month: `${monthAbbrevTitle(account.initialBalanceDate, language)} ${account.initialBalanceDate.getFullYear()}`,
    });

    return (
        <>
            <ScreenHeader title={account.name} />
            <Stack.Screen.BackButton displayMode="minimal" />
            {toolbar}
            <SectionList
                className="bg-background"
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingBottom: 40,
                    paddingHorizontal: 20,
                }}
                contentInsetAdjustmentBehavior="automatic"
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                    <EmptyState
                        body={t(person ? "debts.person.empty" : "accounts.detail.empty")}
                        className="pt-4"
                        mark={<DetailMark />}
                        tier="inFlow"
                    />
                }
                ListHeaderComponent={
                    person ? (
                        <PersonHero account={account} balance={balance.total} plan={summary} showCents={showCents} />
                    ) : (
                        <View className="items-center gap-1 pt-6 pb-4">
                            <View className="flex-row items-center gap-2">
                                <HeroNumber
                                    amount={balance.total}
                                    code={account.currency}
                                    showCents={showCents}
                                    sign={balance.total < 0 ? "-" : ""}
                                />
                                {balance.exact ? null : (
                                    <View className="border-border rounded-[3px] border px-[3px]">
                                        <MonoLabel className="text-subtle">{`${account.currency}?`}</MonoLabel>
                                    </View>
                                )}
                            </View>
                            <Text className="font-sans-medium text-muted text-subtitle">{startedAt}</Text>
                            {summary}
                            <AccountBalanceChart account={account} cells={cells} rates={rates} showCents={showCents} />
                            {toAccountKind(account.kind) === "liability" ? (
                                <InstallmentSections account={account} db={db} nowMs={nowMs} />
                            ) : null}
                        </View>
                    )
                }
                recycleItems={false}
                renderItem={({ item }) => (
                    <AccountTransactionRow
                        currency={account.currency}
                        onPress={openRow}
                        rates={rates}
                        transaction={item}
                    />
                )}
                renderSectionHeader={({ section }) => (
                    <DaySectionHeader first={sections[0] === section} section={section} />
                )}
                sections={sections}
                stickySectionHeadersEnabled={false}
            />
        </>
    );
}

const MARK_TILE = 26;

function DetailMark() {
    return (
        <View className="flex-row items-center" style={{ gap: 9 }}>
            <Tile opacity={1} size={MARK_TILE} />
            <Tile opacity={0.5} size={MARK_TILE} />
        </View>
    );
}

const AccountTransactionRow = memo(TransactionRow);
