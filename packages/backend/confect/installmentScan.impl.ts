import { createAnthropic } from "@ai-sdk/anthropic";
import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { Auth } from "./_generated/services";
import { failure, readInstallmentPlan } from "./installmentScan";
import spec from "./installmentScan.spec";
import { traced } from "./lib/aiTracing";
import {
    CURRENCY_PATTERN,
    DATE_PATTERN,
    LANGUAGE_PATTERN,
    namesWithinBudget,
    REGION_PATTERN,
} from "./lib/ledgerPrompt";
import { AI_CONSENT_VERSION, CLAUDE_MODEL_ID } from "./lib/models";
import { admitScan, looksLikeJpeg, MAX_IMAGE_BYTES } from "./receiptScan";

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

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || args.aiConsent !== AI_CONSENT_VERSION) {
            return failure("notConfigured");
        }

        if (
            args.image.byteLength > MAX_IMAGE_BYTES ||
            !looksLikeJpeg(args.image) ||
            !namesWithinBudget([], args.accounts) ||
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

        const modelId = process.env.CLAUDE_MODEL_ID || CLAUDE_MODEL_ID;
        return yield* readInstallmentPlan(
            traced(createAnthropic({ apiKey })(modelId), "installment_scan"),
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
