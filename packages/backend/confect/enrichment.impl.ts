import { FunctionImpl, GroupImpl } from "@confect/server";
import { CANONICAL_CATEGORY_NAMES } from "@outlayr/money/contract";
import { knowledgeKeys } from "@outlayr/money/merchant-key";
import type { UserIdentity } from "convex/server";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Layer from "effect/Layer";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { ActionCtx, DatabaseReader, MutationRunner, QueryCtx, QueryRunner } from "./_generated/services";
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
    sanitizeDomain,
    sanitizeLocale,
    sanitizeMerchantName,
    sanitizeRegionCode,
} from "./enrichment";
import spec from "./enrichment.spec";
import { isForbiddenLogoOrigin } from "./groundedLookup";
import { openAiGateFor, withinLimit } from "./lib/aiGate";
import { liveIdentity, optionalUserId } from "./lib/auth";
import { claudeFastModelId } from "./lib/config";
import { outboundHttp } from "./lib/http";
import { CANONICAL_CATEGORIES, KEY_PATTERN } from "./lib/merchantTrust";
import { isPro } from "./revenuecat";

const MERCHANT_LOGOS_ORIGIN = "https://logos.tryoutlayr.com/merchants";
const LOGO_CHECK_TIMEOUT_MS = 6000;
const USER_SUBMITTED_MODEL_ID = "user";

const logoExists = (domain: string) =>
    HttpClient.execute(HttpClientRequest.head(`${MERCHANT_LOGOS_ORIGIN}/${encodeURIComponent(domain)}`)).pipe(
        Effect.timeout(LOGO_CHECK_TIMEOUT_MS),
        Effect.map((response) => response.status >= 200 && response.status < 300),
        Effect.orElseSucceed(() => false),
        Effect.provide(outboundHttp)
    );

const sharedCategory = Effect.fn("Enrichment.sharedCategory")(
    function* sharedCategory(
        args: {
            readonly aiConsent?: number | undefined;
            readonly categoryName: string | null;
            readonly income: boolean;
            readonly name: string;
            readonly shareAnalytics?: boolean | undefined;
        },
        currency: string | undefined,
        locale: string | undefined,
        caller: UserIdentity
    ) {
        if (args.categoryName !== null && CANONICAL_CATEGORIES.has(args.categoryName)) {
            return args.categoryName;
        }
        const ctx = yield* ActionCtx;
        const { model } = yield* openAiGateFor(caller, {
            admit: () => withinLimit(() => rateLimiter.limit(ctx, "enrichmentGlobal")),
            args,
            feature: "category_suggest",
            modelId: claudeFastModelId,
        });
        const classified = yield* runSuggest(model, {
            categoryTree: CANONICAL_CATEGORY_NAMES[args.income ? "income" : "expense"].map((name) => ({
                children: [],
                name,
            })),
            currency,
            income: args.income,
            locale,
            name: args.name,
        }).pipe(Effect.catchTags({ ModelCallError: () => Effect.succeed(null) }));
        const categoryName = classified?.categoryName ?? null;
        return categoryName !== null && CANONICAL_CATEGORIES.has(categoryName) ? categoryName : null;
    },
    Effect.catchTags({ AiRefused: () => Effect.succeed(null) })
);

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

const suggest = FunctionImpl.make(
    databaseSchema,
    spec,
    "suggest",
    Effect.fn("Enrichment.suggest")(
        function* suggest(args) {
            const identity = yield* liveIdentity(yield* ActionCtx);
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

            const ctx = yield* ActionCtx;
            const { distinctId, model } = yield* openAiGateFor(identity, {
                admit: Effect.fn("Enrichment.suggestRungs")(function* suggestRungs(caller: UserIdentity) {
                    yield* withinLimit(() =>
                        rateLimiter.limit(ctx, args.background ? "enrichmentBackground" : "enrichmentPerUser", {
                            key: caller.tokenIdentifier,
                        })
                    );
                    yield* withinLimit(() => rateLimiter.limit(ctx, "enrichmentGlobal"));
                }),
                args,
                feature: "category_suggest",
                modelId: claudeFastModelId,
            });

            const scheduleGrounded = args.groundedLookup
                ? isPro(ctx, identity.subject).pipe(
                      Effect.flatMap((pro) =>
                          pro
                              ? maybeScheduleGrounded(ctx, identity.tokenIdentifier, {
                                    currency,
                                    distinctId,
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

            const result = yield* runSuggest(model, {
                categoryTree: args.categoryTree,
                currency,
                income: args.income,
                locale,
                name: trimmedName,
                regionCode,
            }).pipe(
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
        },
        Effect.catchTags({ AiRefused: () => Effect.succeed(EMPTY) }),
        Effect.orDie
    )
);

const submitWebsite = FunctionImpl.make(
    databaseSchema,
    spec,
    "submitWebsite",
    Effect.fn("Enrichment.submitWebsite")(function* submitWebsite(args) {
        const ctx = yield* ActionCtx;
        const identity = yield* liveIdentity(ctx);
        const domain = sanitizeDomain(args.domain);
        const name = args.name.trim();
        if (
            identity === null ||
            domain === null ||
            isForbiddenLogoOrigin(domain) ||
            name.length < MIN_NAME_LENGTH ||
            name.length > MAX_NAME_LENGTH
        ) {
            return null;
        }
        const currency = sanitizeCurrencyCode(args.currency);
        const keys = knowledgeKeys(name, currency).filter((key) => KEY_PATTERN.test(key));
        if (keys.length === 0) {
            return null;
        }
        const allowed = yield* Effect.promise(() =>
            rateLimiter.limit(ctx, "merchantWebsitePerUser", { key: identity.tokenIdentifier })
        );
        if (!allowed.ok || !(yield* logoExists(domain))) {
            return null;
        }
        const categoryName = yield* sharedCategory(args, currency, sanitizeLocale(args.locale), identity);
        if (categoryName === null) {
            return null;
        }
        const { runMutation } = yield* MutationRunner;
        yield* runMutation(refs.internal.merchantKnowledge.record, {
            categoryName,
            domain,
            emoji: null,
            keys,
            merchantName: sanitizeMerchantName(name) ?? undefined,
            modelId: USER_SUBMITTED_MODEL_ID,
            parentCategoryName: null,
            resolvedAt: yield* Clock.currentTimeMillis,
            source: "user",
            tags: [],
        });
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(groundedConsent),
    Layer.provide(suggest),
    Layer.provide(submitWebsite),
    GroupImpl.finalize
);
