import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { pruneStale, pruneStaleBatch, pullRates, pullRecentRates, upsertRates } from "./exchangeRates";
import spec from "./exchangeRates.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "upsertRates", upsertRates)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "pruneStaleBatch", pruneStaleBatch)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "pruneStale", pruneStale)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "pullRates", pullRates)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "pullRecentRates", pullRecentRates)),
    GroupImpl.finalize
);
