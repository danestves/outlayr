interface DeferredDeleteTimers<Handle> {
    clear: (handle: Handle) => void;
    set: (run: () => void, ms: number) => Handle;
}

export interface DeferredDeleteSnapshot {
    /** A delete whose write rejected. Reported, or the row reappearing would look like a dropped swipe. */
    failedId: string | null;
    pendingId: string | null;
}

export interface DeferredDeleteController {
    acknowledgeFailure: () => void;
    /** Commits whatever is pending; settles once written. */
    flush: () => Promise<void>;
    requestDelete: (id: string) => void;
    snapshot: DeferredDeleteSnapshot;
    undo: () => void;
}

export interface DeferredDeleteOptions<Handle> {
    commit: (id: string) => Promise<void>;
    onChange: (snapshot: DeferredDeleteSnapshot) => void;
    timers: DeferredDeleteTimers<Handle>;
    windowMs: number;
}

export function createDeferredDelete<Handle>({
    commit,
    windowMs,
    timers,
    onChange,
}: DeferredDeleteOptions<Handle>): DeferredDeleteController {
    let pendingId: string | null = null;
    let failedId: string | null = null;
    let handle: Handle | null = null;

    const controller: DeferredDeleteController = {
        acknowledgeFailure,
        flush,
        requestDelete,
        snapshot: { failedId: null, pendingId: null },
        undo,
    };

    function publish() {
        controller.snapshot = { failedId, pendingId };
        onChange(controller.snapshot);
    }

    function cancelTimer() {
        if (handle !== null) {
            timers.clear(handle);
            handle = null;
        }
    }

    function write(id: string): Promise<void> {
        return commit(id).catch(() => {
            failedId = id;
            publish();
        });
    }

    function requestDelete(id: string) {
        // One row hides at a time, so a delete still in its window commits now rather than being dropped.
        if (pendingId !== null && pendingId !== id) {
            write(pendingId);
        }
        cancelTimer();
        pendingId = id;
        publish();
        handle = timers.set(() => {
            handle = null;
            pendingId = null;
            publish();
            write(id);
        }, windowMs);
    }

    function undo() {
        cancelTimer();
        pendingId = null;
        publish();
    }

    function acknowledgeFailure() {
        failedId = null;
        publish();
    }

    async function flush() {
        cancelTimer();
        if (pendingId === null) {
            return;
        }
        const id = pendingId;
        pendingId = null;
        // No snapshot for the hide ending: the caller is tearing down. A rejected write still publishes.
        await write(id);
    }

    return controller;
}
