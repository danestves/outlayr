import { FunctionSpec, GroupSpec } from "@confect/core";

import type { mine } from "./limits";

export default GroupSpec.make().addFunction(FunctionSpec.convexPublicQuery<typeof mine>()("mine"));
