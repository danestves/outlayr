import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

// Shared across users, so exact-key reads only: a prefix or range index would be an enumeration surface.
export default Table.make(() =>
    Schema.Struct({
        categoryName: Schema.String,
        domain: Schema.String,
        emoji: Schema.NullOr(Schema.String),
        expiresAt: Schema.optional(Schema.Number),
        key: Schema.String,
        merchantName: Schema.optional(Schema.String),
        modelId: Schema.String,
        parentCategoryName: Schema.NullOr(Schema.String),
        resolvedAt: Schema.Number,
        source: Schema.optional(Schema.Literals(["model", "web"])),
        tags: Schema.Array(Schema.String),
    })
).index("by_key", ["key"]);
