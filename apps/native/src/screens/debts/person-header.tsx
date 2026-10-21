import { Stack, useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import type { ReactNode } from "react";
import { Alert, View } from "react-native";

import { HeroNumber } from "@/components/amount-text";
import { MonoLabel } from "@/components/mono-label";
import { toolbarIcon } from "@/components/toolbar-icons";
import { accountsRepo } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import type { Database } from "@/db/client";
import { debtChoices, debtStanding } from "@/domain/debt-choices";
import type { DebtStanding } from "@/domain/debt-choices";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";

import { payoffMenuActions } from "./payoff-menu-actions";
import type { PayoffPlanControls } from "./use-payoff-plan";

const STANDING_LABEL = {
    owesYou: "debts.person.owesYou",
    settled: "debts.person.settled",
    youOwe: "debts.person.youOwe",
} as const satisfies Record<DebtStanding, TranslationKey>;

interface PersonHeroProps {
    account: Account;
    /** Negative when you owe them. */
    balance: number;
    plan: ReactNode;
    showCents: boolean;
}

export function PersonHero({ account, balance, plan, showCents }: PersonHeroProps) {
    const router = useRouter();
    const t = useTranslation();
    const standing = debtStanding(balance, account.currency);

    return (
        <View className="items-center gap-1 pt-6 pb-4">
            <MonoLabel>{t(STANDING_LABEL[standing])}</MonoLabel>
            <HeroNumber amount={Math.abs(balance)} code={account.currency} showCents={showCents} sign="" />
            {plan}
            <View className="w-full flex-row gap-3 pt-5">
                {debtChoices(standing).map((choice, index) => (
                    <View className="flex-1" key={choice.verb}>
                        <Button
                            className="rounded-full"
                            fullWidth
                            onPress={() =>
                                router.push({
                                    params: { personId: account.id, verb: choice.verb },
                                    pathname: "/debts/new",
                                })
                            }
                            size="md"
                            variant={index === 0 ? "primary" : "secondary"}
                        >
                            {t(choice.labelKey)}
                        </Button>
                    </View>
                ))}
            </View>
        </View>
    );
}

/** Writes the name alone: the account editor only knows assets and liabilities. */
export function PersonToolbar({ account, db, plan }: { account: Account; db: Database; plan: PayoffPlanControls }) {
    const t = useTranslation();
    const { requestDelete } = useDeferredDelete("account");

    const rename = () =>
        Alert.prompt(
            t("debts.person.rename"),
            undefined,
            [
                { style: "cancel", text: t("common.cancel") },
                {
                    onPress: (next?: string) => {
                        const name = next?.trim() ?? "";
                        if (name !== "" && name !== account.name) {
                            accountsRepo.update(db, account.id, { name }).catch(() => {
                                notifyFailure({ title: t("accounts.error.saveFailed") });
                            });
                        }
                    },
                    text: t("common.save"),
                },
            ],
            "plain-text",
            account.name
        );

    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu accessibilityLabel={t("debts.a11y.more")}>
                <Stack.Toolbar.Icon {...toolbarIcon("more")} />
                <Stack.Toolbar.MenuAction icon="pencil" onPress={rename}>
                    {t("debts.person.rename")}
                </Stack.Toolbar.MenuAction>
                {payoffMenuActions(plan, t("debts.plan.payBackBy"), t)}
                <Stack.Toolbar.MenuAction
                    destructive
                    icon="trash"
                    onPress={() => requestDelete(account.id, t("debts.person.deleteBody"))}
                >
                    {t("common.delete")}
                </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>
    );
}
