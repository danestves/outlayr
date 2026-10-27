import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

// `r2.listMetadata` takes no prefix, so an account's total cannot come from the bucket. One row per object,
// not a counter, because re-uploading a name replaces the object.
export default Table.make(() =>
    Schema.Struct({
        bytes: Schema.Number,
        key: Schema.String,
        userId: Schema.String,
    })
)
    .index("by_user", ["userId"])
    .index("by_user_and_bytes", ["userId", "bytes"])
    .index("by_key", ["key"]);
