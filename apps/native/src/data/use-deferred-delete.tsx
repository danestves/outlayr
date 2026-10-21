import type { ReactNode } from "react";
import { createContext, use, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { useLocalData } from "@/contexts/local-data-context";

import { createDeferredDeleteRegistry } from "./deferred-delete-registry";
import type { DeferredDeleteKind, DeferredDeleteRegistry } from "./deferred-delete-registry";

const DeferredDeleteContext = createContext<DeferredDeleteRegistry | null>(null);

/**
 * At the root because a held delete outlives its screen. The handle is passed down, not captured, so the write
 * lands in the database the app is on when the window closes.
 */
export function DeferredDeleteProvider({ children }: { children: ReactNode }) {
    const { db } = useLocalData();

    // A lazy initializer: building the registry during render is a side effect the compiler cannot follow.
    const [registry] = useState(createDeferredDeleteRegistry);

    useEffect(() => {
        registry.attachDatabase(db);
    }, [registry, db]);

    // A backgrounded app can be killed, losing an open window's write, so leaving the foreground flushes early.
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (phase) => {
            if (phase !== "active") {
                registry.flushAll();
            }
        });
        return () => subscription.remove();
    }, [registry]);

    return <DeferredDeleteContext.Provider value={registry}>{children}</DeferredDeleteContext.Provider>;
}

export interface DeferredDelete {
    pendingId: string | null;
    /** `body` is a translated toast line for a consequence the title cannot state. */
    requestDelete: (id: string, body?: string) => void;
}

/** The caller filters on `pendingId`; a second delete of the same kind flushes the first. */
export function useDeferredDelete(kind: DeferredDeleteKind): DeferredDelete {
    const registry = useRegistry();

    const pendingId = useSyncExternalStore(
        useCallback((listener: () => void) => registry.subscribe(kind, listener), [registry, kind]),
        useCallback(() => registry.pendingId(kind), [registry, kind])
    );

    const requestDelete = useCallback(
        (id: string, body?: string) => {
            registry.requestDelete(kind, id, body);
        },
        [registry, kind]
    );

    return { pendingId, requestDelete };
}

/** For a JS reload, which tears the runtime down without the AppState change that flushes. */
export function useFlushDeferredDeletes(): () => Promise<void> {
    return useRegistry().flushAll;
}

function useRegistry(): DeferredDeleteRegistry {
    const registry = use(DeferredDeleteContext);
    if (registry === null) {
        throw new Error("Deferred deletes must be used within DeferredDeleteProvider");
    }
    return registry;
}
