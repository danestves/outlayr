import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { currentSeq, pullSince, push } from "./sync";
import spec from "./sync.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "push", push)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "pullSince", pullSince)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "currentSeq", currentSeq)),
    GroupImpl.finalize
);
