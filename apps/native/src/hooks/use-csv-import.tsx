import { useCallback, useReducer, useRef } from "react";

import { categoryKey } from "@/data/transfer-core";
import type { ParsedImportFile } from "@/data/transfer-core";
import { setCachedEnrichment } from "@/domain/enrichment-cache";
import { buildClassificationPayload, scrubLabel } from "@/domain/import-ai-payload";
import type { ResolutionOutcome, UnavailableReason } from "@/domain/import-flow";
import type { MappingDraft } from "@/domain/import-mapping";
import { cachedLabelEnrichment } from "@/domain/import-review-identity";
import { merchantKey, resolveMerchant } from "@/domain/merchant-resolver";
import { csvImportTransport } from "@/lib/convex";
import type {
    CategoryBranch,
    CsvImportFn,
    CsvImportRequest,
    CsvImportResult,
    CsvImportStatus,
    LabelSuggestion,
} from "@/lib/convex";
import { withTimeout } from "@/lib/with-timeout";

export const AI_TIER_MAX_CHARS = 2_000_000;
export const AI_TIER_MAX_ROWS = 5000;
const CLIENT_TIMEOUT_MS = 15_000;

export interface UseCsvImportArgs {
    aiEnrichment: boolean;
    categoryIdByKey: ReadonlyMap<string, string>;
    categoryTree: readonly CategoryBranch[];
    chars: number;
    draft: MappingDraft;
    /** A primitive: `parsed` is rebuilt every render in some call sites, so it cannot detect a file change. */
    fileKey: string | null;
    groundedLookup: boolean;
    labels: readonly string[];
    parsed: ParsedImportFile;
    regionCode: string | undefined;
    transport?: CsvImportFn | null;
}

export type CsvImportStage = "idle" | "matching" | "asking" | "settled";

export interface UseCsvImportResult {
    fromModel: ReadonlySet<string>;
    links: ReadonlyMap<string, string>;
    outcome: ResolutionOutcome | null;
    reason: UnavailableReason | null;
    run: () => void;
    running: boolean;
    stage: CsvImportStage;
    tier1Matched: number;
    tier2Sent: number;
    totalLabels: number;
}

const REASON_BY_STATUS = {
    invalid: "providerError",
    invalidResponse: "invalidResponse",
    notConfigured: "notConfigured",
    notEntitled: "notEntitled",
    providerError: "providerError",
    rateLimited: "rateLimited",
    unauthenticated: "unauthenticated",
} satisfies Record<Exclude<CsvImportStatus, "ok">, UnavailableReason>;

type Settled = { kind: "result"; result: CsvImportResult } | { kind: "timeout" } | { kind: "rejected" };

function settleWith(
    links: ReadonlyMap<string, string>,
    fromModel: ReadonlySet<string>,
    outcome: ResolutionOutcome,
    reason: UnavailableReason | null
) {
    return { fromModel, links, outcome, reason };
}

type Settlement = ReturnType<typeof settleWith>;

const TIMED_OUT = Symbol("csv-import-timeout");

const NO_LINKS: ReadonlyMap<string, string> = new Map();
const NO_FROM_MODEL: ReadonlySet<string> = new Set();

