import { createAnthropic } from "@ai-sdk/anthropic";
import { DAY, HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { generateText, Output } from "ai";
import type { LanguageModel } from "ai";
import { v } from "convex/values";
import { z } from "zod";

import { components, internal } from "./_generated/api";
import { action, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { optionalUserId } from "./lib/auth";
import { PICKABLE_CURRENCY_CODES } from "./lib/currencies";
import { describeTree } from "./lib/ledgerPrompt";
import type { CategoryBranch } from "./lib/ledgerPrompt";
import { perUserBurst } from "./lib/limits";
import { knowledgeKey, knowledgeKeys } from "./lib/merchantKey";
import { AI_CONSENT_VERSION, CLAUDE_FAST_MODEL_ID } from "./lib/models";
import { DOMAIN_PATTERN, MAX_DOMAIN_LENGTH, MAX_TAG_LENGTH, MAX_TAGS, PICTOGRAPHIC } from "./lib/sanitizeLimits";
import { isPro } from "./revenuecat";

const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 64;
const MAX_CATEGORY_NAME_LENGTH = 40;
const MAX_KNOWN_CATEGORY_NAMES = 60;
/** The action's own budget under the client's 9s `Promise.race` abort. */
export const REQUEST_TIMEOUT_MS = 8000;

export const BACKGROUND_REQUEST_TIMEOUT_MS = 60_000;

export const GROUNDED_REQUEST_TIMEOUT_MS = 120_000;

/** A privacy boundary: only the merchant name and the user's category names leave the device. */
export const suggestArgs = {
    /** `AI_CONSENT_VERSION`; anything else reads the shared merchant list but never reaches a provider. */
    aiConsent: v.optional(v.number()),
    background: v.optional(v.boolean()),
    categoryTree: v.array(v.object({ children: v.array(v.string()), name: v.string() })),
    /** A code, never an amount: it survives travel where `regionCode` would mislead. */
    currency: v.optional(v.string()),
    /** Dual-authority: a forged `true` needs the synced `appMeta` row to agree; `false` always blocks. */
    groundedLookup: v.boolean(),
    income: v.boolean(),
    knowledgeOnly: v.optional(v.boolean()),
    locale: v.optional(v.string()),
    name: v.string(),
    /** The device region, which `locale` cannot stand in for. */
    regionCode: v.optional(v.string()),
};

const suggestion = v.object({
    categoryName: v.union(v.string(), v.null()),
    domain: v.union(v.string(), v.null()),
    emoji: v.union(v.string(), v.null()),
    /** The client must not cache this as a final null result. */
    grounding: v.boolean(),
    isNewCategory: v.boolean(),
    merchantName: v.union(v.string(), v.null()),
    /** Set only when the suggestion belongs under an existing category. */
    parentCategoryName: v.union(v.string(), v.null()),
    tags: v.array(v.string()),
});

export interface Suggestion {
    categoryName: string | null;
    merchantName: string | null;
    domain: string | null;
    emoji: string | null;
    grounding: boolean;
    isNewCategory: boolean;
    parentCategoryName: string | null;
    tags: string[];
}

export const EMPTY: Suggestion = {
    categoryName: null,
    domain: null,
    emoji: null,
    grounding: false,
    isNewCategory: false,
    merchantName: null,
    parentCategoryName: null,
    tags: [],
};

const DOMAIN_CONFIDENCE = ["high", "medium", "low"] as const;

function domainAccepted(confidence: (typeof DOMAIN_CONFIDENCE)[number] | null | undefined): boolean {
    return confidence === "high";
}

/** Untrusted model output; this is only the JSON shape. */
const modelOutputSchema = z.object({
    /** Brand before domain measurably fixes the domain's spelling. */
    brand: z.string().nullish(),
    categoryName: z.string().nullable(),
    domain: z.string().nullable(),
    /** Only `high` keeps the domain, so the prompt can demand a best guess. */
    domainConfidence: z.enum(DOMAIN_CONFIDENCE).nullish(),
    emoji: z.string().nullish(),
    isNewCategory: z.boolean(),
    // Nullish: a missing optional field must not cost the category and tags.
    parentCategoryName: z.string().nullish(),
    tags: z.array(z.string()),
});

/** Keyed by `identity.tokenIdentifier`, never a client argument; checked before the sharded global limit. */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
    enrichmentBackground: perUserBurst("enrichmentBackground", false),
    // `shards: 10` is load-bearing: one unsharded counter throws OCC conflicts.
    enrichmentGlobal: {
        kind: "fixed window",
        period: HOUR,
        rate: 2000,
        shards: 10,
    },
    enrichmentPerUser: perUserBurst("enrichment", false),
    enrichmentQueue: perUserBurst("enrichmentQueue", false),
    // Consumed in `groundedLookup.run` and `enrichmentQueue.resolveJob`; `maybeScheduleGrounded` only reads it.
    groundedPerKey: {
        capacity: 1,
        kind: "token bucket",
        period: DAY,
        rate: 1,
    },
    // Anti-abuse, not cost control: `groundedBudgetMicros` is the backstop.
    groundedPerUser: {
        capacity: 20,
        kind: "token bucket",
        period: DAY,
        rate: 100,
    },
});

