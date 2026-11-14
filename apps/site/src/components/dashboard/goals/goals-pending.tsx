import { useLocation } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";

import { GoalDetail } from "./goal-detail";
import { GoalsScreen } from "./goals-screen";

const DETAIL = /^\/app\/goals\/[^/]+/u;

export function GoalsPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    const path = useLocation({ select: (location) => location.pathname });
    const [first] = sample.ledger.books.savingsGoals;
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            {DETAIL.test(path) && first ? <GoalDetail goalId={first.localId} /> : <GoalsScreen />}
        </Sampled>
    );
}

export function GoalsFirstVisit() {
    return (
        <DashboardShell>
            <GoalsPending />
        </DashboardShell>
    );
}
