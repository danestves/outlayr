import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { MutationCtx, MutationRunner, Scheduler } from "./_generated/services";
import spec from "./guests.spec";
import { purgeUserBatch } from "./lib/account";
import { outboundHttp } from "./lib/http";
import { erasePostHogPerson } from "./lib/posthog";
import { eraseUpstreamCustomer, revenuecat } from "./revenuecat";

// Runs while the guest signs in to a real account, before the device logs RevenueCat in to it: with the guest
// customer gone, the store receipt follows the account whatever the project's transfer setting says.
const retire = FunctionImpl.make(
    databaseSchema,
    spec,
    "retire",
    Effect.fn("Guests.retire")(function* retire({ guestId }) {
        yield* eraseUpstreamCustomer(guestId).pipe(
            Effect.provide(outboundHttp),
            Effect.catchTags({ RevenueCatError: (error) => Console.warn("[guests] customer not erased", error) })
        );
        yield* erasePostHogPerson(guestId).pipe(
            Effect.provide(outboundHttp),
            Effect.catchTags({ PostHogError: (error) => Console.warn("[guests] analytics not erased", error) })
        );
        const { runMutation } = yield* MutationRunner;
        yield* runMutation(refs.internal.guests.forget, { guestId });
        return null;
    }, Effect.orDie)
);

const forget = FunctionImpl.make(
    databaseSchema,
    spec,
    "forget",
    Effect.fn("Guests.forget")(function* forget({ guestId }) {
        const ctx = yield* MutationCtx;
        yield* Effect.promise(() => revenuecat.deleteCustomer(ctx, { appUserId: guestId }));
        const { done } = yield* purgeUserBatch(ctx, guestId);
        if (!done) {
            const scheduler = yield* Scheduler;
            yield* scheduler.runAfter(Duration.zero, refs.internal.guests.forget, { guestId });
        }
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(retire),
    Layer.provide(forget),
    GroupImpl.finalize
);
