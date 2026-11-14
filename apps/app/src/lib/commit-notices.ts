import type { PushRow } from "@outlayr/backend/confect/sync";

import type { LedgerCommit, LedgerCommitter } from "./ledger-committer";

export interface Notice {
    detail?: string;
    failed?: boolean;
    onExpire?: () => void;
    onUndo?: () => void;
    text: string;
}

export interface NoticeHost {
    holdMs: number;
    show: (notice: Notice) => () => void;
}

export interface CommitCopy {
    failed?: string;
    saved?: string;
}

export interface UndoCopy {
    after?: Promise<unknown>;
    detail?: string;
    failed: string;
    onUndone?: () => void;
    text: string;
}

export function noticedCommits(committer: Pick<LedgerCommitter, "commit">, host: NoticeHost) {
    const commit = async (rows: readonly PushRow[], copy: CommitCopy = {}) => {
        const { settled } = committer.commit(rows);
        if (copy.saved !== undefined) {
            host.show({ text: copy.saved });
        }
        const outcome = await settled;
        if (outcome.status === "failed" && copy.failed !== undefined) {
            host.show({ failed: true, text: copy.failed });
        }
        return outcome.status === "saved";
    };

    const commitWithUndo = (rows: readonly PushRow[], copy: UndoCopy): LedgerCommit => {
        const held = committer.commit(rows, { holdMs: host.holdMs });
        let over = false;
        let dismiss: (() => void) | undefined;
        const close = () => {
            over = true;
            dismiss?.();
        };
        const timer = setTimeout(close, host.holdMs);
        const leave = () => {
            clearTimeout(timer);
            close();
        };
        const flush = () => {
            leave();
            return held.flush();
        };
        const undo = () => {
            leave();
            const undone = held.undo();
            if (undone) {
                copy.onUndone?.();
            }
            return undone;
        };
        const offer = () => {
            if (!over) {
                dismiss = host.show({ detail: copy.detail, onExpire: flush, onUndo: undo, text: copy.text });
            }
        };
        void held.settled.then((outcome) => {
            leave();
            if (outcome.status === "failed") {
                host.show({ failed: true, text: copy.failed });
            }
        });
        if (copy.after) {
            void copy.after.then(offer, offer);
        } else {
            offer();
        }
        return { add: held.add, flush, settled: held.settled, undo };
    };

    return { commit, commitWithUndo };
}
