import { useAtomMount } from "@effect/atom-react/Hooks";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

import { localDataAtom, localDataState } from "@/contexts/local-data-context";
import { listen, WatchAppState } from "@/lib/app-events";
import { appRuntime } from "@/lib/runtime";
import { appAtomRegistry } from "@/state/atom-registry";
import { launchDeferredDeleteCommand } from "@/state/deferred-delete-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

import { commitDeferredDelete, createDeferredDeleteRegistry } from "./deferred-delete-registry";
import type { DeferredDeleteKind } from "./deferred-delete-registry";
import type { PendingDeletes } from "./pending-deletes";

// At module scope because a held delete outlives its screen; the database is read when its window closes.
const registry = createDeferredDeleteRegistry({
    commit: commitDeferredDelete,
    database: () => localDataState(appAtomRegistry.get(localDataAtom)).db,
    launch: (write) => fireAtomCommand(appAtomRegistry, launchDeferredDeleteCommand, write, {}),
});

// A backgrounded app can be killed, losing an open window's write, so leaving the foreground flushes early.
const flushOnLeaveAtom = appRuntime
    .atom(
        Effect.gen(function* flushOnLeave() {
            const watchAppState = yield* WatchAppState;
            yield* listen(watchAppState, (phase) => phase !== "active").pipe(
                Stream.runForEach(() => registry.flushAll)
            );
        })
    )
    .pipe(Atom.withLabel("deferred-delete:flush-on-leave"));

export function DeferredDeleteProvider({ children }: { children: ReactNode }) {
    useAtomMount(flushOnLeaveAtom);
    return children;
}

export interface DeferredDelete {
    pendingId: string | null;
    /** `body` is a translated toast line for a consequence the title cannot state. */
    requestDelete: (id: string, body?: string) => void;
}

/** The caller filters on `pendingId`; a second delete of the same kind flushes the first. */
export function useDeferredDelete(kind: DeferredDeleteKind): DeferredDelete {
    const pendingId = useSyncExternalStore(
        (listener: () => void) => registry.subscribe(kind, listener),
        () => registry.pendingId(kind)
    );

    const requestDelete = (id: string, body?: string) => {
        registry.requestDelete(kind, id, body);
    };

    return { pendingId, requestDelete };
}

/** For a JS reload, which tears the runtime down without the AppState change that flushes. An effect: yield it. */
export const flushDeferredDeletes = registry.flushAll;

export function usePendingDeletes(): PendingDeletes {
    const account = useDeferredDelete("account").pendingId;
    const category = useDeferredDelete("category").pendingId;
    const row = useDeferredDelete("row").pendingId;
    return { account, category, row };
}
