import { useLocation } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";

import { AccountDetail } from "./account-detail";
import { AccountsScreen } from "./accounts-screen";
import { NetWorthScreen } from "./net-worth";

const DETAIL = /^\/app\/accounts\/(?!reorder)[^/]+/u;
const NET_WORTH = /^\/app\/accounts\/net-worth/u;

function screenFor(path: string, sampleId: string | undefined) {
    if (NET_WORTH.test(path)) {
        return <NetWorthScreen />;
    }
    return DETAIL.test(path) && sampleId ? <AccountDetail accountId={sampleId} /> : <AccountsScreen />;
}

export function AccountsPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    const path = useLocation({ select: (location) => location.pathname });
    const [first] = sample.ledger.books.accounts;
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            {screenFor(path, first?.localId)}
        </Sampled>
    );
}

export function AccountsFirstVisit() {
    return (
        <DashboardShell>
            <AccountsPending />
        </DashboardShell>
    );
}
