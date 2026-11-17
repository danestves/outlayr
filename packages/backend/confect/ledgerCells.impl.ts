import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import spec from "./ledgerCells.spec";
import { rebuildCells, refreshDays } from "./lib/ledgerCells";

const refresh = FunctionImpl.make(
    databaseSchema,
    spec,
    "refresh",
    Effect.fn("LedgerCells.refresh")(function* refresh({ days, userId }) {
        yield* refreshDays(userId, days);
        return null;
    }, Effect.orDie)
);

const rebuild = FunctionImpl.make(
    databaseSchema,
    spec,
    "rebuild",
    Effect.fn("LedgerCells.rebuild")(function* rebuild({ step, userId }) {
        yield* rebuildCells(userId, step);
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(refresh),
    Layer.provide(rebuild),
    GroupImpl.finalize
);
