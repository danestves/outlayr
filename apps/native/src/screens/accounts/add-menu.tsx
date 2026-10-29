import { Stack, useRouter } from "expo-router";

import { toolbarIcon } from "@/components/toolbar-icons";
import { useCreateAccount, useCreateLiability } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";

export function useAddMenu() {
    const router = useRouter();
    const t = useTranslation();
    const createAccount = useCreateAccount();
    const createLiability = useCreateLiability();

    return (
        <Stack.Toolbar.Menu accessibilityLabel={t("accounts.add.prompt")}>
            <Stack.Toolbar.Icon {...toolbarIcon("add")} />
            <Stack.Toolbar.MenuAction icon="building.columns" onPress={createAccount}>
                {t("accounts.add.account")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="creditcard" onPress={createLiability}>
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
