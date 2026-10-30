import { useRouter } from "expo-router";
import { useEffect } from "react";

import { IMPORT_PATHS } from "@/domain/import-paths";
import { moneyManagerSession, useMoneyManagerSession } from "@/lib/money-manager-session";

/** Mounted by the tab bar, which first run only reaches once it has handed over to the ledger. */
export function useResumedImport() {
    const router = useRouter();
    const { resume } = useMoneyManagerSession();

    // oxlint-disable-next-line outlayr/react-effect-budget -- reopens a backup first run set aside, once the ledger is up
    useEffect(() => {
        if (resume !== null && moneyManagerSession.takeResume()) {
            router.push(IMPORT_PATHS.ledger.open);
        }
    }, [resume, router]);
}
