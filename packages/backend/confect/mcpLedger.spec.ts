import { FunctionSpec, GroupSpec } from "@confect/core";

import type { accountBalances, budgetStatus, recentTransactions, spendingSummary, upcomingCharges } from "./mcpLedger";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexInternalQuery<typeof recentTransactions>()("recentTransactions"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof spendingSummary>()("spendingSummary"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof accountBalances>()("accountBalances"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof budgetStatus>()("budgetStatus"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof upcomingCharges>()("upcomingCharges"));
