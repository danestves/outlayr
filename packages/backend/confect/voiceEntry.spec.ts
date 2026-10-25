import { FunctionSpec, GroupSpec } from "@confect/core";

import type { admit, endThread, expireThread, listTurns, speak, startThread } from "./voiceEntry";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexPublicMutation<typeof startThread>()("startThread"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof expireThread>()("expireThread"))
    .addFunction(FunctionSpec.convexPublicQuery<typeof listTurns>()("listTurns"))
    .addFunction(FunctionSpec.convexPublicMutation<typeof endThread>()("endThread"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof admit>()("admit"))
    .addFunction(FunctionSpec.convexPublicAction<typeof speak>()("speak"));
