import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export default Table.make(() =>
    Schema.Struct({
        cells: Schema.optional(Schema.Struct({ building: Schema.Boolean, run: Schema.Number, version: Schema.Number })),
        nextSeq: Schema.Number,
        userId: Schema.String,
    })
).index("by_user", ["userId"]);
