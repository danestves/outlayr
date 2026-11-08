import * as Cause from "effect/Cause";
import { useRouter } from "expo-router";
import { Alert } from "react-native";

import { useDatabase } from "@/contexts/local-data-context";
import { useArchivedAccounts } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { useLeaveWhenGone } from "@/hooks/use-leave-when-gone";
import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { setAccountArchivedCommand } from "@/state/accounts-commands";
import { SILENT } from "@/state/atom-command";
import { useAtomAction } from "@/state/use-atom-action";

const archivedTime = (account: Account) => account.archivedAt?.getTime() ?? 0;

export function useArchivedRows() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const rows = [...useArchivedAccounts(db)].sort((a, b) => archivedTime(b) - archivedTime(a));
    const setArchived = useAtomAction(
        setAccountArchivedCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to restore the account", Cause.squash(cause));
                haptics("error");
                Alert.alert(t("accounts.error.generic"));
            },
            onSuccess: () => haptics("success"),
        },
        SILENT
    );

    useLeaveWhenGone(rows.length === 0, () => router.back());

    return {
        db,
        restore: (account: Account) => setArchived({ archived: false, db, id: account.id }),
        rows,
    };
}
