import { Stack } from "expo-router";

import { ScreenHeader } from "@/components/screen-header";
import { useTranslation } from "@/i18n/context";
import { ArchivedAccounts } from "@/screens/accounts/archived";

export default function ArchivedAccountsScreen() {
    const t = useTranslation();

    return (
        <>
            <Stack.Screen.BackButton displayMode="minimal" />
            <ScreenHeader title={t("accounts.archived.title")} />
            <ArchivedAccounts />
        </>
    );
}
