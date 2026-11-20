import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { generateObject } from "@outlayr/ai/generate";
import type { TextModel } from "@outlayr/ai/model";
import { merchantKey } from "@outlayr/money/merchant-key";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { components, internal } from "../convex/_generated/api";
import type { CsvImportResult, CsvImportStatus, LabelSuggestion } from "./csvImport.spec";
import { maybeScheduleGrounded } from "./enrichment";
import type { GroundedScheduleCtx } from "./enrichment";
import { CATEGORY_REUSE_TEST, placeCategory } from "./lib/categoryChoice";
import { describeTree } from "./lib/ledgerPrompt";
import type { CategoryBranch } from "./lib/ledgerPrompt";

export const MAX_LABELS = 200;
/** The action's own budget under the client's 15s hard `Promise.race` abort. */
const REQUEST_TIMEOUT_MS = 12_000;

export function failure(status: Exclude<CsvImportStatus, "ok">): CsvImportResult {
    return { status, suggestions: null };
}

/** Untrusted model output; this is only the JSON shape. */
const ModelOutput = Schema.Struct({
    mapping: Schema.Array(
        Schema.Struct({
            categoryName: Schema.NullOr(Schema.String),
            label: Schema.String,
        })
    ),
});

export interface RunClassifyArgs {
    categoryTree: readonly CategoryBranch[];
    labels: readonly string[];
}

function buildPrompt(args: RunClassifyArgs): string {
    return [
        "Classify each of these transaction labels into one of the user's existing categories.",
        `Labels: ${args.labels.join(", ")}.`,
        `The user's categories, with any nested under them, are: ${describeTree(args.categoryTree)}.`,
        "For each label, decide what kind of purchase it is, then respond with mapping entries of { label, categoryName }.",
        CATEGORY_REUSE_TEST,
        "When one fits, set categoryName to its name verbatim, without the parenthesised list. When none fits, set categoryName to null; never invent a new category name.",
    ].join(" ");
}

/** `shards: 10` is load-bearing: one unsharded counter throws OCC conflicts. */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
    csvImportGlobal: {
        kind: "fixed window",
        period: HOUR,
        rate: 200,
        shards: 10,
    },
});

/** Exported so tests can inject a fake `TextModel`. */
export const classify = Effect.fn("CsvImport.classify")(
    function* classify(model: TextModel, args: RunClassifyArgs) {
        const output = yield* generateObject(model, ModelOutput, {
            messages: [{ content: buildPrompt(args), role: "user" }],
            timeout: REQUEST_TIMEOUT_MS,
        });

        const suggestions: LabelSuggestion[] = [];
        for (const item of output.mapping) {
            const { categoryName, isNewCategory } = placeCategory(args.categoryTree, {
                categoryName: item.categoryName,
                parentCategoryName: null,
            });
            // An invented category is dropped, not trusted, without failing the rest.
            if (categoryName === null || isNewCategory) {
                continue;
            }
            suggestions.push({ categoryName, domain: null, label: item.label });
        }

        const result: CsvImportResult = { status: "ok", suggestions };
        return result;
    },
    Effect.catchTags({
        ModelCallError: ({ reason }) =>
            // Schema failure: the whole response is untrustworthy.
            Effect.succeed(failure(reason === "invalidResponse" ? "invalidResponse" : "providerError")),
    })
);

/** Half the `groundedPerUser` burst of 20; the rest degrade to a null domain. */
export const GROUNDED_IMPORT_MAX = 10;

export interface ImportGroundedArgs {
    distinctId?: string;
    groundedLookup: boolean;
    labels: readonly string[];
    regionCode?: string;
}

/** Fire-and-forget: fills `merchantKnowledge` for the NEXT import. `income: false`: the payload has no per-row data. */
export const scheduleImportGrounded = Effect.fn("CsvImport.scheduleImportGrounded")(function* scheduleImportGrounded(
    ctx: GroundedScheduleCtx,
    tokenIdentifier: string,
    args: ImportGroundedArgs
): Effect.fn.Return<number> {
    if (!args.groundedLookup) {
        return 0;
    }
    const consented = yield* Effect.promise(() => ctx.runQuery(internal.enrichment.groundedConsent, {}));
    if (!consented) {
        return 0;
    }
    const seen = new Set<string>();
    let attempts = 0;
    let scheduled = 0;
    for (const label of args.labels) {
        if (attempts >= GROUNDED_IMPORT_MAX) {
            break;
        }
        const key = merchantKey(label);
        if (key.length === 0 || seen.has(key)) {
            continue;
        }
        seen.add(key);
        attempts += 1;
        // maybeScheduleGrounded spends one token of the shared groundedPerUser rate limit per call; running them in
        // parallel races that counter and admits a different number of labels
        const ok = yield* maybeScheduleGrounded(ctx, tokenIdentifier, {
            distinctId: args.distinctId,
            groundedLookup: true,
            income: false,
            name: label,
            regionCode: args.regionCode,
        });
        if (ok) {
            scheduled += 1;
        }
    }
    return scheduled;
});
