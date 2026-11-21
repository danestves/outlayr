import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalAction({
            name: "retire",
            args: () => ({ guestId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "forget",
            args: () => ({ guestId: Schema.String }),
            returns: () => Schema.Null,
        })
    );
