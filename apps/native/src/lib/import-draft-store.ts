import { useSyncExternalStore } from "react";

import { INITIAL_IMPORT_FLOW_STATE, importFlowReducer } from "@/domain/import-flow";
import type { ImportFlowEvent, ImportFlowState, ImportStep } from "@/domain/import-flow";
import type { TranslationKey } from "@/i18n/catalog";

export type FileStepError =
    | { cause: "io"; key: TranslationKey }
    | { cause: "tooLarge" }
    | { cause: "empty" }
    | { cause: "noDataRows" }
    | { cause: "tooFewColumns" };

interface ImportDraftUi {
    fileError: FileStepError | null;
    /** True only for the first render after a resumed reopen; cleared by any dispatch/setStep. */
    resumed: boolean;
    step: ImportStep;
}

export interface ImportDraftSnapshot {
    flow: ImportFlowState;
    ui: ImportDraftUi;
}

export interface ImportDraftStore {
    clear: () => void;
    commitDismissal: () => void;
    dispatch: (event: ImportFlowEvent) => void;
    getResumeStep: () => ImportStep;
    getSnapshot: () => ImportDraftSnapshot;
    setFileError: (error: FileStepError | null) => void;
    setStep: (step: ImportStep) => void;
    subscribe: (listener: () => void) => () => void;
}

const INITIAL_UI: ImportDraftUi = {
    fileError: null,
    resumed: false,
    step: "source",
};
const INITIAL_SNAPSHOT: ImportDraftSnapshot = {
    flow: INITIAL_IMPORT_FLOW_STATE,
    ui: INITIAL_UI,
};

export function isResumable(flow: ImportFlowState): boolean {
    return flow.parsed != null;
}

export function createImportDraftStore(): ImportDraftStore {
    let snapshot: ImportDraftSnapshot = INITIAL_SNAPSHOT;
    let resumeStep: ImportStep = "source";
    const listeners = new Set<() => void>();

    function commit(next: ImportDraftSnapshot) {
        snapshot = next;
        for (const listener of listeners) {
            listener();
        }
    }

    function commitResumeStep(next: ImportStep) {
        resumeStep = next;
    }

    function clear() {
        commit(INITIAL_SNAPSHOT);
        commitResumeStep("source");
    }

    function commitDismissal() {
        if (!isResumable(snapshot.flow)) {
            clear();
            return;
        }
        commitResumeStep(snapshot.ui.step);
        commit({ ...snapshot, ui: { ...snapshot.ui, resumed: true } });
    }

    return {
        clear,
        commitDismissal,
        dispatch(event) {
            const flow = importFlowReducer(snapshot.flow, event);
            if (flow !== snapshot.flow || snapshot.ui.resumed) {
                commit({ ...snapshot, flow, ui: { ...snapshot.ui, resumed: false } });
            }
        },
        getResumeStep() {
            return resumeStep;
        },
        getSnapshot() {
            return snapshot;
        },
        setFileError(error) {
            commit({ ...snapshot, ui: { ...snapshot.ui, fileError: error } });
        },
        setStep(step) {
            if (step === snapshot.ui.step) {
                return;
            }
            commit({ ...snapshot, ui: { ...snapshot.ui, resumed: false, step } });
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export const importDraftStore = createImportDraftStore();

export function useImportDraft(store: ImportDraftStore = importDraftStore): ImportDraftSnapshot {
    return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
