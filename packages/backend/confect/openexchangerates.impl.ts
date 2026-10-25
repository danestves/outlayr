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
import { utcDateString } from "./lib/currencies";
import { decodeLatestResponse, MS_PER_SECOND, officialRates, requestLatest } from "./openexchangerates";
import spec from "./openexchangerates.spec";

const fetchLatest = Effect.fn("Openexchangerates.fetchLatest")(
    function* fetchLatest(appId: string) {
        const response = yield* Effect.tryPromise(() => requestLatest(appId));
        if (!response.ok) {
            yield* Console.error(`Open Exchange Rates fetch failed with HTTP ${response.status}`);
            return Option.none();
        }
        return Option.some<unknown>(yield* Effect.tryPromise(() => response.json()));
    },
    Effect.catchTags({
        UnknownError: ({ cause }) =>
            Console.error("Open Exchange Rates fetch request failed", cause).pipe(Effect.as(Option.none())),
    })
);

const fetchRates = FunctionImpl.make(
    databaseSchema,
    spec,
    "fetchRates",
    Effect.fn("Openexchangerates.fetchRates")(function* fetchRates() {
        const appId = yield* Config.option(Config.String("OXR_APP_ID"));
        if (Option.isNone(appId)) {
            return yield* Effect.die(new Error("OXR_APP_ID is not set; cannot fetch Open Exchange Rates"));
        }

        const payload = yield* fetchLatest(appId.value);
        if (Option.isNone(payload)) {
            return null;
        }

        const parsed = decodeLatestResponse(payload.value);
        if (Option.isNone(parsed)) {
            yield* Console.error("Open Exchange Rates response did not match the USD-based latest contract");
            return null;
        }

        const rates = officialRates(parsed.value);
        if (rates.length === 0) {
            yield* Console.error("Open Exchange Rates response contained no valid rates");
            return null;
        }

        const { runMutation } = yield* MutationRunner;
        yield* runMutation(refs.internal.exchangeRates.upsertRates, {
            date: utcDateString(parsed.value.timestamp * MS_PER_SECOND),
            fetchedAt: yield* Clock.currentTimeMillis,
            rates,
            source: "openexchangerates",
        });
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(fetchRates), GroupImpl.finalize);
