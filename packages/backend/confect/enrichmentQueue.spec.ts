import { FunctionSpec, GroupSpec } from "@confect/core";

import type { ack, enqueue, finish, job, results, settled, work } from "./enrichmentQueue";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexPublicMutation<typeof enqueue>()("enqueue"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof job>()("job"))
    .addFunction(FunctionSpec.convexInternalAction<typeof work>()("work"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof finish>()("finish"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof settled>()("settled"))
    .addFunction(FunctionSpec.convexPublicQuery<typeof results>()("results"))
    .addFunction(FunctionSpec.convexPublicMutation<typeof ack>()("ack"));
