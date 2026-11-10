import { EntryKind } from "@outlayr/money/ledger-view";
import * as Schema from "effect/Schema";

export const McpUser = Schema.Struct({
    clientId: Schema.optional(Schema.String),
    connectionId: Schema.String,
    scopes: Schema.Array(Schema.String),
    userId: Schema.String,
});

export const RecentTransactionsInput = { limit: Schema.optional(Schema.Number) };

export const RecentTransaction = Schema.Struct({
    amount: Schema.Number,
    category: Schema.NullOr(Schema.String),
    currency: Schema.NullOr(Schema.String),
    date: Schema.String,
    kind: EntryKind,
    note: Schema.String,
});

export const RecentTransactions = Schema.mutable(Schema.Array(RecentTransaction));

export const SpendingSummaryInput = { monthsAgo: Schema.optional(Schema.Number) };

export const SpendingSummary = Schema.Struct({
    currency: Schema.String,
    from: Schema.String,
    income: Schema.Number,
    spent: Schema.Number,
    spentByCategory: Schema.mutable(Schema.Array(Schema.Struct({ amount: Schema.Number, category: Schema.String }))),
    to: Schema.String,
});

export const AccountBalance = Schema.Struct({
    balance: Schema.Number,
    balanceInMainCurrency: Schema.Number,
    currency: Schema.String,
    exact: Schema.Boolean,
    kind: Schema.String,
    name: Schema.String,
});

export const AccountBalances = Schema.Struct({
    accounts: Schema.mutable(Schema.Array(AccountBalance)),
    currency: Schema.String,
    net: Schema.Number,
    owed: Schema.Number,
    owned: Schema.Number,
});

const BudgetStanding = {
    carryOver: Schema.Number,
    effectiveLimit: Schema.Number,
    from: Schema.String,
    limit: Schema.Number,
    overBudget: Schema.Boolean,
    period: Schema.NullOr(Schema.String),
    remaining: Schema.Number,
    rollover: Schema.Boolean,
    spent: Schema.Number,
    to: Schema.String,
};

export const BudgetStatus = Schema.Struct({
    categories: Schema.mutable(
        Schema.Array(
            Schema.Struct({
                ...BudgetStanding,
                category: Schema.NullOr(Schema.String),
                name: Schema.NullOr(Schema.String),
                subcategories: Schema.mutable(Schema.Array(Schema.String)),
            })
        )
    ),
    currency: Schema.String,
    overall: Schema.NullOr(Schema.Struct({ ...BudgetStanding, name: Schema.NullOr(Schema.String) })),
});

export const UpcomingCharges = Schema.Struct({
    charges: Schema.mutable(
        Schema.Array(
            Schema.Struct({
                amount: Schema.Number,
                category: Schema.NullOr(Schema.String),
                currency: Schema.NullOr(Schema.String),
                endsOn: Schema.NullOr(Schema.String),
                kind: EntryKind,
                nextCharge: Schema.String,
                note: Schema.String,
                repeats: Schema.NullOr(Schema.Struct({ cadence: Schema.NullOr(Schema.String), every: Schema.Number })),
            })
        )
    ),
    currency: Schema.String,
    monthlyCost: Schema.mutable(
        Schema.Array(Schema.Struct({ amount: Schema.Number, currency: Schema.String, schedules: Schema.Number }))
    ),
});

export const SCAN_WINDOW = 500;
