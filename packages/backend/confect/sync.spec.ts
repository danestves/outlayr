import { FunctionSpec, GroupSpec } from "@confect/core";

import type { currentSeq, pullSince, push } from "./sync";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexPublicMutation<typeof push>()("push"))
    .addFunction(FunctionSpec.convexPublicQuery<typeof pullSince>()("pullSince"))
    .addFunction(FunctionSpec.convexPublicQuery<typeof currentSeq>()("currentSeq"));
