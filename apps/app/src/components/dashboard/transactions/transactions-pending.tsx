import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";

import { TransactionsScreen } from "./screen";

const NO_SEARCH = {};
const STAY = () => undefined;

export function TransactionsPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            <TransactionsScreen search={NO_SEARCH} setSearch={STAY} />
        </Sampled>
    );
}

export function TransactionsFirstVisit() {
    return (
        <DashboardShell>
            <TransactionsPending />
        </DashboardShell>
    );
}
