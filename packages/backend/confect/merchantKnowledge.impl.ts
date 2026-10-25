import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { lookup, lookupMany, purge, record } from "./merchantKnowledge";
import spec from "./merchantKnowledge.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "lookup", lookup)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "lookupMany", lookupMany)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "record", record)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "purge", purge)),
    GroupImpl.finalize
);
