import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { EnrichmentResult } from "../lib/enrichmentResult";

export default Table.make(() =>
    Schema.Struct({
        categoryTree: Schema.Array(Schema.Struct({ children: Schema.Array(Schema.String), name: Schema.String })),
        currency: Schema.optional(Schema.String),
        grounded: Schema.Boolean,
        income: Schema.Boolean,
        localId: Schema.String,
        locale: Schema.optional(Schema.String),
        name: Schema.String,
        regionCode: Schema.optional(Schema.String),
        result: Schema.optional(EnrichmentResult),
        shareAnalytics: Schema.optional(Schema.Boolean),
        status: Schema.Literals(["queued", "done", "failed"]),
        userId: Schema.String,
    })
)
    .index("by_user_and_localId", ["userId", "localId"])
    .index("by_user_and_status", ["userId", "status"]);
