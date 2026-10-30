import { useSyncExternalStore } from "react";

import type {
    MmAnalysis,
    MmArchiveError,
    MmBalanceCheck,
    MmChoices,
    MmImportRecord,
    MmSnapshot,
    OutlayrLedgerState,
} from "@/domain/money-manager/types";

import type { BackupSource } from "./money-manager-file";

export interface MoneyManagerDraft {
    analysis: MmAnalysis;
    choices: MmChoices;
    fileName: string;
    ledger: OutlayrLedgerState;
    source: BackupSource;
    snapshot: MmSnapshot;
}

export interface MoneyManagerResult {
    checks: readonly MmBalanceCheck[];
    record: MmImportRecord;
}

export interface MoneyManagerSession {
    draft: MoneyManagerDraft | null;
    /** The last write rolled back; nothing landed. */
    failed: boolean;
    /** The last file that could not be read, for the wrong-file screen. */
    failure: { error: MmArchiveError; fileName: string } | null;
    /** A backup handed over by "Open in" or the share sheet, waiting for a screen to read it. */
    pending: BackupSource | null;
    progress: { done: number; total: number } | null;
    result: MoneyManagerResult | null;
    /** A backup first run set aside until the ledger, where Pro can be bought. */
    resume: BackupSource | null;
}

const EMPTY: MoneyManagerSession = {
    draft: null,
    failed: false,
    failure: null,
    pending: null,
    progress: null,
    result: null,
    resume: null,
};

/**
 * Module state, not context: the flow spans pushed screens in two route groups, and the native intent that hands
 * over a backup runs outside React.
 */
function createSession() {
    let state = EMPTY;
    const listeners = new Set<() => void>();

    const commit = (next: MoneyManagerSession) => {
        state = next;
        for (const listener of listeners) {
            listener();
        }
    };

    return {
        begin: (draft: MoneyManagerDraft) => commit({ ...EMPTY, draft }),
        /** False when an import is already running or done: a second tap would write the backup twice. */
        claimApply: (total: number) => {
            if (state.progress !== null || state.result !== null) {
                return false;
            }
            commit({ ...state, failed: false, progress: { done: 0, total } });
            return true;
        },
        fail: (failure: NonNullable<MoneyManagerSession["failure"]>) => commit({ ...state, failure }),
        finish: (result: MoneyManagerResult) => commit({ ...state, progress: null, result }),
        getSnapshot: () => state,
        handOver: (pending: BackupSource) => commit({ ...state, pending }),
        markFailed: () => commit({ ...state, failed: true, progress: null }),
        /** Buying Pro needs an account, which first run only offers at its end, so the ledger reopens the backup. */
        resumeInLedger: (source: BackupSource) => commit({ ...state, resume: source }),
        reset: () => commit(EMPTY),
        setProgress: (progress: MoneyManagerSession["progress"]) => commit({ ...state, failed: false, progress }),
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        /** Moves a backup first run set aside into `pending`, where the open screen reads it. */
        takeResume: () => {
            const { resume } = state;
            if (resume !== null) {
                commit({ ...state, pending: resume, resume: null });
            }
            return resume !== null;
        },
        takePending: () => {
            const { pending } = state;
            if (pending !== null) {
                commit({ ...state, pending: null });
            }
            return pending;
        },
        updateChoices: (update: (choices: MmChoices) => MmChoices) => {
            if (state.draft === null) {
                return;
            }
            commit({ ...state, draft: { ...state.draft, choices: update(state.draft.choices) } });
        },
    };
}

export const moneyManagerSession = createSession();

export function useMoneyManagerSession(): MoneyManagerSession {
    return useSyncExternalStore(moneyManagerSession.subscribe, moneyManagerSession.getSnapshot);
}
