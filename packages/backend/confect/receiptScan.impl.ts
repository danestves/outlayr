import { FunctionImpl, GroupImpl } from "@confect/server";
import type { UserIdentity } from "convex/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import databaseSchema from "./_generated/schema";
import { ActionCtx, MutationCtx } from "./_generated/services";
import { openAiGate, refuse } from "./lib/aiGate";
import { liveIdentity } from "./lib/auth";
import { admitCapture } from "./lib/captures";
import { claudeFastModelId } from "./lib/config";
import { admitScan, failure, rateLimiter, readReceipt } from "./receiptScan";
import spec, { ReceiptScanInput } from "./receiptScan.spec";

const isReceiptScanInput = Schema.is(ReceiptScanInput);

const admit = FunctionImpl.make(
    databaseSchema,
    spec,
    "admit",
    Effect.fn("ReceiptScan.admit")(function* admit() {
        const identity = yield* liveIdentity(yield* MutationCtx);
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
    Effect.fn("ReceiptScan.scan")(
        function* scan(args) {
            const ctx = yield* ActionCtx;
            const { model } = yield* openAiGate(ctx, {
                admit: Effect.fn("ReceiptScan.scanRungs")(function* scanRungs(caller: UserIdentity) {
                    if (!isReceiptScanInput(args)) {
                        return yield* refuse("invalid");
                    }
                    yield* admitScan(caller);
                }),
                args,
                feature: "receipt_scan",
                modelId: claudeFastModelId,
            });
            return yield* readReceipt(model, args.image, {
                accounts: args.accounts,
                categoryTree: args.categoryTree,
                currency: args.currency,
                language: args.language,
                regionCode: args.regionCode,
                today: args.today,
            });
        },
        Effect.catchTags({ AiRefused: ({ status }) => Effect.succeed(failure(status)) }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(admit), Layer.provide(scan), GroupImpl.finalize);
