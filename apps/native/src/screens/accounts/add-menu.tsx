import { Stack } from "expo-router";

import { toolbarIcon } from "@/components/toolbar-icons";
import { useCreateAccount } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";
import { useNewDebtItems } from "@/screens/debts/use-new-debt-items";

export function useAddMenu() {
    const t = useTranslation();
    const createAccount = useCreateAccount();
    const debtItems = useNewDebtItems();

    return (
        <Stack.Toolbar.Menu accessibilityLabel={t("accounts.add.prompt")}>
            <Stack.Toolbar.Icon {...toolbarIcon("add")} />
            <Stack.Toolbar.MenuAction icon="building.columns" onPress={createAccount}>
                {t("accounts.add.account")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.Menu inline title={t("debts.title")}>
                {debtItems.map((item) => (
                    <Stack.Toolbar.MenuAction icon={item.icon} key={item.id} onPress={item.onPress}>
                        {item.label}
                    </Stack.Toolbar.MenuAction>
                ))}
            </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
    );
}
