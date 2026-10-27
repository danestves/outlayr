import { FunctionSpec, GroupSpec } from "@confect/core";
import { MarketRateType } from "@outlayr/money/rates";
import * as Schema from "effect/Schema";

import exchangeRates from "./_generated/tables/exchangeRates";
import { RateSource } from "./lib/currencies";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalMutation({
            name: "upsertRates",
            args: () => ({
                date: Schema.String,
                fetchedAt: Schema.Number,
                rates: Schema.Array(
                    Schema.Struct({ quote: Schema.String, rate: Schema.Number, rateType: MarketRateType })
                ),
                source: RateSource,
            }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "pruneStaleBatch",
            args: () => ({ cursor: Schema.NullOr(Schema.String), windowStart: Schema.String }),
            returns: () => Schema.Struct({ cursor: Schema.String, deleted: Schema.Number, isDone: Schema.Boolean }),
        })
    )
    .addFunction(
        FunctionSpec.internalAction({
            name: "pruneStale",
            args: () => ({
                cursor: Schema.optional(Schema.NullOr(Schema.String)),
                retries: Schema.optional(Schema.Number),
                windowStart: Schema.optional(Schema.String),
            }),
            returns: () => Schema.Struct({ deleted: Schema.Number, isDone: Schema.Boolean }),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "pullRates",
            args: () => ({ at: Schema.optional(Schema.Number), cursor: Schema.optional(Schema.Number) }),
            returns: () =>
                Schema.Struct({
                    nextCursor: Schema.NullOr(Schema.Number),
                    rows: Schema.Array(exchangeRates.Fields),
                    windowStart: Schema.String,
                }),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "pullRecentRates",
            args: () => ({ at: Schema.Number }),
            returns: () => Schema.Array(exchangeRates.Fields),
        })
    );
