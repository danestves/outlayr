import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { monthlyTotal, record } from "./groundedSpend";
import spec from "./groundedSpend.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "record", record)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "monthlyTotal", monthlyTotal)),
    GroupImpl.finalize
);
