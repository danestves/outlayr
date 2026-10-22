import { Stack, useRouter } from "expo-router";

import { toolbarIcon } from "@/components/toolbar-icons";
import type { Account } from "@/data/accounts-core";
import { useTranslation } from "@/i18n/context";
import { payoffMenuActions } from "@/screens/debts/payoff-menu-actions";
import type { PayoffPlanControls } from "@/screens/debts/use-payoff-plan";
import { useScreenshotImport } from "@/screens/installments/use-screenshot-import";

export function LiabilityToolbar({ account, plan }: { account: Account; plan: PayoffPlanControls }) {
    const router = useRouter();
    const t = useTranslation();
    const importScreenshot = useScreenshotImport(account.id);
    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu accessibilityLabel={t("debts.a11y.more")}>
                <Stack.Toolbar.Icon {...toolbarIcon("more")} />
                <Stack.Toolbar.MenuAction
                    icon="cart.badge.plus"
                    onPress={() =>
                        router.push({
                            params: { accountId: account.id, installments: "1" },
                            pathname: "/transactions/create",
                        })
                    }
                >
                    {t("installments.newPurchase")}
                </Stack.Toolbar.MenuAction>
                <Stack.Toolbar.MenuAction icon="text.viewfinder" onPress={importScreenshot}>
                    {t("installments.scan.import")}
                </Stack.Toolbar.MenuAction>
                <Stack.Toolbar.MenuAction
                    icon="pencil"
                    onPress={() =>
                        router.push({ params: { accountId: account.id }, pathname: "/accounts/[accountId]/edit" })
                    }
                >
                    {t("common.edit")}
                </Stack.Toolbar.MenuAction>
                {payoffMenuActions(plan, t("debts.plan.payOffBy"), t)}
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>
    );
}
