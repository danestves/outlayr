import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export default Table.make(() =>
    Schema.Struct({
        auth: Schema.String,
        dailyMinute: Schema.Number,
        endpoint: Schema.String,
        lastSentDay: Schema.NullOr(Schema.String),
        locale: Schema.String,
        p256dh: Schema.String,
        timeZone: Schema.String,
        userId: Schema.String,
    })
)
    .index("by_endpoint", ["endpoint"])
    .index("by_userId", ["userId"]);