export function sanitizeTags(tags: readonly string[]): string[] {
    return tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .slice(0, MAX_TAGS)
        .map((tag) => tag.slice(0, MAX_TAG_LENGTH));
}

/** Only a bare `host.tld` reaches the logo fetcher. */
export function sanitizeDomain(domain: string | null): string | null {
    if (domain === null) {
        return null;
    }
    const trimmed = domain.trim().toLowerCase();
    if (trimmed.length === 0 || trimmed.length > MAX_DOMAIN_LENGTH) {
        return null;
    }
    // Grounded lookups return `www.` domains; logo.dev is apex-only.
    const apex = trimmed.startsWith("www.") ? trimmed.slice(4) : trimmed;
    return DOMAIN_PATTERN.test(apex) ? apex : null;
}

export function sanitizeMerchantName(name: string | null): string | null {
    const trimmed = name?.trim() ?? "";
    return trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH ? null : trimmed;
}

export function sanitizeCategoryName(name: string | null): string | null {
    if (name === null) {
        return null;
    }
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
        return null;
    }
    return trimmed;
}

const REGION_CODE_PATTERN = /^[A-Z]{2}$/;

/** Client-submitted: validated before it reaches a prompt. */
export function sanitizeRegionCode(region: string | undefined): string | undefined {
    if (region === undefined) {
        return;
    }
    const trimmed = region.trim().toUpperCase();
    return REGION_CODE_PATTERN.test(trimmed) ? trimmed : undefined;
}

const KNOWN_CURRENCIES: ReadonlySet<string> = new Set(PICKABLE_CURRENCY_CODES);

/** Client-submitted and it partitions the knowledge cache and per-key gate, so only pickable codes pass. */
export function sanitizeCurrencyCode(currency: string | undefined): string | undefined {
    if (currency === undefined) {
        return;
    }
    const trimmed = currency.trim().toUpperCase();
    return KNOWN_CURRENCIES.has(trimmed) ? trimmed : undefined;
}

export const DESCRIPTOR_LINE =
    'The name is usually a card-terminal or bank-statement descriptor rather than a clean brand name, so decode it first: a word before "*" is often a payment processor or terminal provider (SQ, TST, SP, PAYPAL, NYX, SUMUP, IZ, ZTL, PP, GOOGLE, APPLE.COM) rather than the merchant, unless that company is itself the seller; letters and digits after "*" are often a booking or reference code; a trailing legal-entity suffix (AE, ABEE, ABEET, EPE, IKE, SA, SAS, SL, SRL, SPA, GMBH, AG, LTD, LLC, INC, BV) is not part of the name; and the name may be truncated, abbreviated, run together without spaces, uppercase, or carry a city, airport, store number or country.';

/** Measured: a best guess kept only at `high` confidence beats "only if confident". */
export const DOMAIN_LINE =
    "Set brand to the clean display name of the business or place, written the way it writes its own name (for example Airbnb, Blue Bottle Coffee, Fontana di Trevi), or null. Set domain to the primary web domain of what you recognise — a chain, retailer, restaurant group, transit operator, utility, service or app, and equally a museum, landmark, attraction, venue, park or public body: the apex domain of its main site, never a subdomain. Write the domain exactly as that site's address is spelled, keeping hyphens, digits, dots and country suffixes; it is often not the name with spaces, accents and punctuation removed (for example coca-cola.com, hm.com, bahn.de). A landmark or public venue with no site of its own is reached through the official page its operator, city or tourism authority runs for it — name that site rather than null. Set domainConfidence to high when you recognise it, medium when it is a plausible match, low when you are guessing. Set domain to null only when the name identifies no specific business or place you know of (a person, a private note, an unknown local shop).";

/** Where the purchase happened outranks where the device is registered; the region only breaks ties. */
export function placeLines(regionCode: string | undefined, currency: string | undefined): string[] {
    return [
        currency ? `The purchase was charged in ${currency}, which indicates where the merchant operates.` : "",
        regionCode
            ? `The user's device region is ${regionCode}, but they may be travelling. If this name matches businesses in more than one country, prefer one operating in ${regionCode} unless the currency says otherwise; if no business operating in ${regionCode} matches, fall back to the best globally known match for this name.`
            : "",
    ];
}

