import { FunctionSpec, GroupSpec } from "@confect/core";

import type { lookup, lookupMany, purge, record } from "./merchantKnowledge";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexInternalQuery<typeof lookup>()("lookup"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof lookupMany>()("lookupMany"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof record>()("record"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof purge>()("purge"));
