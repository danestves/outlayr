import CreditCardAddIcon from "@hugeicons-pro/core-stroke-rounded/CreditCardAddIcon";
import ShopSignIcon from "@hugeicons-pro/core-stroke-rounded/ShopSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import { toAccountKind } from "@outlayr/money/account-kind";
import { startingDraft } from "@outlayr/money/installment-terms";
import {
    installmentAppDomain,
    installmentAppsIn,
    installmentRegion,
    isInstallmentAppAccount,
} from "@outlayr/money/institution-map";
import type { InstallmentApp } from "@outlayr/money/institution-map";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";

import { AccountTile } from "@/components/account-tile";
import { ChoiceRow } from "@/components/list/list-row";
import { addInstallmentApp, InstallmentAppMark } from "@/components/transaction-form/stage/step-account-installments";
import { useDatabase } from "@/contexts/local-data-context";
import type { Account } from "@/data/accounts-core";
import { lastPlanRows } from "@/data/installment-reads";
import { useAccountCaps, useCreateLiability, useOpenPaywall } from "@/hooks/use-pro-gate";
import { useRegionCode } from "@/hooks/use-region-code";
import { useTranslation } from "@/i18n/context";
import { useOnChange } from "@/lib/lifecycle";
import { notifyFailure } from "@/lib/notify";
import { voidAppFlowCommand } from "@/state/entry-commands";
import { useAtomCommand } from "@/state/use-atom-command";
import { useColors } from "@/theme/use-colors";

import { termsSubtitle } from "./new-purchase-terms";

const TILE = 22;

// The presets an app sells before it has a plan of its own.
const presetFor = (app: InstallmentApp) => startingDraft({ kind: "liability", name: app.label }, [], null);

interface NewPurchaseWhereProps {
    accounts: readonly Account[];
    onContentHeight: (height: number) => void;
    onPick: (account: Account) => void;
    selectedId: string | null;
}

export function NewPurchaseWhere({ accounts, onContentHeight, onPick, selectedId }: NewPurchaseWhereProps) {
    const db = useDatabase();
    const t = useTranslation();
    const runFlow = useAtomCommand(voidAppFlowCommand);
    const region = installmentRegion(useRegionCode());
    const caps = useAccountCaps();
    const createLiability = useCreateLiability();
    const openPaywall = useOpenPaywall();
    const [adding, setAdding] = useState<string | null>(null);
    // The ids the editor was opened over; the one it adds is the account to pick.
    const before = useRef<ReadonlySet<string> | null>(null);
    const accountIds = accounts.map((account) => account.id).join("\u0000");

    useOnChange([accountIds], () => {
        const known = before.current;
        const made = known === null ? undefined : accounts.find((account) => !known.has(account.id));
        if (made) {
            before.current = null;
            onPick(made);
        }
    });

    const liabilities = accounts.filter((account) => toAccountKind(account.kind) === "liability");
    const taken = new Set(
        liabilities.filter(isInstallmentAppAccount).map((account) => installmentAppDomain(account.name))
    );
    const apps = installmentAppsIn(region).filter((app) => !taken.has(app.domain));
    const hasCard = liabilities.some((account) => !isInstallmentAppAccount(account));

    const termsFor = (account: Account) => startingDraft(account, lastPlanRows(db, account.id), null);

    // A creation in flight picks its own account; a newer tap would otherwise supersede it only to lose to it.
    const pick = (account: Account) => {
        if (adding === null) {
            onPick(account);
        }
    };

    const add = (app: InstallmentApp) => {
        if (adding !== null) {
            return;
        }
        if (caps.installmentApps) {
            openPaywall("installment_apps");
            return;
        }
        setAdding(app.id);
        void runFlow(
            addInstallmentApp(db, app, {
                onFailed: () =>
                    notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") }),
                onPicked: onPick,
                onSettled: () => setAdding(null),
            })
        );
    };

    const create = () => {
        if (adding !== null) {
            return;
        }
        before.current = new Set(accounts.map((account) => account.id));
        createLiability();
    };

    return (
        <ScrollView
            className="bg-background flex-1"
            contentContainerClassName="px-5 pb-safe-offset-10"
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={(_, height) => onContentHeight(height)}
            showsVerticalScrollIndicator={false}
        >
            <View>
                {liabilities.map((account) => (
                    <ChoiceRow
                        detail={termsSubtitle(t, termsFor(account))}
                        key={account.id}
                        label={account.name}
                        leading={<AccountTile account={account} radius={6} size={TILE} />}
                        onPress={() => pick(account)}
                        selected={account.id === selectedId}
                    />
                ))}
                {apps.map((app) => (
                    <ChoiceRow
                        detail={termsSubtitle(t, presetFor(app))}
                        key={app.id}
                        label={app.label}
                        leading={<InstallmentAppMark domain={app.domain} />}
                        onPress={() => add(app)}
                        selected={false}
                        value={adding === app.id ? t("installments.apps.adding") : undefined}
                    />
                ))}
                {hasCard ? null : (
                    <ChoiceRow
                        label={t("installments.new.creditCard")}
                        leading={<RowIcon icon={CreditCardAddIcon} />}
                        onPress={create}
                        selected={false}
                    />
                )}
                <ChoiceRow
                    label={t("installments.new.somewhereElse")}
                    leading={<RowIcon icon={ShopSignIcon} />}
                    onPress={create}
                    selected={false}
                />
            </View>
        </ScrollView>
    );
}

function RowIcon({ icon }: { icon: IconSvgElement }) {
    const colors = useColors();
    return (
        <View className="items-center justify-center" style={{ height: TILE, width: TILE }}>
            <HugeiconsIcon color={colors.muted} icon={icon} size={20} strokeWidth={2} />
        </View>
    );
}
