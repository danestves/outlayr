import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export default Table.make(() =>
    Schema.Struct({
        createdAt: Schema.Number,
        hint: Schema.String,
        lastUsedAt: Schema.optional(Schema.Number),
        tokenHash: Schema.String,
        userId: Schema.String,
    })
)
    .index("by_tokenHash", ["tokenHash"])
    .index("by_userId", ["userId"]);
