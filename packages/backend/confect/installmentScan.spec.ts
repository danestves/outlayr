import { FunctionSpec, GroupSpec } from "@confect/core";

import type { scan } from "./installmentScan";

export default GroupSpec.make().addFunction(FunctionSpec.convexPublicAction<typeof scan>()("scan"));
