import { createAnthropic } from "@ai-sdk/anthropic";
import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { Auth, MutationCtx } from "./_generated/services";
import { traced } from "./lib/aiTracing";
import { admitCapture } from "./lib/captures";
import {
    CURRENCY_PATTERN,
    DATE_PATTERN,
    LANGUAGE_PATTERN,
    namesWithinBudget,
    REGION_PATTERN,
} from "./lib/ledgerPrompt";
import { AI_CONSENT_VERSION, CLAUDE_FAST_MODEL_ID } from "./lib/models";
import { admitScan, failure, looksLikeJpeg, MAX_IMAGE_BYTES, rateLimiter, readReceipt } from "./receiptScan";
import spec from "./receiptScan.spec";

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
        return yield* Effect.promise(() =>
            admitCapture(ctx, identity, () => rateLimiter.limit(ctx, "receiptScanGlobal"))
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
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || args.aiConsent !== AI_CONSENT_VERSION) {
            return failure("notConfigured");
        }

        if (
            args.image.byteLength === 0 ||
            args.image.byteLength > MAX_IMAGE_BYTES ||
            !looksLikeJpeg(args.image) ||
            !namesWithinBudget(args.categoryTree, args.accounts) ||
            !DATE_PATTERN.test(args.today) ||
            !CURRENCY_PATTERN.test(args.currency) ||
            (args.language !== undefined && !LANGUAGE_PATTERN.test(args.language)) ||
            (args.regionCode !== undefined && !REGION_PATTERN.test(args.regionCode))
        ) {
            return failure("invalid");
        }

        const admitted = yield* admitScan(identity);
        if (admitted !== "ok") {
            return failure(admitted);
        }

        const modelId = process.env.CLAUDE_FAST_MODEL_ID || CLAUDE_FAST_MODEL_ID;
        return yield* readReceipt(traced(createAnthropic({ apiKey })(modelId), "receipt_scan"), args.image, {
            accounts: args.accounts,
            categoryTree: args.categoryTree,
            currency: args.currency,
            language: args.language,
            regionCode: args.regionCode,
            today: args.today,
        });
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(admit), Layer.provide(scan), GroupImpl.finalize);
