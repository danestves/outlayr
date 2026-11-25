import { Table } from "@confect/core";
import { BankTransactionStatus } from "@outlayr/banking/provider";
import * as Schema from "effect/Schema";

export const InboundWrite = Schema.Struct({
    amount: Schema.Finite,
    card: Schema.optional(Schema.String),
    category: Schema.optional(Schema.String),
    currency: Schema.optional(Schema.String),
    date: Schema.Number,
    dedupeKey: Schema.optional(Schema.String),
    income: Schema.Boolean,
    note: Schema.String,
    // Set only on bank writes: a later write with the same key replaces the entry, and `void` removes it.
    status: Schema.optional(BankTransactionStatus),
    text: Schema.optional(Schema.String),
});

export default Table.make(() =>
    Schema.Struct({
        receivedAt: Schema.Number,
        userId: Schema.String,
        write: InboundWrite,
    })
).index("by_userId", ["userId"]);
