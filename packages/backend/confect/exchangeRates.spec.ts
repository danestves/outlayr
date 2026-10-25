import { FunctionSpec, GroupSpec } from "@confect/core";

import type { pruneStale, pruneStaleBatch, pullRates, pullRecentRates, upsertRates } from "./exchangeRates";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexInternalMutation<typeof upsertRates>()("upsertRates"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof pruneStaleBatch>()("pruneStaleBatch"))
    .addFunction(FunctionSpec.convexInternalAction<typeof pruneStale>()("pruneStale"))
    .addFunction(FunctionSpec.convexPublicQuery<typeof pullRates>()("pullRates"))
    .addFunction(FunctionSpec.convexPublicQuery<typeof pullRecentRates>()("pullRecentRates"));
