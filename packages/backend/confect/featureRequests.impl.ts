import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { ActionCtx } from "./_generated/services";
import { captureSurveyEvent, rateLimiter, surveyEvent } from "./featureRequests";
import spec from "./featureRequests.spec";
import { authComponent } from "./lib/betterAuth";
import { outboundHttp } from "./lib/http";

const submit = FunctionImpl.make(
    databaseSchema,
    spec,
    "submit",
    Effect.fn("FeatureRequests.submit")(function* submit(args) {
        const ctx = yield* ActionCtx;
        const user = yield* Effect.promise(() => authComponent.safeGetAuthUser(ctx));
        const event = surveyEvent(args, user ? { email: user.email, userId: user._id } : null);
        if (event === null) {
            return "invalid" as const;
        }

        const caller = yield* Effect.promise(() =>
            user
                ? rateLimiter.limit(ctx, "featureRequestsPerUser", { key: user._id })
                : rateLimiter.limit(ctx, "featureRequestsAnonymous")
        );
        if (!caller.ok) {
            return "rateLimited" as const;
        }
        const global = yield* Effect.promise(() => rateLimiter.limit(ctx, "featureRequestsGlobal"));
        if (!global.ok) {
            return "rateLimited" as const;
        }

        return yield* captureSurveyEvent(event).pipe(Effect.provide(outboundHttp));
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(submit), GroupImpl.finalize);
