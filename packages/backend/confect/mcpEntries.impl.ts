import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { logEntry } from "./mcpEntries";
import spec from "./mcpEntries.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "logEntry", logEntry)),
    GroupImpl.finalize
);
