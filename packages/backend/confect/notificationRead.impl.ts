import { FunctionImpl, GroupImpl } from "@confect/server";
import type { UserIdentity } from "convex/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { ActionCtx } from "./_generated/services";
import { sanitizeLocale } from "./enrichment";
import { openAiGate, refuse, withinLimit } from "./lib/aiGate";
import { claudeFastModelId } from "./lib/config";
import { fixedBurst } from "./lib/limits";
import { failure, MAX_TEXT_LENGTH, rateLimiter, readNotification } from "./notificationRead";
import spec from "./notificationRead.spec";

// Free, like the rest of auto-log: the device's monthly auto-log cap already bounds how many notifications land.
const read = FunctionImpl.make(
    databaseSchema,
    spec,
    "read",
    Effect.fn("NotificationRead.read")(
        function* read(args) {
            const ctx = yield* ActionCtx;
            const text = args.text.trim();
            const { model } = yield* openAiGate(ctx, {
                admit: Effect.fn("NotificationRead.readRungs")(function* readRungs(caller: UserIdentity) {
                    if (text.length === 0 || text.length > MAX_TEXT_LENGTH) {
                        return yield* refuse("invalid");
                    }
                    yield* withinLimit(() =>
                        rateLimiter.limit(ctx, "notificationReadPerUser", {
                            config: fixedBurst("notificationRead", false),
                            key: caller.tokenIdentifier,
                        })
                    );
                    yield* withinLimit(() => rateLimiter.limit(ctx, "notificationReadGlobal"));
                }),
                args,
                feature: "notification_read",
                modelId: claudeFastModelId,
            });
            return yield* readNotification(model, text, sanitizeLocale(args.language));
        },
        Effect.catchTags({ AiRefused: ({ status }) => Effect.succeed(failure(status)) }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(read), GroupImpl.finalize);
