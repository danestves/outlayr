import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { CloseToolbar } from "@/components/close-toolbar";
import { useDatabase } from "@/contexts/local-data-context";
import { findNotificationDebt } from "@/data/notification-debts";
import type { DebtVerb } from "@/domain/debts";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { NewDebt } from "@/screens/debts/new";

const VERBS: readonly DebtVerb[] = ["borrowed", "gotPaidBack", "lent", "paidBack"];

export default function NewDebtScreen() {
    const { leave, setDirty } = useDiscardGuard();
    const db = useDatabase();
    const params = useLocalSearchParams<{ fromPush?: string; personId?: string; verb?: string }>();
    const verb = VERBS.find((known) => known === params.verb);
    const [pushed] = useState(() => (params.fromPush === undefined ? null : findNotificationDebt(db, params.fromPush)));

    return (
        <>
            <CloseToolbar placement="left" />

            <NewDebt onDirtyChange={setDirty} onDone={leave} personId={params.personId} pushed={pushed} verb={verb} />
        </>
    );
}
