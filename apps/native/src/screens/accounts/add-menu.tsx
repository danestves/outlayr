import { Stack, useRouter } from "expo-router";

import { toolbarIcon } from "@/components/toolbar-icons";
import { useAccountCreateRoute, useLiabilityCreateRoute } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";

export function useAddMenu() {
    const router = useRouter();
    const t = useTranslation();
    const accountRoute = useAccountCreateRoute();
    const liabilityRoute = useLiabilityCreateRoute();

    return (
        <Stack.Toolbar.Menu accessibilityLabel={t("accounts.add.prompt")}>
            <Stack.Toolbar.Icon {...toolbarIcon("add")} />
            <Stack.Toolbar.MenuAction icon="building.columns" onPress={() => router.push(accountRoute)}>
                {t("accounts.add.account")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
                icon="creditcard"
                onPress={() =>
                    router.push(
                        liabilityRoute === "/paywall"
                            ? liabilityRoute
                            : { params: { kind: "liability" }, pathname: liabilityRoute }
                    )
                }
            >
                {t("debts.add.liability")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="person" onPress={() => router.push("/debts/new")}>
                {t("debts.add.person")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="hammer" onPress={() => router.push("/debts/owe")}>
                {t("debts.add.owe")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
                icon="cart"
                onPress={() => router.push({ params: { installments: "1" }, pathname: "/transactions/create" })}
            >
                {t("accounts.add.installments")}
            </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
    );
}
