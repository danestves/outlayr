import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { mirroredEntitlement, mirrorSubscriber, sessionUserId, syncFromStore } from "./revenuecat";
import spec from "./revenuecat.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "mirrorSubscriber", mirrorSubscriber)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "mirroredEntitlement", mirroredEntitlement)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "sessionUserId", sessionUserId)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "syncFromStore", syncFromStore)),
    GroupImpl.finalize
);
