import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { groundedConsent, suggest } from "./enrichment";
import spec from "./enrichment.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "groundedConsent", groundedConsent)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "suggest", suggest)),
    GroupImpl.finalize
);
