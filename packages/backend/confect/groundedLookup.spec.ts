import { FunctionSpec, GroupSpec } from "@confect/core";

import type { run } from "./groundedLookup";

export default GroupSpec.make().addFunction(FunctionSpec.convexInternalAction<typeof run>()("run"));
