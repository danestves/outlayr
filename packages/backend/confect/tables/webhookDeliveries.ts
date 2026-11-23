import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "../_generated/id";

export default Table.make(() =>
    Schema.Struct({
        attempt: Schema.Number,
        dueAt: Schema.Number,
        endpointId: Id("webhookEndpoints"),
        eventRef: Id("webhookEvents"),
        userId: Schema.String,
    })
)
    .index("by_dueAt", ["dueAt"])
    .index("by_eventRef", ["eventRef"])
    .index("by_userId", ["userId"]);
