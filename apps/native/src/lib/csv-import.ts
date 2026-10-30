import { merchantKey } from "@outlayr/money/merchant-key";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FiberHandle from "effect/FiberHandle";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SubscriptionRef from "effect/SubscriptionRef";

import { categoryKey } from "@/data/transfer-core";
import type { ParsedImportFile } from "@/data/transfer-core";
import { setCachedEnrichment } from "@/domain/enrichment-cache";
import { buildClassificationPayload, scrubLabel } from "@/domain/import-ai-payload";
import type { ResolutionOutcome, UnavailableReason } from "@/domain/import-flow";
import type { MappingDraft } from "@/domain/import-mapping";
import { cachedLabelEnrichment } from "@/domain/import-review-identity";
import { resolveMerchant } from "@/domain/merchant-resolver";
import { csvImportTransport } from "@/lib/cloud-ai";
import type { CsvImportFn, CsvImportRefusal, LabelSuggestion } from "@/lib/cloud-ai";
import type { CategoryBranch } from "@/lib/convex";
import { importDraftStore } from "@/lib/import-draft-store";
import type { ImportDraftStore } from "@/lib/import-draft-store";

export const AI_TIER_MAX_CHARS = 2_000_000;
export const AI_TIER_MAX_ROWS = 5000;
const CLIENT_TIMEOUT_MS = 15_000;

export class CsvImportError extends Schema.TaggedError<CsvImportError>()("CsvImportError", {
    cause: Schema.Defect(),
    message: Schema.String,
}) {}

export const CsvImportTransport = Context.Reference<CsvImportFn | null>("outlayr/lib/CsvImport/Transport", {
    defaultValue: () => csvImportTransport(),
});

export const CsvImportDraft = Context.Reference<ImportDraftStore>("outlayr/lib/CsvImport/Draft", {
    defaultValue: () => importDraftStore,
});

export interface ResolveRequest {
    aiEnrichment: boolean;
    categoryIdByKey: ReadonlyMap<string, string>;
    categoryTree: readonly CategoryBranch[];
    chars: number;
    draft: MappingDraft;
    groundedLookup: boolean;
    labels: readonly string[];
    parsed: ParsedImportFile;
    regionCode: string | undefined;
}

export type CsvImportStage = "idle" | "matching" | "asking" | "settled";

const REASON_BY_STATUS = {
    invalid: "providerError",
    invalidResponse: "invalidResponse",
    notConfigured: "notConfigured",
    notEntitled: "notEntitled",
    providerError: "providerError",
    rateLimited: "rateLimited",
    unauthenticated: "unauthenticated",
} satisfies Record<CsvImportRefusal, UnavailableReason>;

function settleWith(
    links: ReadonlyMap<string, string>,
    fromModel: ReadonlySet<string>,
    outcome: ResolutionOutcome,
    reason: UnavailableReason | null
) {
    return { fromModel, links, outcome, reason };
}

type Settlement = ReturnType<typeof settleWith>;

const NO_LINKS: ReadonlyMap<string, string> = new Map();
const NO_FROM_MODEL: ReadonlySet<string> = new Set();

export interface CsvImportState {
    fromModel: ReadonlySet<string>;
    links: ReadonlyMap<string, string>;
    outcome: ResolutionOutcome | null;
    parsed: ParsedImportFile | null;
    reason: UnavailableReason | null;
    stage: CsvImportStage;
    tier1Matched: number;
    tier2Sent: number;
}

type RunAction =
    | { type: "started" }
    | { type: "matched"; tier1Matched: number }
    | { type: "asking"; tier2Sent: number }
    | { type: "settled"; settlement: Settlement };

export function idleState(parsed: ParsedImportFile | null): CsvImportState {
    return {
        fromModel: NO_FROM_MODEL,
        links: NO_LINKS,
        outcome: null,
        parsed,
        reason: null,
        stage: "idle",
        tier1Matched: 0,
        tier2Sent: 0,
    };
}

export function reduce(state: CsvImportState, action: RunAction): CsvImportState {
    switch (action.type) {
        case "started": {
            return {
                ...state,
                outcome: null,
                reason: null,
                stage: "matching",
                tier2Sent: 0,
            };
        }
        case "matched": {
            return { ...state, tier1Matched: action.tier1Matched };
        }
        case "asking": {
            return { ...state, stage: "asking", tier2Sent: action.tier2Sent };
        }
        case "settled": {
            return { ...state, stage: "settled", ...action.settlement };
        }
        default: {
            const unhandled: never = action;
            throw new Error(`Unhandled csv import action: ${JSON.stringify(unhandled)}`);
        }
    }
}

