import { createAnthropic } from "@ai-sdk/anthropic";
import { FunctionImpl, GroupImpl } from "@confect/server";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import databaseSchema from "./_generated/schema";
import { ActionCtx, Auth } from "./_generated/services";
import { sanitizeLocale } from "./enrichment";
import { traced } from "./lib/aiTracing";
import { anthropicApiKey, claudeFastModelId } from "./lib/config";
import { fixedBurst } from "./lib/limits";
import { failure, MAX_TEXT_LENGTH, rateLimiter, readNotification } from "./notificationRead";
import spec from "./notificationRead.spec";

// Free, like the rest of auto-log: the device's monthly auto-log cap already bounds how many notifications land.
const read = FunctionImpl.make(
    databaseSchema,
    spec,
    "read",
    Effect.fn("NotificationRead.read")(function* read(args) {
        const auth = yield* Auth;
        const identity = yield* auth.getUserIdentity.pipe(
            Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
        );
        if (identity === null) {
            return failure("unauthenticated");
        }

        const apiKey = yield* anthropicApiKey;
        if (Option.isNone(apiKey) || args.aiConsent !== AI_CONSENT_VERSION) {
            return failure("notConfigured");
        }

        const text = args.text.trim();
        if (text.length === 0 || text.length > MAX_TEXT_LENGTH) {
            return failure("invalid");
        }

        const ctx = yield* ActionCtx;
        const perUser = yield* Effect.promise(() =>
            rateLimiter.limit(ctx, "notificationReadPerUser", {
                config: fixedBurst("notificationRead", false),
                key: identity.tokenIdentifier,
            })
        );
        if (!perUser.ok) {
            return failure("rateLimited");
        }
        const global = yield* Effect.promise(() => rateLimiter.limit(ctx, "notificationReadGlobal"));
        if (!global.ok) {
            return failure("rateLimited");
        }

        const modelId = yield* claudeFastModelId;
        return yield* readNotification(
            traced(createAnthropic({ apiKey: Redacted.value(apiKey.value) })(modelId), "notification_read", {
                distinctId: args.shareAnalytics === true ? identity.subject : undefined,
            }),
            text,
            sanitizeLocale(args.language)
        );
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(read), GroupImpl.finalize);
