import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export default Table.make(() =>
    Schema.Struct({
        body: Schema.String,
        eventId: Schema.String,
        type: Schema.String,
        userId: Schema.String,
    })
).index("by_userId", ["userId"]);
