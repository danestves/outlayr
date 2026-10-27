import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { fetchRates } from "./openexchangerates";
import spec from "./openexchangerates.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "fetchRates", fetchRates)),
    GroupImpl.finalize
);
