import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { ActionCtx } from "./_generated/services";
import { runGroundedLookup } from "./groundedLookup";
import spec from "./groundedLookup.spec";

const run = FunctionImpl.make(
    databaseSchema,
    spec,
    "run",
    Effect.fn("GroundedLookup.run")(function* run(args) {
        const ctx = yield* ActionCtx;
        yield* runGroundedLookup(ctx, args);
        return null;
    })
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(run), GroupImpl.finalize);
