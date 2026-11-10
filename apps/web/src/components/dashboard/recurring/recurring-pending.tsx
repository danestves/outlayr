import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { EMPTY_RECURRING } from "@/lib/recurring";

import { recurringData, useSeedName } from "./data";
import type { RecurringWrites } from "./data";
import { RecurringScreen } from "./recurring-screen";

const NO_SEARCH = {};
const STAY = () => undefined;

export function RecurringPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            <SampleScreen ledger={sample.ledger} />
        </Sampled>
    );
}

/** Names read the dashboard context, which only exists inside `Sampled`. */
function SampleScreen({ ledger }: { ledger: Ledger }) {
    const nameOf = useSeedName();
    const data = useMemo(() => recurringData(ledger, EMPTY_RECURRING, nameOf), [ledger, nameOf]);
    const writes: RecurringWrites = { current: () => ledger, run: STAY };
    return <RecurringScreen data={data} search={NO_SEARCH} setSearch={STAY} writes={writes} />;
}

export function RecurringFirstVisit() {
    return (
        <DashboardShell>
            <RecurringPending />
        </DashboardShell>
    );
}
