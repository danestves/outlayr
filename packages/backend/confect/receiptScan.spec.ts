import { FunctionSpec, GroupSpec } from "@confect/core";

import type { admit, scan } from "./receiptScan";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexInternalMutation<typeof admit>()("admit"))
    .addFunction(FunctionSpec.convexPublicAction<typeof scan>()("scan"));
