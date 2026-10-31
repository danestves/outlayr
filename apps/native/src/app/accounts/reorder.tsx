import { Stack, useRouter } from "expo-router";

import { ScreenHeader } from "@/components/screen-header";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useDatabase } from "@/contexts/local-data-context";
import { useBoolSetting } from "@/data/settings";
import { useTranslation } from "@/i18n/context";
import { AccountReorder } from "@/screens/accounts/reorder";
import { setBoolSettingCommand } from "@/state/settings-commands";
import { useAtomCommand } from "@/state/use-atom-command";

export default function AccountReorderScreen() {
    const router = useRouter();
    const t = useTranslation();
    const db = useDatabase();
    const byHand = useBoolSetting(db, "accountsByHand");
    const setBoolSetting = useAtomCommand(setBoolSettingCommand);

    return (
        <>
            <Stack.Screen.BackButton displayMode="minimal" />
            <ScreenHeader title={t("accounts.reorderTitle")} />
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Menu accessibilityLabel={t("debts.a11y.more")} hidden={!byHand}>
                    <Stack.Toolbar.Icon {...toolbarIcon("more")} />
                    <Stack.Toolbar.MenuAction
                        icon="arrow.up.arrow.down"
                        onPress={() => setBoolSetting({ db, key: "accountsByHand", value: false })}
                    >
                        {t("accounts.sortByBalance")}
                    </Stack.Toolbar.MenuAction>
                </Stack.Toolbar.Menu>
                <Stack.Toolbar.Button accessibilityLabel={t("common.done")} onPress={() => router.back()}>
                    <Stack.Toolbar.Icon {...toolbarIcon("done")} />
                </Stack.Toolbar.Button>
            </Stack.Toolbar>

            <AccountReorder />
        </>
    );
}
