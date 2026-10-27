import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Config from "effect/Config";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { MutationRunner } from "./_generated/services";
import { decodeCotizaveResponse, extractRates, requestRates } from "./cotizave";
import spec from "./cotizave.spec";
import { utcDateString } from "./lib/currencies";

const fetchMarkets = Effect.fn("Cotizave.fetchMarkets")(
    function* fetchMarkets(apiKey: string) {
        const response = yield* Effect.tryPromise(() => requestRates(apiKey));
        if (!response.ok) {
            yield* Console.error(`Cotizave fetch failed with HTTP ${response.status}`);
            return Option.none();
        }
        return Option.some<unknown>(yield* Effect.tryPromise(() => response.json()));
    },
    Effect.catchTags({
        UnknownError: ({ cause }) =>
            Console.error("Cotizave fetch request failed", cause).pipe(Effect.as(Option.none())),
    })
);

const fetchRates = FunctionImpl.make(
    databaseSchema,
    spec,
    "fetchRates",
    Effect.fn("Cotizave.fetchRates")(function* fetchRates() {
        const apiKey = yield* Config.option(Config.String("COTIZAVE_API_KEY"));
        if (Option.isNone(apiKey)) {
            return yield* Effect.die(new Error("COTIZAVE_API_KEY is not set; cannot fetch cotizave VES rates"));
        }

        const payload = yield* fetchMarkets(apiKey.value);
        if (Option.isNone(payload)) {
            return null;
        }

        const contract = decodeCotizaveResponse(payload.value);
        if (Option.isNone(contract)) {
            yield* Console.error("Cotizave response did not match the expected USD-based VES contract");
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
