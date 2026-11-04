import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export default Table.make(() =>
    Schema.Struct({
        code: Schema.String,
        userId: Schema.String,
    })
)
    .index("by_code", ["code"])
    .index("by_userId", ["userId"]);
