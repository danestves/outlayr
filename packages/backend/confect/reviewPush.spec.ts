import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "./_generated/id";
import { ApnsEnvironment } from "./tables/captureKeys";

export const TargetRow = Schema.Struct({
    _id: Id("reviewPushTargets"),
    environment: ApnsEnvironment,
    token: Schema.String,
});

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ deviceId: Schema.String, environment: ApnsEnvironment, token: Schema.String }),
            name: "setTarget",
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ deviceId: Schema.String }),
            name: "clearTarget",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => ({ ids: Schema.Array(Id("reviewPushTargets")) }),
            name: "targets",
            returns: () => Schema.Array(TargetRow),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ id: Id("reviewPushTargets"), token: Schema.String }),
            name: "dropTarget",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalAction({
            args: () => ({
                count: Schema.Number,
                ids: Schema.Array(Id("reviewPushTargets")),
                language: Schema.optional(Schema.String),
            }),
            name: "deliver",
            returns: () => Schema.Null,
        })
    );
