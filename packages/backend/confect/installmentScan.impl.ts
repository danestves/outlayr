import { createAnthropic } from "@ai-sdk/anthropic";
import { FunctionImpl, GroupImpl } from "@confect/server";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import databaseSchema from "./_generated/schema";
import { Auth } from "./_generated/services";
import { failure, readInstallmentPlan } from "./installmentScan";
import spec, { InstallmentScanInput } from "./installmentScan.spec";
import { traced } from "./lib/aiTracing";
import { anthropicApiKey, claudeModelId } from "./lib/config";
import { admitScan } from "./receiptScan";

const isInstallmentScanInput = Schema.is(InstallmentScanInput);

const scan = FunctionImpl.make(
    databaseSchema,
    spec,
    "scan",
    Effect.fn("InstallmentScan.scan")(function* scan(args) {
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

        if (!isInstallmentScanInput(args)) {
            return failure("invalid");
        }

        const admitted = yield* admitScan(identity);
        if (admitted !== "ok") {
            return failure(admitted);
        }

        const modelId = yield* claudeModelId;
        return yield* readInstallmentPlan(
            traced(createAnthropic({ apiKey: Redacted.value(apiKey.value) })(modelId), "installment_scan", {
                distinctId: args.shareAnalytics === true ? identity.subject : undefined,
            }),
            args.image,
            {
                accounts: args.accounts,
                currency: args.currency,
                language: args.language,
                regionCode: args.regionCode,
                today: args.today,
            }
        );
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(scan), GroupImpl.finalize);
