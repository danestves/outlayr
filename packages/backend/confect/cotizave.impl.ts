import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { MutationRunner } from "./_generated/services";
import { extractRates, requestRates } from "./cotizave";
import type { CotizaveError } from "./cotizave";
import spec from "./cotizave.spec";
import { cotizaveApiKey } from "./lib/config";
import { utcDateString } from "./lib/currencies";
import { outboundHttp } from "./lib/http";

const logFetchFailure = (error: CotizaveError) =>
    error.reason === "transport" ? Console.error(error.message, error.cause) : Console.error(error.message);

const fetchRates = FunctionImpl.make(
    databaseSchema,
    spec,
    "fetchRates",
    Effect.fn("Cotizave.fetchRates")(function* fetchRates() {
        const apiKey = yield* cotizaveApiKey;
        if (Option.isNone(apiKey)) {
            return yield* Effect.die(new Error("COTIZAVE_API_KEY is not set; cannot fetch cotizave VES rates"));
        }

        const contract = yield* requestRates(apiKey.value).pipe(
            Effect.provide(outboundHttp),
            Effect.map(Option.some),
            Effect.catchTags({ CotizaveError: (error) => logFetchFailure(error).pipe(Effect.as(Option.none())) })
        );
        if (Option.isNone(contract)) {
            return null;
        }

        const rates = extractRates(contract.value);
        if (rates.length === 0) {
            yield* Console.error("Cotizave response contained no valid target markets");
            return null;
        }

        const { runMutation } = yield* MutationRunner;
        const fetchedAt = yield* Clock.currentTimeMillis;
        yield* runMutation(refs.internal.exchangeRates.upsertRates, {
            date: utcDateString(fetchedAt),
            fetchedAt,
            rates,
            source: "cotizave",
        });
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(fetchRates), GroupImpl.finalize);
