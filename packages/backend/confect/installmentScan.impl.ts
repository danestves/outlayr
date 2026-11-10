import { FunctionImpl, GroupImpl } from "@confect/server";
import type { UserIdentity } from "convex/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import databaseSchema from "./_generated/schema";
import { ActionCtx } from "./_generated/services";
import { failure, readInstallmentPlan } from "./installmentScan";
import spec, { InstallmentScanInput } from "./installmentScan.spec";
import { openAiGate, refuse } from "./lib/aiGate";
import { claudeModelId } from "./lib/config";
import { admitScan } from "./receiptScan";

const isInstallmentScanInput = Schema.is(InstallmentScanInput);

const scan = FunctionImpl.make(
    databaseSchema,
    spec,
    "scan",
    Effect.fn("InstallmentScan.scan")(
        function* scan(args) {
            const ctx = yield* ActionCtx;
            const { model } = yield* openAiGate(ctx, {
                admit: Effect.fn("InstallmentScan.scanRungs")(function* scanRungs(caller: UserIdentity) {
                    if (!isInstallmentScanInput(args)) {
                        return yield* refuse("invalid");
                    }
                    yield* admitScan(caller);
                }),
                args,
                feature: "installment_scan",
                modelId: claudeModelId,
            });
            return yield* readInstallmentPlan(model, args.image, {
                accounts: args.accounts,
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

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(scan), GroupImpl.finalize);