interface MerchantLinkGaps {
    domainless: string[];
    unresolved: string[];
}

function linkKnownMerchants(
    labels: readonly string[],
    categoryIdByKey: ReadonlyMap<string, string>,
    links: Map<string, string>
): MerchantLinkGaps {
    const unresolved: string[] = [];

    const domainless: string[] = [];
    for (const label of labels) {
        const named = categoryIdByKey.get(categoryKey(label));
        if (named != null) {
            links.set(categoryKey(label), named);
            continue;
        }
        const match = resolveMerchant(label);
        const categoryId = match == null ? undefined : categoryIdByKey.get(categoryKey(match.categoryName));
        if (categoryId == null) {
            unresolved.push(label);
        } else {
            links.set(categoryKey(label), categoryId);
            if (match?.domain == null) {
                domainless.push(label);
            }
        }
    }
    return { domainless, unresolved };
}

function linkCachedLabels(
    labels: readonly string[],
    categoryIdByKey: ReadonlyMap<string, string>,
    links: Map<string, string>,
    fromModel: Set<string>
): string[] {
    const stillUnresolved: string[] = [];
    for (const label of labels) {
        const cached = cachedLabelEnrichment(label);
        const categoryName = cached.hit ? (cached.value?.categoryName ?? null) : null;
        const categoryId = categoryName == null ? undefined : categoryIdByKey.get(categoryKey(categoryName));
        if (cached.hit && categoryId != null) {
            links.set(categoryKey(label), categoryId);
            fromModel.add(categoryKey(label));
        } else {
            stillUnresolved.push(label);
        }
    }
    return stillUnresolved;
}

function groupByScrubbedLabel(labels: readonly string[]): ReadonlyMap<string, string[]> {
    const rawByScrubbed = new Map<string, string[]>();
    for (const label of labels) {
        const scrubbed = scrubLabel(label);
        const existing = rawByScrubbed.get(scrubbed);
        if (existing == null) {
            rawByScrubbed.set(scrubbed, [label]);
        } else {
            existing.push(label);
        }
    }
    return rawByScrubbed;
}

function linkSuggestions(
    suggestions: readonly LabelSuggestion[],
    categoryIdByKey: ReadonlyMap<string, string>,
    rawByScrubbed: ReadonlyMap<string, string[]>,
    links: Map<string, string>,
    fromModel: Set<string>
): void {
    for (const suggestion of suggestions) {
        if (suggestion.domain != null) {
            setCachedEnrichment(merchantKey(suggestion.label), {
                categoryName: suggestion.categoryName,
                domain: suggestion.domain,
                emoji: null,
                grounding: false,
                isNewCategory: false,
                merchantName: null,
                parentCategoryName: null,
                tags: [],
            });
        }
        const categoryId = categoryIdByKey.get(categoryKey(suggestion.categoryName));
        if (categoryId == null) {
            continue;
        }
        for (const raw of rawByScrubbed.get(suggestion.label) ?? []) {
            links.set(categoryKey(raw), categoryId);
            fromModel.add(categoryKey(raw));
        }
    }
}

const ask = (call: CsvImportFn, request: Parameters<CsvImportFn>[0]) =>
    call(request).pipe(
        Effect.mapError((cause) => new CsvImportError({ cause, message: "The CSV import model call failed" })),
        Effect.timeout(CLIENT_TIMEOUT_MS)
    );

