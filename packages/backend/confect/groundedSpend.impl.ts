import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter } from "./_generated/services";
import { MAX_MONTH_ROWS, monthStartMs } from "./groundedSpend";
import spec from "./groundedSpend.spec";
import { budgetCeilingMicros } from "./lib/spend";

const record = FunctionImpl.make(
    databaseSchema,
    spec,
    "record",
    Effect.fn("GroundedSpend.record")(function* record(args) {
        const writer = yield* DatabaseWriter;
        yield* writer.table("groundedSpend").insert(args);
        return null;
    }, Effect.orDie)
);

const monthlyTotal = FunctionImpl.make(
    databaseSchema,
    spec,
    "monthlyTotal",
    Effect.fn("GroundedSpend.monthlyTotal")(function* monthlyTotal(args) {
        const reader = yield* DatabaseReader;
        const start = monthStartMs(args.at ?? (yield* Clock.currentTimeMillis));
        const rows = yield* reader
            .table("groundedSpend")
            .index("by_at", (q) => q.gte("at", start))
            .take(MAX_MONTH_ROWS);
        const totalMicros = rows.reduce((sum, row) => sum + row.actualMicros, 0);
        return { ceilingMicros: budgetCeilingMicros(), totalMicros };
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(record),
    Layer.provide(monthlyTotal),
    GroupImpl.finalize
);
