import { FunctionImpl, GroupImpl } from "@confect/server";
import { utcDateString } from "@outlayr/money/dates";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { MutationRunner } from "./_generated/services";
import { bestMerchantBid, requestSellAds } from "./binance";
import type { BinanceError } from "./binance";
import spec from "./binance.spec";
import { outboundHttp } from "./lib/http";

const logFetchFailure = (error: BinanceError) =>
    error.reason === "transport" ? Console.error(error.message, error.cause) : Console.error(error.message);

const fetchRates = FunctionImpl.make(
    databaseSchema,
    spec,
    "fetchRates",
    Effect.fn("Binance.fetchRates")(function* fetchRates() {
        const ads = yield* requestSellAds().pipe(
            Effect.provide(outboundHttp),
            Effect.map(Option.some),
            Effect.catchTags({ BinanceError: (error) => logFetchFailure(error).pipe(Effect.as(Option.none())) })
        );
        if (Option.isNone(ads)) {
            return null;
        }

        const rate = bestMerchantBid(ads.value);
        if (rate === undefined) {
            yield* Console.error("Binance P2P response contained no merchant ads");
            return null;
        }

        const { runMutation } = yield* MutationRunner;
        const fetchedAt = yield* Clock.currentTimeMillis;
        yield* runMutation(refs.internal.exchangeRates.upsertRates, {
            date: utcDateString(fetchedAt),
            fetchedAt,
            rates: [{ quote: "VES", rate, rateType: "binance" }],
            source: "binance",
        });
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(fetchRates), GroupImpl.finalize);
