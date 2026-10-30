import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

export default GroupSpec.make().addFunction(
    FunctionSpec.internalAction({ name: "fetchRates", args: () => ({}), returns: () => Schema.Null })
);
