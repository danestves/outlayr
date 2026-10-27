import { FunctionSpec, GroupSpec } from "@confect/core";

import {
    AccountBalances,
    BudgetStatus,
    McpUser,
    RecentTransactions,
    RecentTransactionsInput,
    SpendingSummary,
    SpendingSummaryInput,
    UpcomingCharges,
} from "./mcpLedger";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalQuery({
            name: "recentTransactions",
            args: () => ({ ...RecentTransactionsInput, user: McpUser }),
            returns: () => RecentTransactions,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "spendingSummary",
            args: () => ({ ...SpendingSummaryInput, user: McpUser }),
            returns: () => SpendingSummary,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "accountBalances",
            args: () => ({ user: McpUser }),
            returns: () => AccountBalances,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "budgetStatus",
            args: () => ({ user: McpUser }),
            returns: () => BudgetStatus,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "upcomingCharges",
            args: () => ({ user: McpUser }),
            returns: () => UpcomingCharges,
        })
    );
