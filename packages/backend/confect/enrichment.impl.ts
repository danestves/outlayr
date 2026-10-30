import { createAnthropic } from "@ai-sdk/anthropic";
import { FunctionImpl, GroupImpl } from "@confect/server";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import { knowledgeKeys } from "@outlayr/money/merchant-key";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { ActionCtx, Auth, DatabaseReader, QueryCtx, QueryRunner } from "./_generated/services";
import {
    applyToTree,
    EMPTY,
    GROUNDED_LOOKUP_META_KEY,
    MAX_NAME_LENGTH,
    maybeScheduleGrounded,
    MIN_NAME_LENGTH,
    needsGroundedLookup,
    rateLimiter,
    runSuggest,
    sanitizeCurrencyCode,
    sanitizeLocale,
    sanitizeRegionCode,
} from "./enrichment";
import spec from "./enrichment.spec";
import { traced } from "./lib/aiTracing";
import { optionalUserId } from "./lib/auth";
import { anthropicApiKey, claudeFastModelId } from "./lib/config";
import { isPro } from "./revenuecat";

/**
 * Keyed by the Better Auth user id, as `sync.ts` writes it. An absent row means consented; a lost session answers
 * false.
 */
const groundedConsent = FunctionImpl.make(
    databaseSchema,
    spec,
    "groundedConsent",
    Effect.fn("Enrichment.groundedConsent")(function* groundedConsent() {
        const ctx = yield* QueryCtx;
        const userId = yield* optionalUserId(ctx);
        if (userId === null) {
            return false;
        }
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("appMeta")
            .get("by_user_and_key", userId, GROUNDED_LOOKUP_META_KEY)
            .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
        return row === null || row.value !== "false";
    }, Effect.orDie)
);

/** Read live so `npx convex env set ANTHROPIC_API_KEY=""` takes effect on the next call. */
const suggest = FunctionImpl.make(
    databaseSchema,
    spec,
    "suggest",
    Effect.fn("Enrichment.suggest")(function* suggest(args) {
        const auth = yield* Auth;
        const identity = yield* auth.getUserIdentity.pipe(
            Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
        );
        if (identity === null) {
            return EMPTY;
        }

        const trimmedName = args.name.trim();
        if (trimmedName.length < MIN_NAME_LENGTH || trimmedName.length > MAX_NAME_LENGTH) {
            return EMPTY;
        }

        const regionCode = sanitizeRegionCode(args.regionCode);
        const currency = sanitizeCurrencyCode(args.currency);
        const locale = sanitizeLocale(args.locale);

        const { runQuery } = yield* QueryRunner;
        // Tier 1.5 spends no rate limit and runs before the API key check, so a hit works without the key.
        const cached = yield* runQuery(refs.internal.merchantKnowledge.lookup, {
            keys: knowledgeKeys(trimmedName, currency),
            now: yield* Clock.currentTimeMillis,
        });
        if (cached !== null) {
            return {
                ...applyToTree(args.categoryTree, cached),
                grounding: false,
            };
        }

        if (args.knowledgeOnly === true) {
            return EMPTY;
        }

        const apiKey = yield* anthropicApiKey;
        if (Option.isNone(apiKey) || args.aiConsent !== AI_CONSENT_VERSION) {
            return EMPTY;
        }

        const ctx = yield* ActionCtx;
        const perUser = yield* Effect.promise(() =>
            rateLimiter.limit(ctx, args.background ? "enrichmentBackground" : "enrichmentPerUser", {
                key: identity.tokenIdentifier,
            })
        );
        if (!perUser.ok) {
            return EMPTY;
        }

        const global = yield* Effect.promise(() => rateLimiter.limit(ctx, "enrichmentGlobal"));
        if (!global.ok) {
            return EMPTY;
        }

        const scheduleGrounded = args.groundedLookup
            ? isPro(ctx, identity.subject).pipe(
                  Effect.flatMap((pro) =>
                      pro
                          ? maybeScheduleGrounded(ctx, identity.tokenIdentifier, {
                                currency,
                                distinctId: args.shareAnalytics === true ? identity.subject : undefined,
                                groundedLookup: args.groundedLookup,
                                income: args.income,
                                locale,
                                name: trimmedName,
                                regionCode,
                            })
                          : Effect.succeed(false)
                  )
              )
            : Effect.succeed(false);

        const modelId = yield* claudeFastModelId;
        const result = yield* runSuggest(
            traced(createAnthropic({ apiKey: Redacted.value(apiKey.value) })(modelId), "category_suggest", {
                distinctId: args.shareAnalytics === true ? identity.subject : undefined,
            }),
            {
                categoryTree: args.categoryTree,
                currency,
                income: args.income,
                locale,
                name: trimmedName,
                regionCode,
            }
        ).pipe(
            Effect.catchTags({
                ModelCallError: ({ cause }) =>
                    Console.warn(
                        `[enrichment] model call threw for "${trimmedName}":`,
                        cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)
                    ).pipe(Effect.as(null)),
            })
        );
        if (result === null) {
            // Not a thrown ConvexError: an ordinary timeout should not fill the logs with stack traces.
            return { ...EMPTY, grounding: yield* scheduleGrounded };
        }

        // Never awaited: it fills Tier 1.5 for the NEXT lookup.
        const scheduled = needsGroundedLookup(result) && (yield* scheduleGrounded);
        // `grounding: true` stops the client caching this as final.
        return scheduled ? { ...result, grounding: true } : result;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(groundedConsent),
    Layer.provide(suggest),
    GroupImpl.finalize
);
