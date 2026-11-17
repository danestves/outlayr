import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

const LedgerCell = Schema.Struct({
    amount: Schema.Number,
    amountUsd: Schema.Number,
    count: Schema.Number,
    currencyCode: Schema.NullOr(Schema.String),
    dateKey: Schema.String,
    income: Schema.Boolean,
    leg: Schema.Literals(["flow", "inbound", "outbound", "outsideMove", "outsidePayment"]),
    rateNeededAmount: Schema.optional(Schema.Number),
    rateNeededCount: Schema.optional(Schema.Number),
    ref: Schema.String,
    unconvertedAmount: Schema.Number,
    unconvertedCount: Schema.Number,
});

export default Table.make(() =>
    Schema.Struct({
        cells: Schema.Array(LedgerCell),
        month: Schema.String,
        userId: Schema.String,
    })
).index("by_user_and_month", ["userId", "month"]);
