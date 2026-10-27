import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalMutation({
            name: "mirrorSubscriber",
            args: () => ({ appUserId: Schema.String, subscriber: Schema.String }),
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "mirroredEntitlement",
            args: () => ({ appUserId: Schema.String }),
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "sessionUserId",
            args: () => ({}),
            returns: () => Schema.NullOr(Schema.String),
        })
    )
    .addFunction(
        FunctionSpec.publicAction({
            name: "syncFromStore",
            args: () => ({}),
            returns: () => Schema.Boolean,
        })
    );
