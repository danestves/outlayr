import { Table } from "@confect/core";
import { LANGUAGES } from "@outlayr/email/language";
import * as Schema from "effect/Schema";

export default Table.make(() =>
    Schema.Struct({
        language: Schema.Literals(LANGUAGES),
        notices: Schema.Array(Schema.String),
        proSentAt: Schema.NullOr(Schema.Number),
        userId: Schema.String,
        welcomedAt: Schema.NullOr(Schema.Number),
    })
).index("by_userId", ["userId"]);
