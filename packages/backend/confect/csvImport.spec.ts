import { FunctionSpec, GroupSpec } from "@confect/core";

import type { csvImport } from "./csvImport";

export default GroupSpec.make().addFunction(FunctionSpec.convexPublicAction<typeof csvImport>()("csvImport"));
