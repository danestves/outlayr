import { useLocation } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";

import { InstallmentDetail } from "./installment-detail";
import { InstallmentsScreen } from "./installments-screen";

const DETAIL = /^\/installments\/[^/]+/u;

export function InstallmentsPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    const path = useLocation({ select: (location) => location.pathname });
    const [first] = sample.ledger.books.installmentPlans;
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            {DETAIL.test(path) && first ? <InstallmentDetail planId={first.localId} /> : <InstallmentsScreen />}
        </Sampled>
    );
}

export function InstallmentsFirstVisit() {
    return (
        <DashboardShell>
            <InstallmentsPending />
        </DashboardShell>
    );
}
