import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { ProfileId } from "./sync";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({
            name: "build",
            args: () => ({ profileId: Schema.optional(ProfileId) }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "refresh",
            args: () => ({ days: Schema.Array(Schema.Number), userId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "rebuild",
            args: () => ({
                step: Schema.NullOr(Schema.Struct({ month: Schema.Number, run: Schema.Number })),
                userId: Schema.String,
            }),
            returns: () => Schema.Null,
        })
    );
