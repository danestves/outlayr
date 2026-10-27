import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { MutationRunner } from "./_generated/services";
import { openExchangeRatesAppId } from "./lib/config";
import { utcDateString } from "./lib/currencies";
import { outboundHttp } from "./lib/http";
import { MS_PER_SECOND, officialRates, requestLatest } from "./openexchangerates";
import type { OpenExchangeRatesError } from "./openexchangerates";
import spec from "./openexchangerates.spec";

const logFetchFailure = (error: OpenExchangeRatesError) =>
    error.reason === "transport" ? Console.error(error.message, error.cause) : Console.error(error.message);

const fetchRates = FunctionImpl.make(
    databaseSchema,
    spec,
    "fetchRates",
    Effect.fn("Openexchangerates.fetchRates")(function* fetchRates() {
        const appId = yield* openExchangeRatesAppId;
        if (Option.isNone(appId)) {
            return yield* Effect.die(new Error("OXR_APP_ID is not set; cannot fetch Open Exchange Rates"));
        }

        const latest = yield* requestLatest(appId.value).pipe(
            Effect.provide(outboundHttp),
            Effect.map(Option.some),
            Effect.catchTags({
                OpenExchangeRatesError: (error) => logFetchFailure(error).pipe(Effect.as(Option.none())),
            })
        );
        if (Option.isNone(latest)) {
            return null;
        }

        const rates = officialRates(latest.value);
        if (rates.length === 0) {
            yield* Console.error("Open Exchange Rates response contained no valid rates");
            return null;
        }

        const { runMutation } = yield* MutationRunner;
        yield* runMutation(refs.internal.exchangeRates.upsertRates, {
            date: utcDateString(latest.value.timestamp * MS_PER_SECOND),
            fetchedAt: yield* Clock.currentTimeMillis,
            rates,
            source: "openexchangerates",
        });
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(fetchRates), GroupImpl.finalize);
