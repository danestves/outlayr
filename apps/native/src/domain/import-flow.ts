import type { CurrencyBucket } from "@outlayr/money/currency-totals";

import type { CategoryOverride, ParsedImportFile } from "@/data/transfer-core";

import type { MappingDraft, MappingGap, ResolvedMapping } from "./import-mapping";
import type { ImportSourceId } from "./import-sources";

export type ImportStep = "source" | "file" | "resolve" | "review" | "done";
export type ResolutionOutcome = "applied" | "unavailable" | "declined";
export type UnavailableReason =
    | "offline"
    | "timeout"
    | "rateLimited"
    | "providerError"
    | "notConfigured"
    | "invalidResponse"
    | "overCap"
    | "unauthenticated"
    | "notEntitled";

interface ImportResolution {
    fromModel: ReadonlySet<string>;
    links: ReadonlyMap<string, string>;
    outcome: ResolutionOutcome;
    reason: UnavailableReason | null;
}

export type ImportCommitState =
    | { phase: "idle" }
    | { phase: "writing" }
    | { phase: "failed"; detail: string | null }
    | {
          phase: "success";
          count: number;
          outTotals: CurrencyBucket[];
          duplicatesSkipped: number;
      };

export interface ImportFlowState {
    categoryOverrides: ReadonlyMap<string, CategoryOverride>;
    commit: ImportCommitState;
    draft: MappingDraft | null;
    duplicates: ReadonlySet<number>;
    excluded: ReadonlySet<number>;
    file: { name: string; chars: number } | null;
    mappingGaps: readonly MappingGap[];
    parsed: ParsedImportFile | null;
    resolution: ImportResolution | null;
    resolved: ResolvedMapping | null;
    sourceId: ImportSourceId | null;
}

export const INITIAL_IMPORT_FLOW_STATE: ImportFlowState = {
    categoryOverrides: new Map(),
    commit: { phase: "idle" },
    draft: null,
    duplicates: new Set(),
    excluded: new Set(),
    file: null,
    mappingGaps: [],
    parsed: null,
    resolution: null,
    resolved: null,
    sourceId: null,
};

export type ImportFlowEvent =
    | { type: "sourceSelected"; sourceId: ImportSourceId }
    | {
          type: "fileParsed";
          file: { name: string; chars: number };
          parsed: ParsedImportFile;
          draft: MappingDraft;
          resolved: ResolvedMapping | null;
          gaps: readonly MappingGap[];
      }
    | {
          type: "resolutionSettled";
          outcome: ResolutionOutcome;
          reason: UnavailableReason | null;
          links: ReadonlyMap<string, string>;
          fromModel: ReadonlySet<string>;
      }
    | { type: "rowToggled"; index: number }
    | { type: "categoryOverridden"; plannedId: string; override: CategoryOverride | null }
    | { type: "duplicatesFlagged"; indices: ReadonlySet<number> }
    | { type: "commitStarted" }
    | { type: "commitFailed"; detail: string | null }
    | {
          type: "commitSucceeded";
          count: number;
          outTotals: CurrencyBucket[];
          duplicatesSkipped: number;
      };

export function importFlowReducer(state: ImportFlowState, event: ImportFlowEvent): ImportFlowState {
    switch (event.type) {
        case "sourceSelected": {
            if (state.sourceId === event.sourceId) {
                return state;
            }
            return { ...INITIAL_IMPORT_FLOW_STATE, sourceId: event.sourceId };
        }

        case "fileParsed": {
            if (state.sourceId == null) {
                return state;
            }
            return {
                ...state,
                categoryOverrides: new Map(),
                commit: { phase: "idle" },
                draft: event.draft,
                duplicates: new Set(),
                excluded: new Set(),
                file: event.file,
                mappingGaps: event.gaps,
                parsed: event.parsed,
                resolution: null,
                resolved: event.resolved,
            };
        }

        case "resolutionSettled": {
            if (state.resolved == null) {
                return state;
            }
            return {
                ...state,
                categoryOverrides: new Map(),
                commit: { phase: "idle" },
                duplicates: new Set(),
                excluded: new Set(),
                resolution: {
                    fromModel: event.fromModel,
                    links: event.links,
                    outcome: event.outcome,
                    reason: event.reason,
                },
            };
        }

        case "rowToggled": {
            if (state.resolution == null) {
                return state;
            }
            const excluded = new Set(state.excluded);
            if (excluded.has(event.index)) {
                excluded.delete(event.index);
            } else {
                excluded.add(event.index);
            }
            return { ...state, excluded };
        }

        case "categoryOverridden": {
            if (state.resolution == null) {
                return state;
            }
            const categoryOverrides = new Map(state.categoryOverrides);
            if (event.override == null) {
                categoryOverrides.delete(event.plannedId);
            } else {
                categoryOverrides.set(event.plannedId, event.override);
            }
            const wasLeftOut = state.categoryOverrides.get(event.plannedId)?.kind === "skip";
            const isLeftOut = event.override?.kind === "skip";
            if (wasLeftOut === isLeftOut) {
                return { ...state, categoryOverrides };
            }
            return { ...state, categoryOverrides, duplicates: new Set(), excluded: new Set() };
        }

        case "duplicatesFlagged": {
            if (state.resolution == null) {
                return state;
            }
            return {
                ...state,
                duplicates: event.indices,
                excluded: new Set(event.indices),
            };
        }

        case "commitStarted": {
            if (state.resolution == null) {
                return state;
            }
            return { ...state, commit: { phase: "writing" } };
        }

        case "commitFailed": {
            if (state.resolution == null) {
                return state;
            }
            return { ...state, commit: { detail: event.detail, phase: "failed" } };
        }

        case "commitSucceeded": {
            if (state.resolution == null) {
                return state;
            }
            return {
                ...state,
                commit: {
                    count: event.count,
                    duplicatesSkipped: event.duplicatesSkipped,
                    outTotals: event.outTotals,
                    phase: "success",
                },
            };
        }

        default: {
            return state;
        }
    }
}

export const IMPORT_STEPS = ["source", "file", "resolve", "review", "done"] as const;

export function canAdvance(state: ImportFlowState, step: ImportStep): boolean {
    switch (step) {
        case "source": {
            return state.sourceId != null;
        }
        case "file": {
            return state.resolved != null;
        }
        case "resolve": {
            return state.resolution != null;
        }
        case "review": {
            return state.commit.phase === "success";
        }
        default: {
            return false;
        }
    }
}
