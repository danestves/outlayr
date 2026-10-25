import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { ack, enqueue, finish, job, results, settled, work } from "./enrichmentQueue";
import spec from "./enrichmentQueue.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "enqueue", enqueue)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "job", job)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "work", work)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "finish", finish)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "settled", settled)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "results", results)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "ack", ack)),
    GroupImpl.finalize
);
