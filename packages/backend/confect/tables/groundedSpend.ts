import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

// No key, user or merchant name: only what was spent, so the table can never become a per-merchant spend trail.
export default Table.make(() =>
    Schema.Struct({
        actualMicros: Schema.Number,
        at: Schema.Number,
        chargedMicros: Schema.Number,
        inputTokens: Schema.Number,
        outputTokens: Schema.Number,
        published: Schema.Boolean,
        searchCalls: Schema.Number,
    })
).index("by_at", ["at"]);
