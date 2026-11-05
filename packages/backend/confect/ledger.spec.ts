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
    nextChangeAt: Schema.Number,
    summary: LedgerSummary,
    upcoming: UpcomingCharges,
});

export default GroupSpec.make().addFunction(
    FunctionSpec.publicQuery({
        name: "overview",
        args: () => ({ asOf: Schema.optional(Schema.Number), limit: Schema.optional(Schema.Number) }),
        returns: () => Overview,
    })
);