function buildPrompt(
    name: string,
    income: boolean,
    locale: string | undefined,
    regionCode: string | undefined,
    currency: string | undefined,
    tree: readonly CategoryBranch[]
): string {
    const kind = income ? "income" : "expense";
    return [
        `Classify this ${kind} transaction merchant name: "${name}".`,
        DESCRIPTOR_LINE,
        `The user's categories, with any nested under them, are: ${describeTree(tree)}.`,
        "Reuse one of those names verbatim when it fits, and set parentCategoryName to null.",
        "Otherwise suggest a short new category name. If it clearly belongs beneath one of the user's existing top-level categories, set parentCategoryName to that name exactly; if it stands on its own, set parentCategoryName to null.",
        "Set emoji to a single emoji that suits the category, or null.",
        "Suggest at most 3 short tags.",
        DOMAIN_LINE,
        locale ? `The user's locale is ${locale}.` : "",
        ...placeLines(regionCode, currency),
    ]
        .filter((line) => line.length > 0)
        .join(" ");
}

export interface RunSuggestArgs {
    categoryTree: readonly CategoryBranch[];
    currency?: string;
    income: boolean;
    locale?: string;
    name: string;
    regionCode?: string;
    timeoutMs?: number;
}

/** A model asked for one emoji sometimes answers a sentence. */
export function sanitizeEmoji(emoji: string | null): string | null {
    if (emoji === null) {
        return null;
    }
    const trimmed = emoji.trim();
    if (trimmed.length === 0 || [...trimmed].length > 3) {
        return null;
    }
    return PICTOGRAPHIC.test(trimmed) ? trimmed : null;
}

export interface TreeCandidate {
    categoryName: string | null;
    merchantName?: string | null;
    domain: string | null;
    emoji: string | null;
    parentCategoryName: string | null;
    tags: readonly string[];
}

/** The same merchant can be new for one user and known for another. */
export function applyToTree(tree: readonly CategoryBranch[], candidate: TreeCandidate): Omit<Suggestion, "grounding"> {
    const cappedTree = tree.slice(0, MAX_KNOWN_CATEGORY_NAMES);
    const everyName = cappedTree.flatMap((branch) => [branch.name, ...branch.children]);

    const { categoryName } = candidate;
    const isNewCategory = categoryName !== null && !everyName.includes(categoryName);
    // A parent must be a top-level name actually sent: nothing upstream knows this ledger.
    const parentCategoryName =
        isNewCategory &&
        candidate.parentCategoryName !== null &&
        candidate.parentCategoryName !== categoryName &&
        cappedTree.some((branch) => branch.name === candidate.parentCategoryName)
            ? candidate.parentCategoryName
            : null;

    return {
        categoryName,
        domain: candidate.domain,
        emoji: candidate.emoji,
        isNewCategory,
        merchantName: candidate.merchantName ?? null,
        parentCategoryName,
        tags: [...candidate.tags],
    };
}

/** Exported so tests can inject a fake model. */
export async function runSuggest(model: LanguageModel, args: RunSuggestArgs): Promise<Suggestion> {
    const tree = args.categoryTree.slice(0, MAX_KNOWN_CATEGORY_NAMES);

    const { output } = await generateText({
        abortSignal: AbortSignal.timeout(args.timeoutMs ?? REQUEST_TIMEOUT_MS),
        // The SDK's 2 default retries alone would outlast the client's 9s abort.
        maxRetries: 0,
        model,
        output: Output.object({ schema: modelOutputSchema }),
        prompt: buildPrompt(args.name, args.income, args.locale, args.regionCode, args.currency, tree),
        reasoning: "none",
    });

    return {
        ...applyToTree(args.categoryTree, {
            categoryName: sanitizeCategoryName(output.categoryName),
            // A guessed domain is a wrong logo; only null lets the grounded tier take over.
            domain: domainAccepted(output.domainConfidence) ? sanitizeDomain(output.domain) : null,
            emoji: sanitizeEmoji(output.emoji ?? null),
            merchantName: sanitizeMerchantName(output.brand ?? null),
            parentCategoryName: sanitizeCategoryName(output.parentCategoryName ?? null),
            tags: sanitizeTags(output.tags),
        }),
        grounding: false,
    };
}

const GROUNDED_LOOKUP_META_KEY = "groundedLookup";

/**
 * Keyed by the Better Auth user id, as `sync.ts` writes it. An absent row means consented; a lost session answers
 * false.
 */
export const groundedConsent = internalQuery({
    args: {},
    handler: async (ctx) => {
        const userId = await optionalUserId(ctx);
        if (userId === null) {
            return false;
        }
        const row = await ctx.db
            .query("appMeta")
            .withIndex("by_user_and_key", (q) => q.eq("userId", userId).eq("key", GROUNDED_LOOKUP_META_KEY))
            .unique();
        return row === null || row.value !== "false";
    },
    returns: v.boolean(),
});

