import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { SharedReport } from "../sharedReports.spec";

export default Table.make(() =>
    Schema.Struct({
        expiresAt: Schema.NullOr(Schema.Number),
        report: SharedReport,
        reportId: Schema.String,
        slug: Schema.String,
        updatedAt: Schema.Number,
        userId: Schema.String,
    })
)
    .index("by_expiresAt", ["expiresAt"])
    .index("by_slug", ["slug"])
    .index("by_userId_and_reportId", ["userId", "reportId"]);
