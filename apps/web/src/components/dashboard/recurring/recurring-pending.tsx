import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";
import { EMPTY_RECURRING } from "@/lib/recurring";

import { recurringData, useSeedName } from "./data";
import type { RecurringWrites } from "./data";
import { RecurringScreen } from "./recurring-screen";

const NO_SEARCH = {};
const STAY = () => undefined;

export function RecurringPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    const nameOf = useSeedName();
    const data = useMemo(() => recurringData(sample.ledger, EMPTY_RECURRING, nameOf), [nameOf, sample]);
    const writes: RecurringWrites = { current: () => sample.ledger, run: STAY };
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            <RecurringScreen data={data} search={NO_SEARCH} setSearch={STAY} writes={writes} />
        </Sampled>
    );
}

export function RecurringFirstVisit() {
    return (
        <DashboardShell>
            <RecurringPending />
        </DashboardShell>
    );
}