export interface GroundedScheduleArgs {
    currency?: string;
    groundedLookup: boolean;
    income: boolean;
    locale?: string;
    name: string;
    regionCode?: string;
}

/** `Pick` so a `convex-test` ctx fits without a widening cast. */
export type GroundedScheduleCtx = Pick<ActionCtx, "runQuery" | "runMutation" | "scheduler">;

export function needsGroundedLookup(result: Pick<Suggestion, "categoryName" | "domain">): boolean {
    return result.categoryName === null || result.domain === null;
}

/**
 * `groundedPerKey` read and `groundedPerUser` spent here; `categoryTree` is not a parameter, so scheduled args cannot
 * carry it.
 */
export async function maybeScheduleGrounded(
    ctx: GroundedScheduleCtx,
    tokenIdentifier: string,
    args: GroundedScheduleArgs
): Promise<boolean> {
    if (!args.groundedLookup) {
        return false;
    }
    const consented = await ctx.runQuery(internal.enrichment.groundedConsent, {});
    if (!consented) {
        return false;
    }
    const key = knowledgeKey(args.name, args.currency);
    const fresh = await rateLimiter.check(ctx, "groundedPerKey", { key });
    if (!fresh.ok) {
        const spent = await rateLimiter.getValue(ctx, "groundedPerKey", { key });
        return Date.now() - spent.ts < GROUNDED_REQUEST_TIMEOUT_MS;
    }
    const gate = await rateLimiter.limit(ctx, "groundedPerUser", {
        key: tokenIdentifier,
    });
    if (!gate.ok) {
        return false;
    }
    await ctx.scheduler.runAfter(0, internal.groundedLookup.run, {
        currency: args.currency,
        income: args.income,
        key,
        locale: args.locale,
        name: args.name,
        regionCode: args.regionCode,
    });
    return true;
}

/** Read live so `npx convex env set ANTHROPIC_API_KEY=""` takes effect on the next call. */
export const suggest = action({
    args: suggestArgs,
    handler: async (ctx, args): Promise<Suggestion> => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return EMPTY;
        }

        const trimmedName = args.name.trim();
        if (trimmedName.length < MIN_NAME_LENGTH || trimmedName.length > MAX_NAME_LENGTH) {
            return EMPTY;
        }

        const regionCode = sanitizeRegionCode(args.regionCode);
        const currency = sanitizeCurrencyCode(args.currency);

        // Tier 1.5 spends no rate limit and runs before the API key check, so a hit works without the key.
        const cached = await ctx.runQuery(internal.merchantKnowledge.lookup, {
            keys: knowledgeKeys(trimmedName, currency),
            now: Date.now(),
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

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || args.aiConsent !== AI_CONSENT_VERSION) {
            return EMPTY;
        }

        const perUser = await rateLimiter.limit(ctx, args.background ? "enrichmentBackground" : "enrichmentPerUser", {
            key: identity.tokenIdentifier,
        });
        if (!perUser.ok) {
            return EMPTY;
        }

        const global = await rateLimiter.limit(ctx, "enrichmentGlobal");
        if (!global.ok) {
            return EMPTY;
        }

        try {
            const modelId = process.env.CLAUDE_FAST_MODEL_ID || CLAUDE_FAST_MODEL_ID;
            const result = await runSuggest(createAnthropic({ apiKey })(modelId), {
                categoryTree: args.categoryTree,
                currency,
                income: args.income,
                locale: args.locale,
                name: trimmedName,
                regionCode,
            });

            // Never awaited: it fills Tier 1.5 for the NEXT lookup.
            if (needsGroundedLookup(result)) {
                const scheduled =
                    args.groundedLookup &&
                    (await isPro(ctx, identity.subject)) &&
                    (await maybeScheduleGrounded(ctx, identity.tokenIdentifier, {
                        currency,
                        groundedLookup: args.groundedLookup,
                        income: args.income,
                        locale: args.locale,
                        name: trimmedName,
                        regionCode,
                    }));
                // `grounding: true` stops the client caching this as final.
                if (scheduled) {
                    return { ...result, grounding: true };
                }
            }
            return result;
        } catch (error) {
            console.warn(
                `[enrichment] model call threw for "${trimmedName}":`,
                error instanceof Error ? `${error.name}: ${error.message}` : String(error)
            );
            const scheduled =
                args.groundedLookup &&
                (await isPro(ctx, identity.subject)) &&
                (await maybeScheduleGrounded(ctx, identity.tokenIdentifier, {
                    currency,
                    groundedLookup: args.groundedLookup,
                    income: args.income,
                    locale: args.locale,
                    name: trimmedName,
                    regionCode,
                }));
            // Not a thrown ConvexError: an ordinary timeout should not fill the logs with stack traces.
            return { ...EMPTY, grounding: scheduled };
        }
    },
    returns: suggestion,
});
