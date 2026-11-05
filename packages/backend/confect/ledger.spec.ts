import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import {
    AccountBalance,
    AccountBalances,
    BudgetStatus,
    EntryKind,
    SpendingSummary,
    UpcomingCharges,
} from "./mcpLedger";

const Look = Schema.Struct({
    color: Schema.NullOr(Schema.String),
    emoji: Schema.NullOr(Schema.String),
    icon: Schema.NullOr(Schema.String),
    imageKey: Schema.NullOr(Schema.String),
});

const AccountLook = Schema.Struct({ ...Look.fields, name: Schema.String, person: Schema.Boolean });

/** `valued` restates a foreign amount in the ledger currency; null when it is already in it or no rate places it. */
const Money = Schema.Struct({ amount: Schema.Number, currency: Schema.String, valued: Schema.NullOr(Schema.Number) });

const Figure = Schema.Struct({ amount: Schema.Number, currency: Schema.String });

const LogEntry = Schema.Struct({
    ...Money.fields,
    account: Schema.NullOr(Schema.String),
    category: Schema.NullOr(Schema.String),
    fee: Schema.NullOr(Money),
    id: Schema.String,
    isFee: Schema.Boolean,
    kind: EntryKind,
    look: Look,
    note: Schema.String,
    recurring: Schema.Boolean,
    time: Schema.String,
    type: Schema.Literal("entry"),
});

const LogTransfer = Schema.Struct({
    arrived: Schema.Number,
    arrivedCurrency: Schema.String,
    fees: Schema.mutable(Schema.Array(Figure)),
    from: Schema.NullOr(AccountLook),
    id: Schema.String,
    note: Schema.String,
    sent: Schema.Number,
    sentCurrency: Schema.String,
    time: Schema.String,
    to: Schema.NullOr(AccountLook),
    type: Schema.Literal("transfer"),
});

const LogDay = Schema.Struct({
    date: Schema.String,
    rows: Schema.mutable(Schema.Array(Schema.Union([LogEntry, LogTransfer]))),
    /** Signed, one per currency no rate could fold into the ledger's. */
    totals: Schema.mutable(Schema.Array(Figure)),
});

const LedgerSummary = Schema.Struct({
    ...SpendingSummary.fields,
    spentByDay: Schema.mutable(Schema.Array(Schema.Struct({ amount: Schema.Number, date: Schema.String }))),
    today: Schema.String,
});

const LedgerAccounts = Schema.Struct({
    ...AccountBalances.fields,
    accounts: Schema.mutable(Schema.Array(Schema.Struct({ ...AccountBalance.fields, look: AccountLook }))),
});

const LedgerUpcoming = Schema.Struct({
    charges: Schema.mutable(
        Schema.Array(
            Schema.Struct({
                ...Money.fields,
                cadence: Schema.NullOr(Schema.String),
                every: Schema.Number,
                fee: Schema.NullOr(Money),
                id: Schema.String,
                kind: EntryKind,
                look: Look,
                nextCharge: Schema.String,
                note: Schema.String,
            })
        )
    ),
    currency: Schema.String,
    monthlyCost: UpcomingCharges.fields.monthlyCost,
});

const Overview = Schema.Struct({
    balances: LedgerAccounts,
    budgets: BudgetStatus,
    log: Schema.mutable(Schema.Array(LogDay)),
    nextChangeAt: Schema.Number,
    summary: LedgerSummary,
    upcoming: LedgerUpcoming,
});

export default GroupSpec.make().addFunction(
    FunctionSpec.publicQuery({
        name: "overview",
        args: () => ({ asOf: Schema.optional(Schema.Number), limit: Schema.optional(Schema.Number) }),
        returns: () => Overview,
    })
);
