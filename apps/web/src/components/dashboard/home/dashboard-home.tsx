import { useDashboard } from "@/components/dashboard/shell/dashboard";

import { CategoryPanel } from "./category-panel";
import { KpiStrip } from "./kpi-strip";
import { OverviewPanel } from "./overview-panel";
import { SpendingChart } from "./spending-chart";
import { Transactions } from "./transactions";

export function HomeMain() {
    const { filters } = useDashboard();
    const { accounts, category, period } = filters;
    return (
        <>
            <KpiStrip />
            <SpendingChart />
            <Transactions key={`${period.key}|${accounts.join(",")}|${category}`} />
        </>
    );
}

export function HomePanel() {
    const { filters } = useDashboard();
    return filters.category === null ? <OverviewPanel /> : <CategoryPanel />;
}
