import { describe, expect, it } from "@jest/globals";

import type { ParsedImportFile } from "@/data/transfer-core";

import { canAdvance, INITIAL_IMPORT_FLOW_STATE, importFlowReducer } from "./import-flow";
import type { ImportFlowEvent, ImportFlowState } from "./import-flow";
import type { ResolvedMapping } from "./import-mapping";
import type { ImportSourceId } from "./import-sources";

const OUT = [{ amount: -348.4, currencyCode: "EUR", transactionCount: 12 }];

const PARSED: ParsedImportFile = {
    header: ["date", "description", "amount"],
    rows: [["2026-07-28", "Bakery", "12.50"]],
    width: 3,
};

const DRAFT = {
    amount: 2,
    category: null,
    currency: null,
    date: 0,
    exchangeRate: null,
    exchangeRateType: null,
    note: 1,
    type: null,
};

const RESOLVED: ResolvedMapping = {
    labelSource: "descriptionColumn",
    mapping: {
        amount: 2,
        category: 1,
        currency: null,
        date: 0,
        exchangeRate: null,
        exchangeRateType: null,
        note: 1,
        type: null,
    },
};

function dispatch(state: ImportFlowState, event: ImportFlowEvent): ImportFlowState {
    return importFlowReducer(state, event);
}

function withSource(): ImportFlowState {
    return dispatch(INITIAL_IMPORT_FLOW_STATE, {
        sourceId: "csv",
        type: "sourceSelected",
    });
}

function withFile(): ImportFlowState {
    return dispatch(withSource(), {
        draft: DRAFT,
        file: { chars: 120, name: "bank.csv" },
        gaps: [],
        parsed: PARSED,
        resolved: RESOLVED,
        type: "fileParsed",
    });
}

function withResolution(): ImportFlowState {
    return dispatch(withFile(), {
        fromModel: new Set(["bakery"]),
        links: new Map([["bakery", "cat-food"]]),
        outcome: "applied",
        reason: null,
        type: "resolutionSettled",
    });
}

describe("importFlowReducer — legal transitions", () => {
    it("advances through file selection with the resolved mapping", () => {
        const state = withFile();
        expect(state.parsed).toBe(PARSED);
        expect(state.resolved).toBe(RESOLVED);
        expect(state.mappingGaps).toStrictEqual([]);
    });

    it("settles a resolution outcome after the file step", () => {
        expect(withResolution().resolution).toStrictEqual({
            fromModel: new Set(["bakery"]),
            links: new Map([["bakery", "cat-food"]]),
            outcome: "applied",
            reason: null,
        });
    });

    it("toggles a row index in and out of the excluded set", () => {
        const once = dispatch(withResolution(), { index: 3, type: "rowToggled" });
        expect(once.excluded.has(3)).toBe(true);
        const twice = dispatch(once, { index: 3, type: "rowToggled" });
        expect(twice.excluded.has(3)).toBe(false);
    });

    it("moves into the writing phase and then reports a failure with its detail", () => {
        const writing = dispatch(withResolution(), { type: "commitStarted" });
        expect(writing.commit).toStrictEqual({ phase: "writing" });
        const failed = dispatch(writing, {
            detail: "disk full",
            type: "commitFailed",
        });
        expect(failed.commit).toStrictEqual({
            detail: "disk full",
            phase: "failed",
        });
    });
});

describe("importFlowReducer — illegal transitions are no-ops", () => {
    it("ignores a file-parsed event with no source selected", () => {
        const event: ImportFlowEvent = {
            draft: DRAFT,
            file: { chars: 10, name: "bank.csv" },
            gaps: [],
            parsed: PARSED,
            resolved: RESOLVED,
            type: "fileParsed",
        };
        expect(dispatch(INITIAL_IMPORT_FLOW_STATE, event)).toBe(INITIAL_IMPORT_FLOW_STATE);
    });

    it("ignores a resolution settling with no resolved mapping yet", () => {
        const state = withSource();
        const event: ImportFlowEvent = {
            fromModel: new Set(),
            links: new Map(),
            outcome: "applied",
            reason: null,
            type: "resolutionSettled",
        };
        expect(dispatch(state, event)).toBe(state);
    });

    it("ignores a commit failure with no resolution yet", () => {
        const state = withFile();
        expect(dispatch(state, { detail: null, type: "commitFailed" })).toBe(state);
    });

    it("selecting the same source again changes nothing", () => {
        const state = withSource();
        expect(dispatch(state, { sourceId: "csv", type: "sourceSelected" })).toBe(state);
    });
});

