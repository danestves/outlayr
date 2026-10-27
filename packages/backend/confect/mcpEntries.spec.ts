import { FunctionSpec, GroupSpec } from "@confect/core";

import type { logEntry } from "./mcpEntries";

export default GroupSpec.make().addFunction(FunctionSpec.convexInternalMutation<typeof logEntry>()("logEntry"));
