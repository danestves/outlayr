import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "../_generated/id";

export default Table.make(() =>
    Schema.Struct({
        attempt: Schema.Number,
        body: Schema.String,
        endpointId: Id("webhookEndpoints"),
        eventId: Schema.String,
        type: Schema.String,
        userId: Schema.String,
    })
)
    .index("by_endpointId", ["endpointId"])
    .index("by_userId", ["userId"]);
