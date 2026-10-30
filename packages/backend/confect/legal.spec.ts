import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { PolicyNotice } from "./legal";

export default GroupSpec.make().addFunction(
    FunctionSpec.publicQuery({ name: "notices", args: () => ({}), returns: () => Schema.Array(PolicyNotice) })
);
