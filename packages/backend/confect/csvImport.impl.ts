import { createAnthropic } from "@ai-sdk/anthropic";
import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { ActionCtx, Auth, QueryRunner } from "./_generated/services";
import { classify, failure, MAX_LABELS, rateLimiter, scheduleImportGrounded } from "./csvImport";
import spec from "./csvImport.spec";
import type { LabelSuggestion } from "./csvImport.spec";
import { sanitizeRegionCode } from "./enrichment";
import { traced } from "./lib/aiTracing";
import { perUserBurst } from "./lib/limits";
import { knowledgeKeys } from "./lib/merchantKey";
import { AI_CONSENT_VERSION, CLAUDE_FAST_MODEL_ID } from "./lib/models";
import { isPro } from "./revenuecat";

/** Read live so `npx convex env set ANTHROPIC_API_KEY=""` takes effect on the next call. */
const csvImport = FunctionImpl.make(
    databaseSchema,
    spec,
    "csvImport",
    Effect.fn("CsvImport.csvImport")(function* csvImport(args) {
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

        if (args.labels.length === 0 || args.labels.length > MAX_LABELS) {
            return failure("invalid");
        }

        const ctx = yield* ActionCtx;
        if (!(yield* Effect.promise(() => isPro(ctx, identity.subject)))) {
            return failure("notEntitled");
        }

        const perUser = yield* Effect.promise(() =>
            rateLimiter.limit(ctx, "csvImportPerUser", {
                config: perUserBurst("csvImport", true),
                key: identity.tokenIdentifier,
            })
        );
        if (!perUser.ok) {
            return failure("rateLimited");
        }

        const global = yield* Effect.promise(() => rateLimiter.limit(ctx, "csvImportGlobal"));
        if (!global.ok) {
            return failure("rateLimited");
        }

        // After the rate limits, so the shared table cannot be probed faster than the model.
        const known: LabelSuggestion[] = [];
        const remaining: string[] = [];
        const { runQuery } = yield* QueryRunner;
        const looked = yield* runQuery(refs.internal.merchantKnowledge.lookupMany, {
            keyLists: args.labels.map((label) => knowledgeKeys(label, undefined)),
            now: yield* Clock.currentTimeMillis,
        });
        for (const [index, label] of args.labels.entries()) {
            const row = looked[index] ?? null;
            if (row === null) {
                remaining.push(label);
            } else {
                known.push({
                    categoryName: row.categoryName,
                    domain: row.domain,
                    label,
                });
            }
        }
        // Before the model call, so a provider failure still learns the unknown merchants.
        yield* scheduleImportGrounded(ctx, identity.tokenIdentifier, {
            groundedLookup: args.groundedLookup === true,
            labels: remaining,
            regionCode: sanitizeRegionCode(args.regionCode),
        });

        if (remaining.length === 0) {
            return { status: "ok" as const, suggestions: known };
        }

        const modelId = process.env.CLAUDE_FAST_MODEL_ID || CLAUDE_FAST_MODEL_ID;
        const classified = yield* classify(traced(createAnthropic({ apiKey })(modelId), "csv_import"), {
            categoryTree: args.categoryTree,
            labels: remaining,
        });
        if (classified.status !== "ok" || classified.suggestions === null) {
            if (known.length > 0) {
                return { degraded: true, status: "ok" as const, suggestions: known };
            }
            return classified;
        }
        return { status: "ok" as const, suggestions: [...known, ...classified.suggestions] };
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(csvImport), GroupImpl.finalize);
