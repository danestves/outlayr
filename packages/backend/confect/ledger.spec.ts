import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import {
    AccountBalance,
    AccountBalances,
    BudgetStatus,
    RecentTransaction,
    RecentTransactionsInput,
    SpendingSummary,
    SpendingSummaryInput,
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
    timeZone: Schema.NullOr(Schema.String),
});

const LedgerAccounts = Schema.Struct({
    ...AccountBalances.fields,
    accounts: Schema.mutable(Schema.Array(Schema.Struct({ ...AccountBalance.fields, ...Look }))),
});

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicQuery({
            name: "recentTransactions",
            args: () => RecentTransactionsInput,
            returns: () => LedgerEntries,
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "spendingSummary",
            args: () => SpendingSummaryInput,
            returns: () => LedgerSummary,
        })
    )
    .addFunction(FunctionSpec.publicQuery({ name: "accountBalances", args: () => ({}), returns: () => LedgerAccounts }))
    .addFunction(FunctionSpec.publicQuery({ name: "budgetStatus", args: () => ({}), returns: () => BudgetStatus }))
    .addFunction(
        FunctionSpec.publicQuery({ name: "upcomingCharges", args: () => ({}), returns: () => UpcomingCharges })
    );
