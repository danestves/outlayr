import { useRouter } from "expo-router";

import { IMPORT_PATHS } from "@/domain/import-paths";
import { useWhen } from "@/lib/lifecycle";
import { moneyManagerSession, useMoneyManagerSession } from "@/lib/money-manager-session";

/** Mounted by the tab bar, which first run only reaches once it has handed over to the ledger. */
export function useResumedImport() {
    const router = useRouter();
    const { resume } = useMoneyManagerSession();

    // A backup opened in Outlayr before the first run lands here, since the guard keeps the ledger's routes shut.
    useWhen(resume !== null, () => {
        if (moneyManagerSession.takeResume()) {
            router.push(IMPORT_PATHS.ledger.open);
        }
    });
}
