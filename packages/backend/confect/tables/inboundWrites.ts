import { Table } from "@confect/core";
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
    text: Schema.optional(Schema.String),
});

export default Table.make(() =>
    Schema.Struct({
        receivedAt: Schema.Number,
        userId: Schema.String,
        write: InboundWrite,
    })
).index("by_userId", ["userId"]);
