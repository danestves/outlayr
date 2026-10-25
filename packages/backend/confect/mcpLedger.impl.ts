import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { accountBalances, budgetStatus, recentTransactions, spendingSummary, upcomingCharges } from "./mcpLedger";
import spec from "./mcpLedger.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "recentTransactions", recentTransactions)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "spendingSummary", spendingSummary)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "accountBalances", accountBalances)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "budgetStatus", budgetStatus)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "upcomingCharges", upcomingCharges)),
    GroupImpl.finalize
);
