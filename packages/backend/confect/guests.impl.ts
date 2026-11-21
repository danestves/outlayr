import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
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
import { GUEST_BUCKET_REFILL_MS, guestLimiter } from "./lib/guestLimits";
import { outboundHttp } from "./lib/http";
import { BACKEND_DISTINCT_ID, capturePostHogEvent, erasePostHogPerson } from "./lib/posthog";
import { eraseUpstreamCustomer, revenuecat } from "./revenuecat";

const BACKOFF_ATTEMPTS = 20;
const RETIRE_MAX_DELAY_MINUTES = 360;
const STUCK_RETRY_DELAY = Duration.days(1);
const FINAL_SWEEP_DELAY = Duration.hours(3);
const STUCK_CAPTURE_TIMEOUT = Duration.seconds(10);

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
        const scheduler = yield* Scheduler;
        if (customer && analytics) {
            // A TRANSFER webhook sent just before the delete landed can arrive later, through RevenueCat's retries too.
            yield* scheduler.runAfter(FINAL_SWEEP_DELAY, refs.internal.guests.forget, { guestId });
        } else {
            const next = attempt + 1;
            yield* scheduler.runAfter(
                next < BACKOFF_ATTEMPTS
                    ? Duration.minutes(Math.min(2 ** attempt, RETIRE_MAX_DELAY_MINUTES))
                    : STUCK_RETRY_DELAY,
                refs.internal.guests.retire,
                { attempt: next, guestId }
            );
            if (next === BACKOFF_ATTEMPTS) {
                yield* Console.error("[guests] retirement still failing, retrying daily", {
                    analytics,
                    customer,
                    guestId,
                });
                yield* capturePostHogEvent(
                    {
                        distinct_id: BACKEND_DISTINCT_ID,
                        event: "guest_retirement_stuck",
                        properties: { $process_person_profile: false, analytics, customer },
                    },
                    STUCK_CAPTURE_TIMEOUT
                ).pipe(
                    Effect.flatMap((response) =>
                        Option.isSome(response) && (response.value.status < 200 || response.value.status >= 300)
                            ? Console.error(`[guests] stuck event failed with HTTP ${response.value.status}`)
                            : Effect.void
                    ),
                    Effect.tapError((error) => Console.error("[guests] stuck event failed", error)),
                    Effect.ignore,
                    Effect.provide(outboundHttp)
                );
            }
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

// Every allowed guest sign-in schedules this, so only the job after the caller's last one finds the bucket refilled.
const forgetCaller = FunctionImpl.make(
    databaseSchema,
    spec,
    "forgetCaller",
    Effect.fn("Guests.forgetCaller")(function* forgetCaller({ key }) {
        const ctx = yield* MutationCtx;
        const { ts } = yield* Effect.promise(() => guestLimiter.getValue(ctx, "guestSignInPerCaller", { key }));
        const now = yield* Clock.currentTimeMillis;
        if (now - ts >= GUEST_BUCKET_REFILL_MS) {
            yield* Effect.promise(() => guestLimiter.reset(ctx, "guestSignInPerCaller", { key }));
        }
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(retire),
    Layer.provide(forget),
    Layer.provide(forgetCaller),
    GroupImpl.finalize
);
