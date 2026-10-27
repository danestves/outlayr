import { FunctionSpec, GroupSpec } from "@confect/core";

import type { fetchRates } from "./openexchangerates";

export default GroupSpec.make().addFunction(FunctionSpec.convexInternalAction<typeof fetchRates>()("fetchRates"));
