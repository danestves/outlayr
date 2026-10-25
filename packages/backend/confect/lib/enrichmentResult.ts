import { compileSchema } from "@confect/core/SchemaToValidator";
import * as Schema from "effect/Schema";

export const EnrichmentResult = Schema.Struct({
    categoryName: Schema.NullOr(Schema.String),
    domain: Schema.NullOr(Schema.String),
    emoji: Schema.NullOr(Schema.String),
    isNewCategory: Schema.Boolean,
    merchantName: Schema.NullOr(Schema.String),
    parentCategoryName: Schema.NullOr(Schema.String),
    tags: Schema.Array(Schema.String),
});

export const enrichmentResult = compileSchema(EnrichmentResult);
