import { Stack, useRouter } from "expo-router";

import { toolbarIcon } from "@/components/toolbar-icons";
import { useDatabase } from "@/contexts/local-data-context";
import { useBoolSetting } from "@/data/settings";
import { useCreateAccount } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";
import { useNewDebtItems } from "@/screens/debts/use-new-debt-items";
import { setBoolSettingCommand } from "@/state/settings-commands";
import { useAtomCommand } from "@/state/use-atom-command";

interface AddMenuActions {
    onCategoryLimit: () => void;
    onGoal: () => void;
    onOverallLimit: () => void;
}

/** Returns the element, not a component: a toolbar only accepts its own element types as children. */
export function useAddMenu({ onCategoryLimit, onGoal, onOverallLimit }: AddMenuActions) {
    const t = useTranslation();
    const createAccount = useCreateAccount();
    const debtItems = useNewDebtItems();

    return (
        <Stack.Toolbar.Menu accessibilityLabel={t("balances.add.prompt")}>
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
            <Stack.Toolbar.MenuAction icon="scope" onPress={onGoal}>
                {t("goals.add")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.Menu inline title={t("balances.add.limits")}>
                <Stack.Toolbar.MenuAction icon="gauge.with.needle" onPress={onCategoryLimit}>
                    {t("balances.add.categoryLimit")}
                </Stack.Toolbar.MenuAction>
                <Stack.Toolbar.MenuAction icon="chart.pie" onPress={onOverallLimit}>
                    {t("balances.add.overallLimit")}
                </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
    );
}

/** Hidden with one account or none: there is nothing to order. */
export function useSortMenu(accountCount: number) {
    const t = useTranslation();
    const router = useRouter();
    const db = useDatabase();
    const byHand = useBoolSetting(db, "accountsByHand");
    const setBoolSetting = useAtomCommand(setBoolSettingCommand);

    return (
        <Stack.Toolbar.Menu accessibilityLabel={t("balances.sort.prompt")} hidden={accountCount <= 1}>
            <Stack.Toolbar.Icon {...toolbarIcon("reorder")} />
            <Stack.Toolbar.Menu inline title={t("balances.sort.prompt")}>
                <Stack.Toolbar.MenuAction
                    isOn={byHand}
                    onPress={() => setBoolSetting({ db, key: "accountsByHand", value: true })}
                >
                    {t("balances.sort.yours")}
                </Stack.Toolbar.MenuAction>
                <Stack.Toolbar.MenuAction
                    isOn={!byHand}
                    onPress={() => setBoolSetting({ db, key: "accountsByHand", value: false })}
                >
                    {t("balances.sort.balance")}
                </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.MenuAction icon="arrow.up.arrow.down" onPress={() => router.push("/accounts/reorder")}>
                {t("accounts.reorderTitle")}
            </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
    );
}