interface CsvImportState {
    fileKey: string | null;
    generation: number;
    fromModel: ReadonlySet<string>;
    links: ReadonlyMap<string, string>;
    outcome: ResolutionOutcome | null;
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

type CsvImportAction = { type: "fileChanged"; fileKey: string | null } | (RunAction & { generation: number });

function idleState(fileKey: string | null, generation = 0): CsvImportState {
    return {
        fileKey,
        generation,
        fromModel: NO_FROM_MODEL,
        links: NO_LINKS,
        outcome: null,
        reason: null,
        stage: "idle",
        tier1Matched: 0,
        tier2Sent: 0,
    };
}

function reduce(state: CsvImportState, action: CsvImportAction): CsvImportState {
    if (action.type === "fileChanged") {
        return idleState(action.fileKey, state.generation + 1);
    }
    if (action.generation !== state.generation) {
        return state;
    }
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

async function askModel(call: CsvImportFn, request: CsvImportRequest): Promise<Settled> {
    try {
        const raced = await withTimeout(call(request), CLIENT_TIMEOUT_MS, TIMED_OUT);
        return raced === TIMED_OUT ? { kind: "timeout" } : { kind: "result", result: raced };
    } catch {
        return { kind: "rejected" };
    }
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
                isNewCategory: false,
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

async function resolveImport(
    args: UseCsvImportArgs,
    send: (action: RunAction) => void,
    resolvedLinks: Map<string, string>,
    fromModelSet: Set<string>
): Promise<Settlement> {
    const allLabels = args.labels;

    const { domainless, unresolved } = linkKnownMerchants(allLabels, args.categoryIdByKey, resolvedLinks);
    send({
        tier1Matched: allLabels.length - unresolved.length,
        type: "matched",
    });

    const stillUnresolved = linkCachedLabels(unresolved, args.categoryIdByKey, resolvedLinks, fromModelSet);
    const rawByScrubbed = groupByScrubbedLabel(stillUnresolved);

    const domainUnknown = domainless.filter((label) => {
        const cached = cachedLabelEnrichment(label);
        return !(cached.hit && cached.value?.domain != null);
    });

    const payload = buildClassificationPayload({
        categoryTree: args.categoryTree,
        draft: args.draft,
        parsed: args.parsed,
        unresolvedLabels: [...stillUnresolved, ...domainUnknown],
    });

    if (payload == null) {
        return settleWith(resolvedLinks, fromModelSet, "applied", null);
    }

    if (!args.aiEnrichment) {
        return settleWith(resolvedLinks, fromModelSet, "declined", null);
    }

    if (args.chars > AI_TIER_MAX_CHARS || args.parsed.rows.length > AI_TIER_MAX_ROWS) {
        return settleWith(resolvedLinks, fromModelSet, "unavailable", "overCap");
    }

    const call = args.transport === undefined ? csvImportTransport() : args.transport;
    if (call == null) {
        return settleWith(resolvedLinks, fromModelSet, "unavailable", "notConfigured");
    }

    send({ tier2Sent: payload.labels.length, type: "asking" });
    const settled = await askModel(call, {
        ...payload,
        groundedLookup: args.groundedLookup,
        regionCode: args.regionCode,
    });

    if (settled.kind !== "result") {
        return settleWith(
            resolvedLinks,
            fromModelSet,
            "unavailable",
            settled.kind === "timeout" ? "timeout" : "offline"
        );
    }

    if (settled.result.status !== "ok") {
        return settleWith(resolvedLinks, fromModelSet, "unavailable", REASON_BY_STATUS[settled.result.status]);
    }

    linkSuggestions(settled.result.suggestions ?? [], args.categoryIdByKey, rawByScrubbed, resolvedLinks, fromModelSet);

    return settleWith(resolvedLinks, fromModelSet, "applied", null);
}

async function execute(args: UseCsvImportArgs, send: (action: RunAction) => void): Promise<void> {
    send({ type: "started" });
    const links = new Map<string, string>();
    const fromModel = new Set<string>();
    let settlement: Settlement;
    try {
        settlement = await resolveImport(args, send, links, fromModel);
    } catch {
        settlement = settleWith(links, fromModel, "unavailable", "providerError");
    }
    send({ settlement, type: "settled" });
}

export function useCsvImport(args: UseCsvImportArgs): UseCsvImportResult {
    const [state, dispatch] = useReducer(reduce, args.fileKey, idleState);
    const runningFor = useRef<number | null>(null);

    if (state.fileKey !== args.fileKey) {
        dispatch({ fileKey: args.fileKey, type: "fileChanged" });
    }

    const { generation } = state;
    const run = useCallback(() => {
        if (runningFor.current === generation) {
            return;
        }
        runningFor.current = generation;
        const send = (action: RunAction) => dispatch({ ...action, generation });
        // oxlint-disable-next-line no-void -- execute() settles its own failure into the reducer, and `run` is a synchronous press handler with nothing to await
        void execute(args, send).finally(() => {
            if (runningFor.current === generation) {
                runningFor.current = null;
            }
        });
    }, [args, generation]);

    return {
        fromModel: state.fromModel,
        links: state.links,
        outcome: state.outcome,
        reason: state.reason,
        run,
        running: state.stage === "matching" || state.stage === "asking",
        stage: state.stage,
        tier1Matched: state.tier1Matched,
        tier2Sent: state.tier2Sent,
        totalLabels: args.labels.length,
    };
}
