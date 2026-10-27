import { FunctionSpec, GroupSpec } from "@confect/core";

import type { mirroredEntitlement, mirrorSubscriber, sessionUserId, syncFromStore } from "./revenuecat";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexInternalMutation<typeof mirrorSubscriber>()("mirrorSubscriber"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof mirroredEntitlement>()("mirroredEntitlement"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof sessionUserId>()("sessionUserId"))
    .addFunction(FunctionSpec.convexPublicAction<typeof syncFromStore>()("syncFromStore"));
