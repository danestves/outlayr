import * as Effect from "effect/Effect";

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
    /** Commits whatever is pending; completes once written. */
    flush: Effect.Effect<void>;
    requestDelete: (id: string) => void;
    snapshot: DeferredDeleteSnapshot;
    undo: () => void;
}

export interface DeferredDeleteOptions<Handle> {
    commit: (id: string) => Effect.Effect<void, unknown>;
    launch: (write: Effect.Effect<void>) => void;
    onChange: (snapshot: DeferredDeleteSnapshot) => void;
    timers: DeferredDeleteTimers<Handle>;
    windowMs: number;
}

export function createDeferredDelete<Handle>({
    commit,
    launch,
    windowMs,
    timers,
    onChange,
}: DeferredDeleteOptions<Handle>): DeferredDeleteController {
    let pendingId: string | null = null;
    let failedId: string | null = null;
    let handle: Handle | null = null;

    const controller: DeferredDeleteController = {
        acknowledgeFailure,
        flush: Effect.suspend(flush),
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

    function write(id: string): Effect.Effect<void> {
        return commit(id).pipe(
            Effect.uninterruptible,
            Effect.catchCause(() =>
                Effect.sync(() => {
                    failedId = id;
                    publish();
                })
            )
        );
    }

    function requestDelete(id: string) {
        // One row hides at a time, so a delete still in its window commits now rather than being dropped.
        if (pendingId !== null && pendingId !== id) {
            launch(write(pendingId));
        }
        cancelTimer();
        pendingId = id;
        publish();
        handle = timers.set(() => {
            handle = null;
            pendingId = null;
            publish();
            launch(write(id));
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

    function flush(): Effect.Effect<void> {
        cancelTimer();
        if (pendingId === null) {
            return Effect.void;
        }
        const id = pendingId;
        pendingId = null;
        // No snapshot for the hide ending: the caller is tearing down. A rejected write still publishes.
        return write(id);
    }

    return controller;
}
