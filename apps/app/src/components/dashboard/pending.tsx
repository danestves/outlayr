import { useTimeout } from "@outlayr/shared/timeout";
import { useLocation } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";

const SKELETON_HOLD_MS = 150;

const HomePending = lazy(async () => {
    const pending = await import("./home/home-pending");
    return { default: pending.HomePending };
});
const AccountsPending = lazy(async () => {
    const pending = await import("./accounts/accounts-pending");
    return { default: pending.AccountsPending };
});
const SettingsPending = lazy(async () => {
    const pending = await import("./settings/settings-layout");
    return { default: pending.SettingsPending };
});
const InsightsPending = lazy(async () => {
    const pending = await import("./insights/insights-pending");
    return { default: pending.InsightsPending };
});
const RecurringPending = lazy(async () => {
    const pending = await import("./recurring/recurring-pending");
    return { default: pending.RecurringPending };
});
const RulesPending = lazy(async () => {
    const pending = await import("./rules/rules-pending");
    return { default: pending.RulesPending };
});
const GoalsPending = lazy(async () => {
    const pending = await import("./goals/goals-pending");
    return { default: pending.GoalsPending };
});
const BudgetsPending = lazy(async () => {
    const pending = await import("./budgets/budgets-pending");
    return { default: pending.BudgetsPending };
});
const DebtsPending = lazy(async () => {
    const pending = await import("./debts/debts-pending");
    return { default: pending.DebtsPending };
});
const InstallmentsPending = lazy(async () => {
    const pending = await import("./installments/installments-pending");
    return { default: pending.InstallmentsPending };
});
const ImportPending = lazy(async () => {
    const pending = await import("./import/import-pending");
    return { default: pending.ImportPending };
});
const TransactionsPending = lazy(async () => {
    const pending = await import("./transactions/transactions-pending");
    return { default: pending.TransactionsPending };
});

// A restored ledger lands inside the hold, so a reload never loads, renders or measures the skeleton.
function useHeld() {
    const [held, setHeld] = useState(true);
    useTimeout(() => setHeld(false), SKELETON_HOLD_MS, undefined);
    return held;
}

function pendingFor(page: string | undefined) {
    if (page === "insights") {
        return <InsightsPending />;
    }
    if (page === "accounts") {
        return <AccountsPending />;
    }
    if (page === "transactions") {
        return <TransactionsPending />;
    }
    if (page === "recurring") {
        return <RecurringPending />;
    }
    if (page === "rules") {
        return <RulesPending />;
    }
    if (page === "import") {
        return <ImportPending />;
    }
    if (page === "goals") {
        return <GoalsPending />;
    }
    if (page === "budgets") {
        return <BudgetsPending />;
    }
    if (page === "debts") {
        return <DebtsPending />;
    }
    if (page === "installments") {
        return <InstallmentsPending />;
    }
    return page === "settings" ? <SettingsPending /> : <HomePending />;
}

export function DashboardPending() {
    const page = useLocation({ select: (location) => location.pathname.split("/")[1] });
    const held = useHeld();
    if (held) {
        return null;
    }
    return <Suspense fallback={null}>{pendingFor(page)}</Suspense>;
}