const resolveImport = Effect.fn("CsvImport.resolve")(function* resolveImport(
    request: ResolveRequest,
    transport: CsvImportFn | null,
    send: (action: RunAction) => Effect.Effect<void>,
    resolvedLinks: Map<string, string>,
    fromModelSet: Set<string>
) {
    const allLabels = request.labels;

    const { domainless, unresolved } = linkKnownMerchants(allLabels, request.categoryIdByKey, resolvedLinks);
    yield* send({
        tier1Matched: allLabels.length - unresolved.length,
        type: "matched",
    });

    const stillUnresolved = linkCachedLabels(unresolved, request.categoryIdByKey, resolvedLinks, fromModelSet);
    const rawByScrubbed = groupByScrubbedLabel(stillUnresolved);

    const domainUnknown = domainless.filter((label) => {
        const cached = cachedLabelEnrichment(label);
        return !(cached.hit && cached.value?.domain != null);
    });

    const payload = buildClassificationPayload({
        categoryTree: request.categoryTree,
        draft: request.draft,
        parsed: request.parsed,
        unresolvedLabels: [...stillUnresolved, ...domainUnknown],
    });

    if (payload == null) {
        return settleWith(resolvedLinks, fromModelSet, "applied", null);
    }

    if (!request.aiEnrichment) {
        return settleWith(resolvedLinks, fromModelSet, "declined", null);
    }

    if (request.chars > AI_TIER_MAX_CHARS || request.parsed.rows.length > AI_TIER_MAX_ROWS) {
        return settleWith(resolvedLinks, fromModelSet, "unavailable", "overCap");
    }

    if (transport == null) {
        return settleWith(resolvedLinks, fromModelSet, "unavailable", "notConfigured");
    }

    yield* send({ tier2Sent: payload.labels.length, type: "asking" });
    const answer = yield* Effect.result(
        ask(transport, {
            ...payload,
            groundedLookup: request.groundedLookup,
            regionCode: request.regionCode,
        })
    );

    if (Result.isFailure(answer)) {
        return settleWith(
            resolvedLinks,
            fromModelSet,
            "unavailable",
            answer.failure._tag === "TimeoutError" ? "timeout" : "offline"
        );
    }

    const reply = answer.success;
    if (!reply.ok) {
        return settleWith(resolvedLinks, fromModelSet, "unavailable", REASON_BY_STATUS[reply.reason]);
    }

    linkSuggestions(reply.suggestions, request.categoryIdByKey, rawByScrubbed, resolvedLinks, fromModelSet);

    return settleWith(resolvedLinks, fromModelSet, "applied", null);
});

export class CsvImport extends Context.Service<
    CsvImport,
    {
        readonly run: (request: ResolveRequest) => Effect.Effect<void>;
        readonly retry: (request: ResolveRequest) => Effect.Effect<void>;
        readonly state: SubscriptionRef.SubscriptionRef<CsvImportState>;
    }
>()("outlayr/lib/CsvImport") {}

export const make = Effect.gen(function* make() {
    const transport = yield* CsvImportTransport;
    const drafts = yield* CsvImportDraft;
    const state = yield* SubscriptionRef.make(idleState(null));
    const runs = yield* FiberHandle.make();

    const send = (action: RunAction) => SubscriptionRef.update(state, (current) => reduce(current, action));

    const fileReplaced = (parsed: ParsedImportFile) =>
        Effect.callback<undefined>((resume) => {
            const check = () => {
                if (drafts.getSnapshot().flow.parsed !== parsed) {
                    unsubscribe();
                    resume(Effect.undefined);
                }
            };
            const unsubscribe = drafts.subscribe(check);
            check();
            return Effect.sync(unsubscribe);
        });

    const execute = Effect.fn("CsvImport.execute")(function* execute(request: ResolveRequest) {
        const links = new Map<string, string>();
        const fromModel = new Set<string>();
        const settlement = yield* resolveImport(request, transport, send, links, fromModel).pipe(
            Effect.catchDefect(() => Effect.succeed(settleWith(links, fromModel, "unavailable", "providerError")))
        );
        yield* Effect.sync(() => {
            drafts.dispatch({ ...settlement, type: "resolutionSettled" });
        });
        yield* send({ settlement, type: "settled" });
    });

    const start = Effect.fn("CsvImport.start")(function* start(request: ResolveRequest, again: boolean) {
        const current = yield* SubscriptionRef.get(state);
        const sameFile = current.parsed === request.parsed;
        const inFlight = sameFile && (current.stage === "matching" || current.stage === "asking");
        const settled = sameFile && current.stage === "settled";
        if (inFlight || (settled && !again)) {
            return;
        }
        yield* SubscriptionRef.set(state, reduce(sameFile ? current : idleState(request.parsed), { type: "started" }));
        yield* FiberHandle.run(runs, Effect.raceFirst(execute(request), fileReplaced(request.parsed)));
    });

    return CsvImport.of({
        retry: (request) => start(request, true),
        run: (request) => start(request, false),
        state,
    });
});

export const layer = Layer.effect(CsvImport, make);
