import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import {
    AccountBalance,
    AccountBalances,
    BudgetStatus,
    RecentTransaction,
    SpendingSummary,
    UpcomingCharges,
} from "./mcpLedger";

// The MCP schemas leave these fields out, so encoding drops them there: an agent has no use for a photo key.
const Look = { emoji: Schema.NullOr(Schema.String), imageKey: Schema.NullOr(Schema.String) };

const LedgerEntries = Schema.mutable(
    Schema.Array(
        Schema.Struct({
            ...RecentTransaction.fields,
            ...Look,
            account: Schema.NullOr(Schema.String),
            time: Schema.String,
        })
    )
);

const LedgerSummary = Schema.Struct({
    ...SpendingSummary.fields,
    spentByDay: Schema.mutable(Schema.Array(Schema.Struct({ amount: Schema.Number, date: Schema.String }))),
    today: Schema.String,
});

const LedgerAccounts = Schema.Struct({
    ...AccountBalances.fields,
    accounts: Schema.mutable(Schema.Array(Schema.Struct({ ...AccountBalance.fields, ...Look }))),
});

const Overview = Schema.Struct({
    balances: LedgerAccounts,
    budgets: BudgetStatus,
    entries: LedgerEntries,
    // The first instant at which the passing of time alone changes this answer.
    nextChangeAt: Schema.Number,
    summary: LedgerSummary,
    upcoming: UpcomingCharges,
});

export default GroupSpec.make().addFunction(
    FunctionSpec.publicQuery({
        name: "overview",
        // Convex re-runs a query when its data changes, not when time passes, so the web moves asOf to nextChangeAt
        // to start a fresh run. The handler still reads the server clock; asOf only keys the subscription.
        args: () => ({ asOf: Schema.optional(Schema.Number), limit: Schema.optional(Schema.Number) }),
        returns: () => Overview,
    })
);
