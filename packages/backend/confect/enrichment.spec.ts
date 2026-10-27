import { FunctionSpec, GroupSpec } from "@confect/core";

import type { groundedConsent, suggest } from "./enrichment";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexInternalQuery<typeof groundedConsent>()("groundedConsent"))
    .addFunction(FunctionSpec.convexPublicAction<typeof suggest>()("suggest"));
