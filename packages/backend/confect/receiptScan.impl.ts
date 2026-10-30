import { createAnthropic } from "@ai-sdk/anthropic";
import { FunctionImpl, GroupImpl } from "@confect/server";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import databaseSchema from "./_generated/schema";
import { Auth, MutationCtx } from "./_generated/services";
import { traced } from "./lib/aiTracing";
import { admitCapture } from "./lib/captures";
import { anthropicApiKey, claudeFastModelId } from "./lib/config";
import { admitScan, failure, rateLimiter, readReceipt } from "./receiptScan";
import spec, { ReceiptScanInput } from "./receiptScan.spec";

const isReceiptScanInput = Schema.is(ReceiptScanInput);

const admit = FunctionImpl.make(
    databaseSchema,
    spec,
    "admit",
    Effect.fn("ReceiptScan.admit")(function* admit() {
        const auth = yield* Auth;
        const identity = yield* auth.getUserIdentity.pipe(
            Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
        );
        if (identity === null) {
            return "notEntitled" as const;
        }
        const ctx = yield* MutationCtx;
        return yield* admitCapture(
            ctx,
            identity,
            Effect.promise(() => rateLimiter.limit(ctx, "receiptScanGlobal"))
        );
    }, Effect.orDie)
);

const scan = FunctionImpl.make(
    databaseSchema,
    spec,
    "scan",
    Effect.fn("ReceiptScan.scan")(function* scan(args) {
        const auth = yield* Auth;
        const identity = yield* auth.getUserIdentity.pipe(
            Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
        );
        if (identity === null) {
            return failure("unauthenticated");
        }

        // Read per call, so clearing the key with `npx convex env set` takes effect on the next scan.
        const apiKey = yield* anthropicApiKey;
        if (Option.isNone(apiKey) || args.aiConsent !== AI_CONSENT_VERSION) {
            return failure("notConfigured");
        }

        if (!isReceiptScanInput(args)) {
            return failure("invalid");
        }

        const admitted = yield* admitScan(identity);
        if (admitted !== "ok") {
            return failure(admitted);
        }

        const modelId = yield* claudeFastModelId;
        return yield* readReceipt(
            traced(createAnthropic({ apiKey: Redacted.value(apiKey.value) })(modelId), "receipt_scan", {
                distinctId: args.shareAnalytics === true ? identity.subject : undefined,
            }),
            args.image,
            {
                accounts: args.accounts,
                categoryTree: args.categoryTree,
                currency: args.currency,
                language: args.language,
                regionCode: args.regionCode,
                today: args.today,
            }
        );
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(admit), Layer.provide(scan), GroupImpl.finalize);
