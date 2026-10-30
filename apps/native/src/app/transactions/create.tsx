import { useLocalSearchParams } from "expo-router";

import { NewTransaction } from "@/screens/transaction/new";
import type { EntryParams } from "@/state/entry-params";

export default function NewTransactionScreen() {
    // Only `income`/`amount`/`note` may arrive from outside the bundle (quick action, Siri). The rest come from the
    // voice screen, which resolved them on this ledger, or `from`, a ledger row being logged again.
    const params = useLocalSearchParams<Partial<Record<keyof EntryParams | "from", string>>>();

    return <NewTransaction {...params} />;
}
