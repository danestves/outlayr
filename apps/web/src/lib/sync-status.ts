import type { ConvexReactClient } from "convex/react";

type ConnectionState = ReturnType<ConvexReactClient["connectionState"]>;

export type SyncStatus = "failed" | "syncing" | "upToDate";

export interface SyncSnapshot {
    lastSyncedAt: number | null;
    peak: number;
    status: SyncStatus;
    waiting: number;
}

export const INITIAL_SYNC: SyncSnapshot = { lastSyncedAt: null, peak: 0, status: "syncing", waiting: 0 };

function statusOf(state: ConnectionState): SyncStatus {
    if (!state.isWebSocketConnected) {
        return state.hasEverConnected || state.connectionRetries > 0 ? "failed" : "syncing";
    }
    return state.hasInflightRequests ? "syncing" : "upToDate";
}

export function advanceSync(previous: SyncSnapshot, state: ConnectionState, now: number): SyncSnapshot {
    const status = statusOf(state);
    const waiting = state.inflightMutations;
    const stillSynced = status === "upToDate" || previous.status === "upToDate";
    return {
        lastSyncedAt: stillSynced ? now : previous.lastSyncedAt,
        peak: status === "upToDate" ? 0 : Math.max(previous.peak, waiting),
        status,
        waiting,
    };
}

let snapshot = INITIAL_SYNC;
const listeners = new Set<() => void>();

export const readSync = () => snapshot;

export function subscribeSync(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

const update = (state: ConnectionState) => {
    snapshot = advanceSync(snapshot, state, Date.now());
    for (const listener of listeners) {
        listener();
    }
};

export function watchSync(client: ConvexReactClient) {
    update(client.connectionState());
    return client.subscribeToConnectionState(update);
}
