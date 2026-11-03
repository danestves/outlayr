import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export default Table.make(() =>
    Schema.Struct({
        bankedMonths: Schema.Number,
        promoEndsAt: Schema.NullOr(Schema.Number),
        userId: Schema.String,
    })
).index("by_userId", ["userId"]);
