import * as Cause from "effect/Cause";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { FirstRun } from "@/components/first-run";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useArrivedSince } from "@/data/transactions";
import type { TransactionWithCategory } from "@/data/transactions";
import { accountTitle } from "@/domain/linked-banks";
import type { LinkedBankAccount } from "@/domain/linked-banks";
import { resolveTransactionIdentity } from "@/domain/transaction-identity";
import { useBankOverview } from "@/hooks/use-bank-overview";
import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { BankFilesIntoRow } from "@/screens/settings/bank-parts";
import { useBankRowDetail } from "@/screens/settings/banks";
import { SILENT } from "@/state/atom-command";
import { finishFirstRunCommand } from "@/state/lifecycle-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { ProofHeader, ProofRow } from "./bank";

const ARRIVALS_SHOWN = 4;

export function OnboardingBankLinked() {
    const db = useDatabase();
    const t = useTranslation();
    const haptics = useHaptics();
    const params = useLocalSearchParams<{ bank?: string; ids?: string }>();
    const bank = params.bank ?? "";
    const ids = new Set(params.ids?.split(","));
    const overview = useBankOverview();
    const accounts =
        overview.kind === "ready" ? overview.overview.accounts.filter((account) => ids.has(account.id)) : [];
    // Right after a link nothing else writes, so every row the server stamped since then is one the bank sent.
    const since = accounts.length === 0 ? null : Math.min(...accounts.map((account) => account.linkedAt));
    const arrived = useArrivedSince(db, since, ARRIVALS_SHOWN);
    const currency = useGlobalCurrency(db);
    const finish = useAtomAction(
        finishFirstRunCommand,
        {
            onFailure: (cause) => {
                console.error("Finishing onboarding failed", Cause.squash(cause));
                haptics("error");
            },
        },
        SILENT
    );

    return (
        <FirstRun
            action={{ label: t("onboarding.bankLinked.action"), onPress: () => finish(db) }}
            eyebrow={t("onboarding.bankLinked.eyebrow")}
            title={t("settings.banks.result.title", { bank })}
        >
            {accounts.length === 0 ? null : (
                <View className="border-fr-rule mb-8 border-t">
                    {accounts.map((account) => (
                        <LinkedAccountRow account={account} key={account.id} />
                    ))}
                </View>
            )}
            <View>
                <ProofHeader label={t("onboarding.bankLinked.arriving")} />
                {arrived.length === 0 ? (
                    <Text accessibilityLiveRegion="polite" className="text-fr-muted text-subtitle py-3 leading-snug">
                        {t("onboarding.bankLinked.empty", { bank })}
                    </Text>
                ) : (
                    arrived.map((row) => <ArrivedRow currency={currency} key={row.id} row={row} />)
                )}
            </View>
        </FirstRun>
    );
}

function LinkedAccountRow({ account }: { account: LinkedBankAccount }) {
    const db = useDatabase();
    const { detail } = useBankRowDetail(account);
    return <BankFilesIntoRow account={account} db={db} detail={detail} title={accountTitle(account)} />;
}

function ArrivedRow({ currency, row }: { currency: string; row: TransactionWithCategory }) {
    const { color, emoji, icon } = resolveTransactionIdentity(row);
    const title = row.note || row.categoryName || "";
    return (
        <ProofRow
            amount={row.amount}
            code={row.currency ?? currency}
            color={color}
            detail={row.categoryName ?? ""}
            emoji={emoji}
            icon={icon}
            imageUri={row.imageUri}
            income={row.income}
            title={title}
        />
    );
}
