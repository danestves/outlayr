import { useRouter } from "expo-router";
import { View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { SettingsSection } from "@/components/list/list-row";
import { SettingsAction } from "@/components/settings/settings-action";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { formatTargetDate, formatTargetMonth } from "@/domain/dates";
import { buildImportPlan } from "@/domain/money-manager/plan";
import { importCapsPassed } from "@/domain/money-manager/pro-caps";
import type { ImportCap } from "@/domain/money-manager/pro-caps";
import { useOpenPaywall } from "@/hooks/use-pro-gate";
import { useProLocked } from "@/hooks/use-pro-locked";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { moneyManagerSession, useMoneyManagerSession } from "@/lib/money-manager-session";
import type { MoneyManagerDraft } from "@/lib/money-manager-session";
import { SILENT } from "@/state/atom-command";
import { applyMoneyManagerImportCommand } from "@/state/money-manager-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { ImportRow } from "./components/import-row";
import { ImportHero, YearBars } from "./components/parts";
import { categoryTally, grouped, money, tc } from "./labels";
import { useImportPaths } from "./paths";

const ATTENTION = "#B56858";
const ACCOUNTS = "#4487B8";
const CATEGORIES = "#8D71B2";
const BUDGETS = "#339475";
const CURRENCIES = "#A17830";
const CALENDAR = "#6C7BBD";

const CAP_LABEL = {
    accounts: "accounts.title",
    budgets: "mmImport.nav.budgets",
    currencies: "mmImport.overview.currencies",
    installmentApps: "pro.row.installmentApps",
} as const satisfies Record<ImportCap, TranslationKey>;

function dayDate(day: string): Date {
    return new Date(`${day}T12:00:00`);
}

export function MoneyManagerOverview() {
    const { draft } = useMoneyManagerSession();
    if (draft === null) {
        return <SettingsScreen>{null}</SettingsScreen>;
    }
    return <Overview draft={draft} />;
}

function Overview({ draft }: { draft: MoneyManagerDraft }) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { onboarding, paths } = useImportPaths();
    const locked = useProLocked();
    const openPaywall = useOpenPaywall();
    const { analysis, choices } = draft;
    const plan = buildImportPlan(draft.snapshot, analysis, choices, draft.ledger);
    const total = plan.entries.length + plan.transfers.length;
    const apply = useAtomAction(
        applyMoneyManagerImportCommand,
        {
            onFailure: () => moneyManagerSession.markFailed(),
            onSuccess: () => router.replace(paths.done),
        },
        SILENT
    );

    const open = analysis.accounts.filter((account) => account.group === "open").length;
    const hidden = analysis.accounts.filter((account) => account.group === "hidden").length;
    const { matched, created } = categoryTally(draft);
    const uncategorized = analysis.uncategorized.expense + analysis.uncategorized.income;
    const gaps = analysis.balanceGaps;
    const budgetNames = plan.budgets.map((budget) => {
        const planned = plan.categories.find((category) => category.key === budget.categoryKey);
        return planned?.name ?? "";
    });
    const from = analysis.firstDay ? formatTargetMonth(dayDate(analysis.firstDay)) : null;
    const to = analysis.lastDay ? formatTargetMonth(dayDate(analysis.lastDay)) : null;
    let range: string | undefined;
    if (from !== null && to !== null) {
        range = from === to ? from : t("mmImport.overview.caption", { from, to });
    }

    const startDetail = () => {
        if (analysis.overlap === null) {
            return t("mmImport.overview.startAll");
        }
        if (choices.start.kind === "cutoff") {
            return t("mmImport.overview.startCutoff", {
                day: formatTargetDate(dayDate(analysis.overlap.outlayrFirstDay)),
            });
        }
        if (choices.start.kind === "skipMatches") {
            return tc(t, "mmImport.overview.startSkipMatches", analysis.overlap.matches);
        }
        return t("mmImport.overview.startAll");
    };

    const passed = locked ? importCapsPassed(plan, draft.ledger) : [];
    const [firstPassed] = passed;

    const goPro = () => {
        if (onboarding) {
            moneyManagerSession.resumeInLedger(draft.source);
            router.push("/onboarding/currency");
            return;
        }
        // The account caps' own paywall counts what the ledger holds today, which says nothing about this backup.
        openPaywall("import");
    };

    const runImport = () => {
        if (!moneyManagerSession.claimApply(total)) {
            return;
        }
        apply({ db, draft });
        router.push(paths.importing);
    };

    const [firstGap] = gaps;
    const gapTitle =
        gaps.length === 1 && firstGap
            ? t("mmImport.overview.gapOne", { account: accountName(draft, firstGap.accountUid) })
            : t("mmImport.overview.gapMany", { shown: grouped(gaps.length) });

    return (
        <SettingsScreen>
            <View className="flex-row items-end justify-between gap-4">
                <View className="flex-1">
                    <ImportHero
                        caption={range}
                        eyebrow={t("mmImport.overview.comingOver")}
                        value={tc(t, "mmImport.count.entries", analysis.entryCount)}
                    />
                </View>
                <View className="pb-1">
                    <YearBars years={analysis.perYear} />
                </View>
            </View>

            {uncategorized > 0 || gaps.length > 0 ? (
                <SettingsSection title={t("mmImport.overview.needsALook")}>
                    {uncategorized > 0 ? (
                        <ImportRow
                            detail={
                                analysis.uncategorized.pairs.length > 0
                                    ? tc(t, "mmImport.overview.pairs", analysis.uncategorized.pairs.length)
                                    : t("mmImport.uncategorized.caption", {
                                          expense: grouped(analysis.uncategorized.expense),
                                          income: grouped(analysis.uncategorized.income),
                                      })
                            }
                            leading={<CategoryIconTile color={ATTENTION} icon="MoreHorizontalCircle01" size={32} />}
                            onPress={() => router.push(paths.uncategorized)}
                            testID="mm-overview-uncategorized"
                            title={t("mmImport.overview.uncategorized", { shown: grouped(uncategorized) })}
                        />
                    ) : null}
                    {gaps.length > 0 && firstGap ? (
                        <ImportRow
                            detail={
                                gaps.length === 1
                                    ? t("mmImport.overview.gapDetail", {
                                          amount: money(
                                              Math.abs(firstGap.stored - firstGap.computed),
                                              firstGap.currency
                                          ),
                                      })
                                    : undefined
                            }
                            leading={<CategoryIconTile color={ATTENTION} icon="BalanceScale" size={32} />}
                            onPress={() => router.push(paths.balances)}
                            testID="mm-overview-balances"
                            title={gapTitle}
                        />
                    ) : null}
                </SettingsSection>
            ) : null}

            <SettingsSection title={t("mmImport.overview.setUp")}>
                <ImportRow
                    detail={
                        hidden > 0
                            ? t("mmImport.overview.accountsDetail", { hidden, open })
                            : t("mmImport.overview.accountsDetailOpen", { open })
                    }
                    leading={<CategoryIconTile color={ACCOUNTS} icon="Wallet01" size={32} />}
                    onPress={() => router.push(paths.accounts)}
                    testID="mm-overview-accounts"
                    title={t("accounts.title")}
                    value={String(plan.accounts.length)}
                />
                <ImportRow
                    detail={t("mmImport.overview.categoriesDetail", { created, matched })}
                    leading={<CategoryIconTile color={CATEGORIES} icon="Tag01" size={32} />}
                    onPress={() => router.push(paths.categories)}
                    testID="mm-overview-categories"
                    title={t("nav.categories")}
                    value={String(matched + created)}
                />
                {analysis.categories.some((category) => category.limit !== null) ? (
                    <ImportRow
                        detail={budgetSummary(budgetNames, t)}
                        leading={<CategoryIconTile color={BUDGETS} icon="Target01" size={32} />}
                        onPress={() => router.push(paths.budgets)}
                        testID="mm-overview-budgets"
                        title={t("mmImport.nav.budgets")}
                        value={String(plan.budgets.length)}
                    />
                ) : null}
                <ImportRow
                    detail={t("mmImport.overview.currenciesDetail", { codes: analysis.currencies.join(", ") })}
                    leading={<CategoryIconTile color={CURRENCIES} icon="Coins01" size={32} />}
                    title={t("mmImport.overview.currencies")}
                    value={String(analysis.currencies.length)}
                />
                {analysis.overlap === null ? null : (
                    <ImportRow
                        detail={startDetail()}
                        leading={<CategoryIconTile color={CALENDAR} icon="Calendar01" size={32} />}
                        onPress={() => router.push(paths.start)}
                        testID="mm-overview-start"
                        title={t("mmImport.nav.start")}
                    />
                )}
            </SettingsSection>

            {analysis.removedEntryCount + analysis.removedAccountCount + analysis.reminderCount > 0 ? (
                <SettingsSection title={t("mmImport.overview.leftBehind")}>
                    {analysis.removedEntryCount > 0 ? (
                        <LeftBehind
                            label={t("mmImport.overview.deletedEntries")}
                            value={String(analysis.removedEntryCount)}
                        />
                    ) : null}
                    {analysis.removedAccountCount > 0 ? (
                        <LeftBehind
                            label={t("mmImport.overview.deletedAccounts")}
                            value={String(analysis.removedAccountCount)}
                        />
                    ) : null}
                    {analysis.reminderCount > 0 ? (
                        <LeftBehind
                            label={t("mmImport.overview.reminders")}
                            value={t("mmImport.overview.remindersValue")}
                        />
                    ) : null}
                </SettingsSection>
            ) : null}

            {firstPassed ? (
                <SettingsSection
                    footer={t(onboarding ? "mmImport.pro.laterNote" : "mmImport.pro.note")}
                    title={t("mmImport.pro.section")}
                >
                    {passed.map(({ cap, count, free }) => (
                        <ImportRow
                            detail={t("mmImport.pro.freeKeeps", { shown: grouped(free) })}
                            key={cap}
                            testID={`mm-overview-pro-${cap}`}
                            title={t(CAP_LABEL[cap])}
                            value={grouped(count)}
                        />
                    ))}
                </SettingsSection>
            ) : null}

            <View className="gap-3 pt-10">
                <SettingsAction
                    busy={false}
                    busyLabel=""
                    disabled={total === 0}
                    label={
                        firstPassed
                            ? t(onboarding ? "mmImport.pro.later" : "mmImport.pro.continue")
                            : tc(t, "mmImport.overview.import", total)
                    }
                    onPress={firstPassed ? goPro : runImport}
                />
                {firstPassed ? null : (
                    <Text className="text-muted text-footnote text-center">{t("mmImport.overview.undo")}</Text>
                )}
            </View>
        </SettingsScreen>
    );
}

function LeftBehind({ label, value }: { label: string; value: string }) {
    return (
        <View className="border-border flex-row items-center justify-between gap-3 border-b py-3">
            <Text className="text-muted text-subtitle">{label}</Text>
            <Text className="text-muted text-subtitle tabular-nums">{value}</Text>
        </View>
    );
}

function accountName(draft: MoneyManagerDraft, uid: string): string {
    return draft.analysis.accounts.find((account) => account.uid === uid)?.title ?? "";
}

const BUDGET_NAMES_SHOWN = 2;

function budgetSummary(names: readonly string[], t: ReturnType<typeof useTranslation>): string {
    if (names.length <= BUDGET_NAMES_SHOWN) {
        return names.join(", ");
    }
    return t("mmImport.overview.andMore", {
        shown: grouped(names.length - BUDGET_NAMES_SHOWN),
        first: names.slice(0, BUDGET_NAMES_SHOWN).join(", "),
    });
}
