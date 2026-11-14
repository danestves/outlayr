import { useLocation } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";

import { DebtDetail } from "./debt-detail";
import { DebtsScreen } from "./debts-screen";

const DETAIL = /^\/debts\/[^/]+/u;

export function DebtsPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    const path = useLocation({ select: (location) => location.pathname });
    const first = sample.ledger.books.accounts.find((row) => row.kind === "person");
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            {DETAIL.test(path) && first ? <DebtDetail accountId={first.localId} /> : <DebtsScreen />}
        </Sampled>
    );
}

export function DebtsFirstVisit() {
    return (
        <DashboardShell>
            <DebtsPending />
        </DashboardShell>
    );
}
