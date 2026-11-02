import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { OpenStatsSnapshot } from "./openStats";

export default GroupSpec.make()
    .addFunction(FunctionSpec.internalAction({ name: "refresh", args: () => ({}), returns: () => Schema.Null }))
    .addFunction(
        FunctionSpec.internalQuery({
            name: "inputs",
            args: () => ({}),
            returns: () =>
                Schema.Struct({ previous: Schema.NullOr(OpenStatsSnapshot), syncedAt: Schema.Array(Schema.Number) }),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "save",
            args: () => ({ snapshot: OpenStatsSnapshot }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({ name: "latest", args: () => ({}), returns: () => Schema.NullOr(OpenStatsSnapshot) })
    );
