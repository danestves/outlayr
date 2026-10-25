import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import groundedSpend from "./_generated/tables/groundedSpend";

// Read only through `npx convex run`: no public query, no client UI.

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalMutation({
            name: "record",
            args: () => groundedSpend.Fields.fields,
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "monthlyTotal",
            args: () => ({ at: Schema.optional(Schema.Number) }),
            returns: () => Schema.Struct({ ceilingMicros: Schema.Number, totalMicros: Schema.Number }),
        })
    );