describe("importFlowReducer — invalidation cascade", () => {
    it("selecting a different source clears everything downstream", () => {
        const populated = dispatch(dispatch(withResolution(), { index: 0, type: "rowToggled" }), {
            type: "commitStarted",
        });
        const otherId = "ofx" as unknown as ImportSourceId;
        const reset = dispatch(populated, {
            sourceId: otherId,
            type: "sourceSelected",
        });
        expect(reset).toStrictEqual({
            ...INITIAL_IMPORT_FLOW_STATE,
            sourceId: otherId,
        });
    });

    it("clears the prior resolution, exclusions and commit state on a new file", () => {
        const populated = dispatch(dispatch(withResolution(), { index: 0, type: "rowToggled" }), {
            type: "commitStarted",
        });
        const reparsed = dispatch(populated, {
            draft: DRAFT,
            file: { chars: 50, name: "other.csv" },
            gaps: [],
            parsed: PARSED,
            resolved: RESOLVED,
            type: "fileParsed",
        });
        expect(reparsed.resolution).toBeNull();
        expect(reparsed.excluded.size).toBe(0);
        expect(reparsed.commit).toStrictEqual({ phase: "idle" });
    });

    it("clears exclusions and commit state, but keeps the mapping, when a resolution re-settles", () => {
        const excludedAndWriting = dispatch(dispatch(withResolution(), { index: 0, type: "rowToggled" }), {
            type: "commitStarted",
        });
        const resettled = dispatch(excludedAndWriting, {
            fromModel: new Set(),
            links: new Map(),
            outcome: "unavailable",
            reason: "timeout",
            type: "resolutionSettled",
        });
        expect(resettled.excluded.size).toBe(0);
        expect(resettled.commit).toStrictEqual({ phase: "idle" });
        expect(resettled.resolved).toBe(RESOLVED);
    });

    it("preserves the excluded set when a commit fails", () => {
        const excluded = dispatch(withResolution(), {
            index: 2,
            type: "rowToggled",
        });
        const writing = dispatch(excluded, { type: "commitStarted" });
        const failed = dispatch(writing, {
            detail: "write error",
            type: "commitFailed",
        });
        expect(failed.excluded).toBe(excluded.excluded);
    });
});

describe("duplicatesFlagged", () => {
    it("flags the given indices and excludes them by default", () => {
        const state = withResolution();
        const flagged = dispatch(state, {
            indices: new Set([0, 2]),
            type: "duplicatesFlagged",
        });
        expect(flagged.duplicates).toStrictEqual(new Set([0, 2]));
        expect(flagged.excluded).toStrictEqual(new Set([0, 2]));
    });

    it("is a no-op with no settled resolution yet", () => {
        const state = withFile();
        const flagged = dispatch(state, {
            indices: new Set([0]),
            type: "duplicatesFlagged",
        });
        expect(flagged).toBe(state);
    });
});

describe("duplicates reset on invalidation", () => {
    it("clears duplicates alongside exclusions on a new file", () => {
        const flagged = dispatch(withResolution(), {
            indices: new Set([0]),
            type: "duplicatesFlagged",
        });
        const reparsed = dispatch(flagged, {
            draft: DRAFT,
            file: { chars: 50, name: "other.csv" },
            gaps: [],
            parsed: PARSED,
            resolved: RESOLVED,
            type: "fileParsed",
        });
        expect(reparsed.duplicates.size).toBe(0);
    });

    it("clears duplicates alongside exclusions when a resolution re-settles", () => {
        const flagged = dispatch(withResolution(), {
            indices: new Set([0]),
            type: "duplicatesFlagged",
        });
        const resettled = dispatch(flagged, {
            fromModel: new Set(),
            links: new Map(),
            outcome: "unavailable",
            reason: "timeout",
            type: "resolutionSettled",
        });
        expect(resettled.duplicates.size).toBe(0);
    });
});

describe("commitSucceeded", () => {
    it("captures the written count and out totals for the done step", () => {
        const writing = dispatch(withResolution(), { type: "commitStarted" });
        const done = dispatch(writing, {
            count: 12,
            duplicatesSkipped: 0,
            outTotals: OUT,
            type: "commitSucceeded",
        });
        expect(done.commit).toStrictEqual({
            count: 12,
            duplicatesSkipped: 0,
            outTotals: OUT,
            phase: "success",
        });
    });

    it("is a no-op with no settled resolution yet", () => {
        const state = withFile();
        const done = dispatch(state, {
            count: 1,
            duplicatesSkipped: 0,
            outTotals: OUT,
            type: "commitSucceeded",
        });
        expect(done).toBe(state);
    });
});

describe("canAdvance", () => {
    it("cannot advance past source with no source selected", () => {
        expect(canAdvance(INITIAL_IMPORT_FLOW_STATE, "source")).toBe(false);
    });

    it("can advance past source once one is selected", () => {
        expect(canAdvance(withSource(), "source")).toBe(true);
    });

    it("cannot advance past file with no resolved mapping", () => {
        expect(canAdvance(withSource(), "file")).toBe(false);
    });

    it("can advance past file once the mapping resolved", () => {
        expect(canAdvance(withFile(), "file")).toBe(true);
    });

    it("cannot advance past resolve with no settled resolution", () => {
        expect(canAdvance(withFile(), "resolve")).toBe(false);
    });

    it("can advance past resolve once it settles", () => {
        expect(canAdvance(withResolution(), "resolve")).toBe(true);
    });

    it("cannot advance past review before a commit succeeds", () => {
        expect(canAdvance(INITIAL_IMPORT_FLOW_STATE, "review")).toBe(false);
        expect(canAdvance(withResolution(), "review")).toBe(false);
    });

    it("can advance past review once a commit succeeded", () => {
        const writing = dispatch(withResolution(), { type: "commitStarted" });
        const done = dispatch(writing, {
            count: 2,
            duplicatesSkipped: 0,
            outTotals: OUT,
            type: "commitSucceeded",
        });
        expect(canAdvance(done, "review")).toBe(true);
    });

    it("never advances past done", () => {
        expect(canAdvance(withResolution(), "done")).toBe(false);
    });
});
