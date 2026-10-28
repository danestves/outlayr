import { DAY, HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { generateText, Output } from "ai";
import type { LanguageModel } from "ai";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { components, internal } from "../convex/_generated/api";
import type { ActionCtx, MutationCtx } from "../convex/_generated/server";
import type { Suggestion } from "./enrichment.spec";
import { PICKABLE_CURRENCY_CODES } from "./lib/currencies";
import { describeTree } from "./lib/ledgerPrompt";
import type { CategoryBranch } from "./lib/ledgerPrompt";
import { fixedBurst } from "./lib/limits";
import { knowledgeKey } from "./lib/merchantKey";
import { modelCallError, modelSchema } from "./lib/modelCall";
import { DOMAIN_PATTERN, MAX_DOMAIN_LENGTH, MAX_TAG_LENGTH, MAX_TAGS, PICTOGRAPHIC } from "./lib/sanitizeLimits";

export const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 64;
const MAX_CATEGORY_NAME_LENGTH = 40;
const MAX_KNOWN_CATEGORY_NAMES = 60;
/** The action's own budget under the client's 9s `Promise.race` abort. */
export const REQUEST_TIMEOUT_MS = 8000;

export const BACKGROUND_REQUEST_TIMEOUT_MS = 60_000;

export const GROUNDED_REQUEST_TIMEOUT_MS = 120_000;

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
const ModelOutput = Schema.Struct({
    /** Brand before domain measurably fixes the domain's spelling. */
    brand: Schema.optionalKey(Schema.NullOr(Schema.String)),
    categoryName: Schema.NullOr(Schema.String),
    domain: Schema.NullOr(Schema.String),
    /** Only `high` keeps the domain, so the prompt can demand a best guess. */
    domainConfidence: Schema.optionalKey(Schema.NullOr(Schema.Literals(DOMAIN_CONFIDENCE))),
    emoji: Schema.optionalKey(Schema.NullOr(Schema.String)),
    isNewCategory: Schema.Boolean,
    // Nullish: a missing optional field must not cost the category and tags.
    parentCategoryName: Schema.optionalKey(Schema.NullOr(Schema.String)),
    tags: Schema.Array(Schema.String),
});

const modelOutputSchema = modelSchema(ModelOutput);

/** Keyed by `identity.tokenIdentifier`, never a client argument; checked before the sharded global limit. */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
    enrichmentBackground: fixedBurst("enrichmentBackground", false),
    // `shards: 10` is load-bearing: one unsharded counter throws OCC conflicts.
    enrichmentGlobal: {
        kind: "fixed window",
        period: HOUR,
        rate: 2000,
        shards: 10,
    },
    enrichmentPerUser: fixedBurst("enrichment", false),
    enrichmentQueue: fixedBurst("enrichmentQueue", false),
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
export const runSuggest = Effect.fn("Enrichment.runSuggest")(function* runSuggest(
    model: LanguageModel,
    args: RunSuggestArgs
) {
    const tree = args.categoryTree.slice(0, MAX_KNOWN_CATEGORY_NAMES);

    const { output } = yield* Effect.tryPromise({
        catch: modelCallError,
        try: () =>
            generateText({
                abortSignal: AbortSignal.timeout(args.timeoutMs ?? REQUEST_TIMEOUT_MS),
                // The SDK's 2 default retries alone would outlast the client's 9s abort.
                maxRetries: 0,
                model,
                output: Output.object({ schema: modelOutputSchema }),
                prompt: buildPrompt(args.name, args.income, args.locale, args.regionCode, args.currency, tree),
                reasoning: "none",
            }),
    });

    const suggestion: Suggestion = {
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
    return suggestion;
});

export const GROUNDED_LOOKUP_META_KEY = "groundedLookup";

export interface GroundedScheduleArgs {
    currency?: string;
    groundedLookup: boolean;
    income: boolean;
    locale?: string;
    name: string;
    regionCode?: string;
}

/** `Pick` so a `convex-test` ctx fits without a widening cast. */
// The rate limiter takes a mutation or an action ctx and tells them apart by `meta`, so this stays a union.
export type GroundedScheduleCtx =
    | Pick<MutationCtx, "runQuery" | "runMutation" | "scheduler" | "meta">
    | Pick<ActionCtx, "runQuery" | "runMutation" | "runAction" | "scheduler" | "meta">;

export function needsGroundedLookup(result: Pick<Suggestion, "categoryName" | "domain">): boolean {
    return result.categoryName === null || result.domain === null;
}

/**
 * `groundedPerKey` read and `groundedPerUser` spent here; `categoryTree` is not a parameter, so scheduled args cannot
 * carry it.
 */
export const maybeScheduleGrounded = Effect.fn("Enrichment.maybeScheduleGrounded")(function* maybeScheduleGrounded(
    ctx: GroundedScheduleCtx,
    tokenIdentifier: string,
    args: GroundedScheduleArgs
): Effect.fn.Return<boolean> {
    if (!args.groundedLookup) {
        return false;
    }
    const consented = yield* Effect.promise(() => ctx.runQuery(internal.enrichment.groundedConsent, {}));
    if (!consented) {
        return false;
    }
    const key = knowledgeKey(args.name, args.currency);
    const fresh = yield* Effect.promise(() => rateLimiter.check(ctx, "groundedPerKey", { key }));
    if (!fresh.ok) {
        const spent = yield* Effect.promise(() => rateLimiter.getValue(ctx, "groundedPerKey", { key }));
        return (yield* Clock.currentTimeMillis) - spent.ts < GROUNDED_REQUEST_TIMEOUT_MS;
    }
    const gate = yield* Effect.promise(() =>
        rateLimiter.limit(ctx, "groundedPerUser", {
            key: tokenIdentifier,
        })
    );
    if (!gate.ok) {
        return false;
    }
    yield* Effect.promise(() =>
        ctx.scheduler.runAfter(0, internal.groundedLookup.run, {
            currency: args.currency,
            income: args.income,
            key,
            locale: args.locale,
            name: args.name,
            regionCode: args.regionCode,
        })
    );
    return true;
});
