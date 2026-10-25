import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { admit, endThread, expireThread, listTurns, speak, startThread } from "./voiceEntry";
import spec from "./voiceEntry.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "startThread", startThread)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "expireThread", expireThread)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "listTurns", listTurns)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "endThread", endThread)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "admit", admit)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "speak", speak)),
    GroupImpl.finalize
);
