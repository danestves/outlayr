import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export const LastDelivery = Schema.Struct({ at: Schema.Number, status: Schema.Number });

export default Table.make(() =>
    Schema.Struct({
        createdAt: Schema.Number,
        disabledAt: Schema.optional(Schema.Number),
        failures: Schema.Number,
        lastDelivery: Schema.optional(LastDelivery),
        secret: Schema.String,
        testedAt: Schema.optional(Schema.Number),
        url: Schema.String,
        userId: Schema.String,
    })
).index("by_userId", ["userId"]);
