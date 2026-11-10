import { FunctionImpl, GroupImpl } from "@confect/server";
import { knowledgeKeys } from "@outlayr/money/merchant-key";
import type { UserIdentity } from "convex/server";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { ActionCtx, QueryRunner } from "./_generated/services";
import { classify, failure, MAX_LABELS, rateLimiter, scheduleImportGrounded } from "./csvImport";
import spec from "./csvImport.spec";
import type { LabelSuggestion } from "./csvImport.spec";
import { sanitizeRegionCode } from "./enrichment";
import { openAiGate, proOnly, refuse, withinLimit } from "./lib/aiGate";
import { claudeFastModelId } from "./lib/config";
import { perUserBurst } from "./lib/limits";

const csvImport = FunctionImpl.make(
    databaseSchema,
    spec,
    "csvImport",
    Effect.fn("CsvImport.csvImport")(
        function* csvImport(args) {
            const ctx = yield* ActionCtx;
            const { caller, distinctId, model } = yield* openAiGate(ctx, {
                admit: Effect.fn("CsvImport.csvImportRungs")(function* csvImportRungs(identity: UserIdentity) {
                    if (args.labels.length === 0 || args.labels.length > MAX_LABELS) {
                        return yield* refuse("invalid");
                    }
                    yield* proOnly(ctx, identity);
                    const config = yield* perUserBurst("csvImport", true);
                    yield* withinLimit(() =>
                        rateLimiter.limit(ctx, "csvImportPerUser", { config, key: identity.tokenIdentifier })
                    );
                    yield* withinLimit(() => rateLimiter.limit(ctx, "csvImportGlobal"));
                }),
                args,
                feature: "csv_import",
                modelId: claudeFastModelId,
            });

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
            yield* scheduleImportGrounded(ctx, caller.tokenIdentifier, {
                distinctId,
                groundedLookup: args.groundedLookup === true,
                labels: remaining,
                regionCode: sanitizeRegionCode(args.regionCode),
            });

            if (remaining.length === 0) {
                return { status: "ok" as const, suggestions: known };
            }

            const classified = yield* classify(model, { categoryTree: args.categoryTree, labels: remaining });
            if (classified.status !== "ok" || classified.suggestions === null) {
                if (known.length > 0) {
                    return { degraded: true, status: "ok" as const, suggestions: known };
                }
                return classified;
            }
            return { status: "ok" as const, suggestions: [...known, ...classified.suggestions] };
        },
        Effect.catchTags({ AiRefused: ({ status }) => Effect.succeed(failure(status)) }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(csvImport), GroupImpl.finalize);
