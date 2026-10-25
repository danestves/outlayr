import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

export default GroupSpec.make().addFunction(
    FunctionSpec.internalAction({
        name: "run",
        args: () => ({
            currency: Schema.optional(Schema.String),
            income: Schema.Boolean,
            key: Schema.String,
            locale: Schema.optional(Schema.String),
            name: Schema.String,
            regionCode: Schema.optional(Schema.String),
        }),
        returns: () => Schema.Null,
    })
);
