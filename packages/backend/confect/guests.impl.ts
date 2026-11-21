import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { MutationCtx, MutationRunner, Scheduler } from "./_generated/services";
import { forgetUsage } from "./accountDeletion";
import spec from "./guests.spec";
import { purgeUserBatch } from "./lib/account";
import { convexSiteUrl } from "./lib/config";
import { outboundHttp } from "./lib/http";
import { erasePostHogPerson } from "./lib/posthog";
import { eraseUpstreamCustomer, revenuecat } from "./revenuecat";

const RETIRE_ATTEMPTS = 6;

// An unconfigured deployment has nothing upstream to erase, so only a real failure is retried.
const settled = (label: string) => (error: { readonly reason: string }) =>
    error.reason === "unconfigured"
        ? Effect.succeed(true)
        : Console.warn(`[guests] ${label} not erased`, error).pipe(Effect.as(false));

// Runs while the guest signs in to a real account, before the device logs RevenueCat in to it. RevenueCat queues
// the delete, so it repeats until a 404 confirms it, and each pass sweeps the mirror again: the TRANSFER webhook from
// the device's sync can recreate the guest there.
const retire = FunctionImpl.make(
    databaseSchema,
    spec,
    "retire",
    Effect.fn("Guests.retire")(function* retire({ attempt = 0, guestId }) {
        const [customer, analytics] = yield* Effect.all(
            [
                eraseUpstreamCustomer(guestId).pipe(Effect.catchTags({ RevenueCatError: settled("customer") })),
                erasePostHogPerson(guestId).pipe(
                    Effect.as(true),
                    Effect.catchTags({ PostHogError: settled("analytics") })
                ),
            ],
            { concurrency: "unbounded" }
        ).pipe(Effect.provide(outboundHttp));
        const { runMutation } = yield* MutationRunner;
        yield* runMutation(refs.internal.guests.forget, { guestId });
        if ((!customer || !analytics) && attempt + 1 < RETIRE_ATTEMPTS) {
            const scheduler = yield* Scheduler;
            yield* scheduler.runAfter(Duration.minutes(2 ** attempt), refs.internal.guests.retire, {
                attempt: attempt + 1,
                guestId,
            });
        }
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
            return null;
        }
        // Convex keys a caller as `${issuer}|${subject}`, and Better Auth's Convex token uses the site URL and user id.
        const issuer = Option.getOrUndefined(yield* convexSiteUrl);
        yield* forgetUsage(guestId, issuer === undefined ? undefined : `${issuer}|${guestId}`);
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(retire),
    Layer.provide(forget),
    GroupImpl.finalize
);
