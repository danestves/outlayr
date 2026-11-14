import { useLocation } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";

import { BudgetDetailScreen } from "./budget-detail";
import { BudgetsScreen } from "./budgets-screen";
import { PlanMonthScreen } from "./plan-month";
import { PlanYearScreen } from "./plan-year";

const PLAN_MONTH = /^\/budgets\/plan\/(\d{4}-\d{2})/u;
const PLAN = /^\/budgets\/plan\/?$/u;
const DETAIL = /^\/budgets\/[^/]+/u;

function Screen() {
    const sample = useSample();
    const path = useLocation({ select: (location) => location.pathname });
    const month = PLAN_MONTH.exec(path)?.[1];
    if (month) {
        return <PlanMonthScreen month={month} />;
    }
    if (PLAN.test(path)) {
        return <PlanYearScreen />;
    }
    const first = sample.ledger.books.budgets.find((row) => row.deletedAt === null && row.categoryId !== null);
    return DETAIL.test(path) && first?.categoryId ? (
        <BudgetDetailScreen categoryId={first.categoryId} />
    ) : (
        <BudgetsScreen />
    );
}

export function BudgetsPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    return (
        <Sampled label={loadingLabel.value} sample={sample}>
            <Screen />
        </Sampled>
    );
}

export function BudgetsFirstVisit() {
    return (
        <DashboardShell>
            <BudgetsPending />
        </DashboardShell>
    );
}
