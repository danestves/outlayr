import { FunctionSpec, GroupSpec } from "@confect/core";

import type { monthlyTotal, record } from "./groundedSpend";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexInternalMutation<typeof record>()("record"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof monthlyTotal>()("monthlyTotal"));
