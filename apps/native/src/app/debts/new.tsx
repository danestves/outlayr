import { useLocalSearchParams } from "expo-router";

import { CloseToolbar } from "@/components/close-toolbar";
import type { DebtVerb } from "@/domain/debts";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { NewDebt } from "@/screens/debts/new";

const VERBS: readonly DebtVerb[] = ["borrowed", "gotPaidBack", "lent", "paidBack"];

export default function NewDebtScreen() {
    const { leave, setDirty } = useDiscardGuard();
    const params = useLocalSearchParams<{ personId?: string; verb?: string }>();
    const verb = VERBS.find((known) => known === params.verb);

    return (
        <>
            <CloseToolbar placement="left" />

            <NewDebt onDirtyChange={setDirty} onDone={leave} personId={params.personId} verb={verb} />
        </>
    );
}
